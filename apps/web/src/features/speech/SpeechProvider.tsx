"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, errorMessage } from "@/lib/api";
import type { SpeechLanguage } from "@/lib/api/client";
import { useI18n } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages/en";

/** Voice language matching each interface language. */
export const SPEECH_LANGUAGES: Record<Locale, SpeechLanguage> = {
  en: "en-IN",
  hi: "hi-IN",
  kn: "kn-IN",
};

/** Stored as a code or raw failure and worded at render time, so it follows a language switch. */
type SpeechProblem =
  { kind: keyof Messages["speech"]["errors"] } | { failure: unknown } | null;

const RECORDING_LIMIT_MS = 28_000;
const NO_SPEECH_LIMIT_MS = 8_000;
const SILENCE_AFTER_SPEECH_MS = 1_200;
const SPEECH_LEVEL_THRESHOLD = 0.018;

function useSpeechState() {
  const { locale, messages: m } = useI18n();
  // Follows the interface language until the person picks a voice language.
  const [chosenLanguage, setLanguage] = useState<SpeechLanguage | null>(null);
  const language = chosenLanguage ?? SPEECH_LANGUAGES[locale];
  const [recording, setRecording] = useState(false);
  const [working, setWorking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [problem, setProblem] = useState<SpeechProblem>(null);
  const [capabilities, setCapabilities] = useState({
    speech: false,
    profile_extraction: false,
  });
  const [checkingCapabilities, setCheckingCapabilities] = useState(true);
  const [transcribing, setTranscribing] = useState(false);
  const transcriptionRequest = useRef<AbortController | null>(null);
  const transcriptionRevision = useRef(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceFrame = useRef<number | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const heardSpeech = useRef(false);
  const receiveTranscript = useRef<(text: string) => void>(() => undefined);
  const player = useRef<HTMLAudioElement | null>(null);
  const audioUrl = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    void api
      .capabilities()
      .then((value) => {
        if (active) setCapabilities(value);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setCheckingCapabilities(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const cancelTranscription = useCallback(() => {
    transcriptionRevision.current++;
    transcriptionRequest.current?.abort();
    transcriptionRequest.current = null;
    setTranscribing(false);
    setWorking(false);
  }, []);

  const cleanupRecording = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (silenceFrame.current !== null) {
      cancelAnimationFrame(silenceFrame.current);
    }
    silenceFrame.current = null;
    if (audioContext.current) void audioContext.current.close();
    audioContext.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    recorder.current = null;
    setRecording(false);
  }, []);

  const stopRecording = useCallback(() => {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }, []);

  const startRecording = useCallback(
    async (onTranscript: (text: string) => void) => {
      setProblem(null);
      if (!capabilities.speech) {
        setProblem({ kind: "unavailable" });
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        setProblem({ kind: "unsupported" });
        return;
      }
      try {
        const microphone = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        stream.current = microphone;
        const preferred = [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/mp4",
        ].find((type) => MediaRecorder.isTypeSupported(type));
        const activeRecorder = new MediaRecorder(
          microphone,
          preferred ? { mimeType: preferred } : undefined,
        );
        recorder.current = activeRecorder;
        stream.current = microphone;
        chunks.current = [];
        heardSpeech.current = false;
        receiveTranscript.current = onTranscript;
        activeRecorder.ondataavailable = (event) => {
          if (event.data.size) chunks.current.push(event.data);
        };
        activeRecorder.onerror = () => {
          activeRecorder.onstop = null;
          setProblem({ kind: "recordingFailed" });
          cleanupRecording();
        };
        activeRecorder.onstop = () => {
          const audio = new Blob(chunks.current, {
            type: activeRecorder.mimeType || "audio/webm",
          });
          const containsSpeech = heardSpeech.current;
          cleanupRecording();
          if (!containsSpeech) {
            setProblem({ kind: "noSpeech" });
            return;
          }
          setWorking(true);
          setTranscribing(true);
          const request = new AbortController();
          transcriptionRequest.current = request;
          const revision = ++transcriptionRevision.current;
          void api
            .transcribe(audio, language, request.signal)
            .then((result) => {
              if (revision === transcriptionRevision.current)
                receiveTranscript.current(result.transcript);
            })
            .catch((reason: unknown) => {
              if (
                !request.signal.aborted &&
                revision === transcriptionRevision.current
              )
                setProblem({ failure: reason });
            })
            .finally(() => {
              if (revision === transcriptionRevision.current) {
                transcriptionRequest.current = null;
                setWorking(false);
                setTranscribing(false);
              }
            });
        };
        activeRecorder.start(250);
        setRecording(true);

        try {
          const context = new AudioContext();
          const source = context.createMediaStreamSource(microphone);
          const analyser = context.createAnalyser();
          const samples = new Uint8Array(analyser.fftSize);
          const startedAt = performance.now();
          let lastSpeechAt = startedAt;

          analyser.fftSize = 2_048;
          source.connect(analyser);
          audioContext.current = context;
          if (context.state === "suspended") await context.resume();

          const detectSilence = () => {
            if (activeRecorder.state !== "recording") return;

            analyser.getByteTimeDomainData(samples);
            let sumOfSquares = 0;
            for (const sample of samples) {
              const amplitude = (sample - 128) / 128;
              sumOfSquares += amplitude * amplitude;
            }
            const level = Math.sqrt(sumOfSquares / samples.length);
            const now = performance.now();

            if (level >= SPEECH_LEVEL_THRESHOLD) {
              heardSpeech.current = true;
              lastSpeechAt = now;
            }

            const finishedSpeaking =
              heardSpeech.current &&
              now - lastSpeechAt >= SILENCE_AFTER_SPEECH_MS;
            const noSpeechDetected =
              !heardSpeech.current && now - startedAt >= NO_SPEECH_LIMIT_MS;

            if (finishedSpeaking || noSpeechDetected) {
              activeRecorder.stop();
              return;
            }
            silenceFrame.current = requestAnimationFrame(detectSilence);
          };

          silenceFrame.current = requestAnimationFrame(detectSilence);
        } catch {
          // Recording still stops at the maximum duration when Web Audio is unavailable.
          // Let the speech service validate the recording if local VAD is unavailable.
          heardSpeech.current = true;
        }
        timer.current = setTimeout(() => {
          if (activeRecorder.state === "recording") activeRecorder.stop();
        }, RECORDING_LIMIT_MS);
      } catch {
        cleanupRecording();
        setProblem({ kind: "microphone" });
      }
    },
    [capabilities.speech, cleanupRecording, language],
  );

  const stopSpeaking = useCallback(() => {
    player.current?.pause();
    player.current = null;
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = null;
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string, sourceLanguage: SpeechLanguage = "en-IN") => {
      setProblem(null);
      if (!capabilities.speech) {
        setProblem({ kind: "unavailable" });
        return;
      }
      stopSpeaking();
      setWorking(true);
      try {
        const audio = await api.synthesize(
          text.slice(0, 2000),
          language,
          sourceLanguage,
        );
        const url = URL.createObjectURL(audio);
        const nextPlayer = new Audio(url);
        audioUrl.current = url;
        player.current = nextPlayer;
        nextPlayer.onended = stopSpeaking;
        nextPlayer.onerror = () => {
          setProblem({ kind: "playback" });
          stopSpeaking();
        };
        setSpeaking(true);
        await nextPlayer.play();
      } catch (reason) {
        stopSpeaking();
        setProblem({ failure: reason });
      } finally {
        setWorking(false);
      }
    },
    [capabilities.speech, language, stopSpeaking],
  );

  useEffect(
    () => () => {
      transcriptionRevision.current++;
      transcriptionRequest.current?.abort();
      if (recorder.current) recorder.current.onstop = null;
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
      player.current?.pause();
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    },
    [],
  );

  return {
    language,
    available: capabilities.speech,
    profileExtractionAvailable: capabilities.profile_extraction,
    checkingCapabilities,
    transcribing,
    cancelTranscription,
    setLanguage,
    recording,
    working,
    speaking,
    error:
      problem === null
        ? ""
        : "kind" in problem
          ? m.speech.errors[problem.kind]
          : errorMessage(problem.failure, m.errors),
    clearError: () => setProblem(null),
    startRecording,
    stopRecording,
    speak,
    stopSpeaking,
  };
}

const SpeechContext = createContext<ReturnType<typeof useSpeechState> | null>(
  null,
);

export function SpeechProvider({ children }: { children: ReactNode }) {
  const value = useSpeechState();
  return (
    <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>
  );
}

export function useSpeech() {
  const value = useContext(SpeechContext);
  if (!value) throw new Error("Speech provider is missing");
  return value;
}
