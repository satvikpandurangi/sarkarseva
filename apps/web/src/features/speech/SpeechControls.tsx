"use client";

import { Mic, Volume2, VolumeX } from "lucide-react";
import { Button, InlineAlert } from "@/components/ui";
import { useMessages } from "@/i18n/client";
import { LOCALE_NAMES, LOCALES } from "@/i18n/config";
import { SPEECH_LANGUAGES, useSpeech } from "./SpeechProvider";

/** Same languages as the interface, each named in its own script. */
const speechLanguages = LOCALES.map((locale) => ({
  code: SPEECH_LANGUAGES[locale],
  label: LOCALE_NAMES[locale],
}));

export function SpeechInputControls({
  onTranscript,
}: {
  onTranscript: (text: string) => void;
}) {
  const speech = useSpeech();
  const t = useMessages().speech;
  return (
    <div className="speech-controls">
      <label className="speech-language">
        <span>{t.voiceLanguage}</span>
        <select
          className="input"
          value={speech.language}
          onChange={(event) =>
            speech.setLanguage(event.target.value as typeof speech.language)
          }
          disabled={speech.recording || speech.working}
        >
          {speechLanguages.map((language) => (
            <option key={language.code} value={language.code}>
              {language.label}
            </option>
          ))}
        </select>
      </label>
      <Button
        type="button"
        variant={speech.recording ? "secondary" : "quiet"}
        busy={speech.transcribing}
        disabled={speech.working || !speech.available}
        onClick={() =>
          speech.recording
            ? speech.stopRecording()
            : void speech.startRecording(onTranscript)
        }
        aria-pressed={speech.recording}
      >
        <Mic size={16} />
        {speech.recording
          ? t.stopRecording
          : speech.transcribing
            ? t.transcribing
            : t.speak}
      </Button>
      {speech.transcribing && (
        <Button
          type="button"
          variant="secondary"
          onClick={speech.cancelTranscription}
        >
          {t.cancel}
        </Button>
      )}
      <span className="small muted" aria-live="polite">
        {speech.checkingCapabilities
          ? t.checking
          : !speech.available
            ? t.errors.unavailable
            : speech.recording
              ? t.listeningHint
              : t.privacyNote}
      </span>
      {speech.error && <InlineAlert error>{speech.error}</InlineAlert>}
    </div>
  );
}

export function ReadAloudButton({ text }: { text: string }) {
  const speech = useSpeech();
  const t = useMessages().speech;
  return (
    <div className="read-aloud">
      <label className="speech-language compact">
        <span>{t.audioLanguage}</span>
        <select
          className="input"
          value={speech.language}
          onChange={(event) =>
            speech.setLanguage(event.target.value as typeof speech.language)
          }
          disabled={speech.working || speech.speaking}
        >
          {speechLanguages.map((language) => (
            <option key={language.code} value={language.code}>
              {language.label}
            </option>
          ))}
        </select>
      </label>
      <Button
        type="button"
        variant="quiet"
        busy={speech.working && !speech.speaking}
        disabled={
          !speech.available ||
          !text.trim() ||
          (speech.working && !speech.speaking)
        }
        onClick={() =>
          speech.speaking ? speech.stopSpeaking() : void speech.speak(text)
        }
      >
        {speech.speaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
        {speech.speaking ? t.stopAudio : t.readAloud}
      </Button>
      {!speech.checkingCapabilities && !speech.available && (
        <span className="small muted">{t.errors.unavailable}</span>
      )}
      {speech.language !== "en-IN" && (
        <span className="small muted">{t.translatedAudio}</span>
      )}
      {speech.error && <InlineAlert error>{speech.error}</InlineAlert>}
    </div>
  );
}
