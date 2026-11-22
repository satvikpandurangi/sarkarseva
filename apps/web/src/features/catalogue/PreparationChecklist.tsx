"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { catalogueMessages } from "./messages";
import {
  checklistSchema,
  customChecklistSchema,
  useStoredList,
} from "./storage";

export function PreparationChecklist({
  slug,
  text,
}: {
  slug: string;
  text: string;
}) {
  const { locale } = useI18n();
  const t = catalogueMessages[locale];
  const checked = useStoredList(
    `sarkarseva:checklist:v1:${slug}`,
    checklistSchema,
  );
  const custom = useStoredList(
    `sarkarseva:custom-checklist:v1:${slug}`,
    customChecklistSchema,
  );
  const [error, setError] = useState(false);
  const separated = text
    .split(/\r?\n+|;|•/)
    .map((s) => s.trim())
    .filter(Boolean);
  // Undelimited prose must not become one giant "document" checkbox.
  const originalItems =
    separated.length > 1
      ? separated.filter((s) => s.length <= 240).slice(0, 40)
      : [];
  const items = [...new Set([...originalItems, ...custom.value])];
  return (
    <section className="reference-card">
      <h2>{t.documents}</h2>
      <p className="small muted">{t.checklistNote}</p>
      <fieldset>
        <legend className="sr-only">{t.checklist}</legend>
        {items.map((doc) => (
          <div className="checklist-item" key={doc}>
            <label className="document-check">
              <input
                type="checkbox"
                checked={checked.value.includes(doc)}
                onChange={(event) =>
                  setError(
                    !checked.save(
                      event.target.checked
                        ? [...new Set([...checked.value, doc])]
                        : checked.value.filter((item) => item !== doc),
                    ),
                  )
                }
              />
              <span lang="en">{doc}</span>
            </label>
            {custom.value.includes(doc) && (
              <button
                type="button"
                className="button quiet"
                aria-label={`${t.remove} ${doc}`}
                onClick={() => {
                  const saved = custom.save(
                    custom.value.filter((item) => item !== doc),
                  );
                  setError(
                    !saved ||
                      !checked.save(
                        checked.value.filter((item) => item !== doc),
                      ),
                  );
                }}
              >
                {t.remove}
              </button>
            )}
          </div>
        ))}
      </fieldset>
      <p className="small muted">{t.customDocumentsNote}</p>
      <form
        className="custom-checklist-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const value = String(new FormData(form).get("document") ?? "").trim();
          if (!value || value.length > 240) return;
          const saved = custom.save([...new Set([...custom.value, value])]);
          setError(!saved);
          if (saved) form.reset();
        }}
      >
        <label htmlFor={`document-${slug}`}>{t.documentName}</label>
        <input
          className="input"
          id={`document-${slug}`}
          name="document"
          required
          maxLength={240}
        />
        <button className="button secondary" type="submit">
          {t.addItem}
        </button>
      </form>
      {error && (
        <p role="alert">
          {t.retry} · {t.bookmarksNote}
        </p>
      )}
      <details>
        <summary>{t.fullDocuments}</summary>
        <p lang="en" className="record-text">
          {text || t.unavailable}
        </p>
      </details>
    </section>
  );
}
