"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useResource } from "@/lib/api/use-resource";
import { useI18n } from "@/i18n/client";
import { catalogueApi } from "./api";
import { catalogueMessages } from "./messages";
import { useBookmarks } from "./storage";
import { PreparationChecklist } from "./PreparationChecklist";

export function RecordDetail({ slug }: { slug: string }) {
  const { locale } = useI18n();
  const t = catalogueMessages[locale];
  const load = useCallback(() => catalogueApi.detail(slug), [slug]);
  const resource = useResource(load);
  const bookmarks = useBookmarks();
  const [storageError, setStorageError] = useState(false);
  const record = resource.data;
  const saved = bookmarks.value.some((item) => item.slug === slug);
  return (
    <section className="record-page">
      <Link href="/catalogue" className="text-link">
        ← {t.back}
      </Link>
      {resource.loading && <p aria-live="polite">{t.finding}</p>}
      {resource.error && (
        <div className="panel" role="alert">
          <h1>{t.notFound}</h1>
          <p>{resource.error}</p>
          <button className="button secondary" onClick={resource.retry}>
            {t.retry}
          </button>
        </div>
      )}
      {!resource.loading && !resource.error && record && (
        <>
          <header className="page-heading">
            <p className="eyebrow">
              {record.category} ·{" "}
              {record.government_level === "central" ? t.central : t.state}
            </p>
            <h1 lang="en">{record.name}</h1>
            <button
              className="button secondary"
              aria-pressed={saved}
              onClick={() => {
                const next = saved
                  ? bookmarks.value.filter((item) => item.slug !== slug)
                  : [...bookmarks.value, { slug, name: record.name }];
                setStorageError(!bookmarks.save(next));
              }}
            >
              {saved ? t.saved : t.save}
            </button>
            {storageError && (
              <p role="alert">
                {t.retry} · {t.bookmarksNote}
              </p>
            )}
          </header>
          <div className="reference-notice" role="status">
            <strong>{t.unverified}</strong>
            <p>{t.notice}</p>
            <p className="small">{t.englishData}</p>
          </div>
          <div className="record-layout">
            <div className="record-sections">
              {(
                [
                  [t.overview, record.summary],
                  [t.benefits, record.benefits],
                  [t.eligibility, record.eligibility],
                  [t.application, record.application],
                ] as const
              ).map(([title, text]) => (
                <section className="reference-card" key={title}>
                  <h2>{title}</h2>
                  <p className="record-text" lang="en">
                    {text || t.unavailable}
                  </p>
                </section>
              ))}
            </div>
            <aside className="record-sidebar">
              <PreparationChecklist slug={slug} text={record.documents} />
              <section className="reference-card">
                <h2>{t.source}</h2>
                <p className="small muted">{t.notice}</p>
                <a
                  className="text-link"
                  href="https://www.kaggle.com/datasets/jainamgada45/indian-government-schemes"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Indian Government Schemes ↗
                </a>
                <p className="small muted">{t.directoryNote}</p>
                <a
                  className="text-link"
                  href="https://www.myscheme.gov.in/search"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t.officialDirectory} ↗
                </a>
              </section>
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
