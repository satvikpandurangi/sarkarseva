"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/client";
import { errorMessage } from "@/lib/api/client";
import { catalogueApi } from "./api";
import { catalogueMessages } from "./messages";

export function Assistant() {
  const { locale, messages } = useI18n();
  const t = catalogueMessages[locale];
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof catalogueApi.ask>
  > | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="assistant-page">
      <div className="page-heading">
        <p className="eyebrow">{t.questions}</p>
        <h1>{t.assistantTitle}</h1>
        <p className="muted">{t.assistantLead}</p>
      </div>
      <form
        className="reference-card"
        onSubmit={async (event) => {
          event.preventDefault();
          const question = String(
            new FormData(event.currentTarget).get("question") ?? "",
          ).trim();
          if (busy || question.length < 2) return;
          setBusy(true);
          setError("");
          setResult(null);
          try {
            setResult(await catalogueApi.ask(question));
          } catch (e) {
            setError(errorMessage(e, messages.errors));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label htmlFor="question">{t.question}</label>
        <textarea
          id="question"
          name="question"
          required
          minLength={2}
          maxLength={2000}
          rows={4}
          placeholder={t.placeholder}
        />
        <button className="button primary" disabled={busy} type="submit">
          {busy ? t.finding : t.findAnswers}
        </button>
      </form>
      <div className="reference-notice" role="status">
        {t.notice}
      </div>
      {error && (
        <p className="panel" role="alert">
          {error}
        </p>
      )}
      <div aria-live="polite" aria-busy={busy}>
        {result && (
          <section className="answer-results">
            <h2>{t.passages}</h2>
            <p lang="en">{result.answer}</p>
            {result.sources.map((source) => (
              <article className="reference-card" key={source.slug}>
                <h3 lang="en">{source.name}</h3>
                <blockquote lang="en">{source.excerpt}</blockquote>
                <Link className="text-link" href={`/catalogue/${source.slug}`}>
                  {t.sourceRecord} →
                </Link>
              </article>
            ))}
          </section>
        )}
      </div>
    </section>
  );
}
