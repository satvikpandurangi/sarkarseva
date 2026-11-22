"""Provider configuration is discoverable without leaking credentials."""

import pytest
from fastapi.testclient import TestClient


def test_public_capabilities_are_explicit_booleans(client: TestClient) -> None:
    response = client.get("/api/v1/capabilities")
    assert response.status_code == 200
    assert set(response.json()) == {"speech", "profile_extraction"}
    assert all(isinstance(value, bool) for value in response.json().values())


def test_groq_extracts_only_evidenced_draft_facts(monkeypatch) -> None:
    import io
    import json

    from app.modules.ai import gemini

    monkeypatch.setenv("GROQ_API_KEY", "test-groq-key")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("SARVAM_API_KEY", raising=False)
    gemini.get_extractor.cache_clear()
    sent = []

    def respond(request, timeout):
        sent.append(request)
        return io.BytesIO(
            json.dumps(
                {
                    "choices": [
                        {
                            "finish_reason": "stop",
                            "message": {
                                "content": json.dumps(
                                    {"facts": {"age": 20}, "evidence": {"age": "20"}}
                                )
                            },
                        }
                    ]
                }
            ).encode()
        )

    monkeypatch.setattr(gemini, "urlopen", respond)
    try:
        result = gemini.get_extractor().extract("I am 20", "en-IN")
        assert result.facts.age == 20
        assert result.needs_review is True
        assert sent[0].full_url == "https://api.groq.com/openai/v1/chat/completions"
        assert sent[0].get_header("Authorization") == "Bearer test-groq-key"
        assert sent[0].get_header("User-agent") == "SarkarSeva/2.0"
    finally:
        gemini.get_extractor.cache_clear()


def test_capabilities_never_return_provider_credentials(client: TestClient) -> None:
    from pydantic import SecretStr

    from app.modules.ai.gemini import GeminiExtractor, get_extractor
    from app.modules.ai.settings import AISettings, GroqSettings
    from app.modules.speech.sarvam import SarvamSpeech, get_speech_service
    from app.modules.speech.settings import SpeechSettings

    extractor = GeminiExtractor(
        AISettings(_env_file=None, api_key=None),
        groq_settings=GroqSettings(_env_file=None, api_key=SecretStr("synthetic-groq-secret")),
    )
    speech = SarvamSpeech(
        SpeechSettings(_env_file=None, api_key=SecretStr("synthetic-sarvam-secret"))
    )
    client.app.dependency_overrides[get_extractor] = lambda: extractor
    client.app.dependency_overrides[get_speech_service] = lambda: speech
    try:
        response = client.get("/api/v1/capabilities")
        assert response.json() == {"speech": True, "profile_extraction": True}
        assert "secret" not in response.text
    finally:
        client.app.dependency_overrides.clear()


@pytest.mark.parametrize(
    "output",
    [
        {"facts": {"age": 80}, "evidence": {"age": "not in original"}},
        {"facts": {"age": 20}, "evidence": {}},
    ],
)
def test_groq_rejects_unsupported_facts(output, monkeypatch) -> None:
    import json
    from io import BytesIO

    from pydantic import SecretStr

    from app.modules.ai import gemini
    from app.modules.ai.settings import AISettings, GroqSettings

    extractor = gemini.GeminiExtractor(
        AISettings(_env_file=None, api_key=None),
        groq_settings=GroqSettings(_env_file=None, api_key=SecretStr("synthetic-key")),
    )
    monkeypatch.setattr(
        gemini,
        "urlopen",
        lambda *args, **kwargs: BytesIO(
            json.dumps(
                {"choices": [{"finish_reason": "stop", "message": {"content": json.dumps(output)}}]}
            ).encode()
        ),
    )
    with pytest.raises(gemini.ExtractionUnavailable):
        extractor.extract("I am 20", "en-IN")
