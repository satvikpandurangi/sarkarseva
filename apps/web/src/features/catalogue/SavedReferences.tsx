"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { catalogueMessages } from "./messages";
import { useBookmarks } from "./storage";

export function SavedReferences() {
  const { locale } = useI18n();
  const t = catalogueMessages[locale];
  const bookmarks = useBookmarks();
  const [error, setError] = useState(false);
  return (
    <section className="saved-references">
      <h2>{t.bookmarks}</h2>
      <p className="muted">{t.bookmarksNote}</p>
      {error && <p role="alert">{t.retry}</p>}
      {!bookmarks.value.length ? (
        <p>{t.noBookmarks}</p>
      ) : (
        <ul>
          {bookmarks.value.map((item) => (
            <li key={item.slug} className="reference-card">
              <Link href={`/catalogue/${item.slug}`} className="text-link">
                {item.name}
              </Link>
              <button
                className="button quiet"
                onClick={() =>
                  setError(
                    !bookmarks.save(
                      bookmarks.value.filter((b) => b.slug !== item.slug),
                    ),
                  )
                }
              >
                {t.remove}
              </button>
            </li>
          ))}
        </ul>
      )}
      <Link className="text-link" href="/catalogue">
        {t.browse} →
      </Link>
    </section>
  );
}
