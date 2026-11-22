"use client";

import { useCallback } from "react";
import Link from "next/link";
import Form from "next/form";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, Search } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { useResource } from "@/lib/api/use-resource";
import { catalogueApi } from "./api";
import { catalogueMessages } from "./messages";

export function Catalogue() {
  const { locale } = useI18n();
  const t = catalogueMessages[locale];
  const search = useSearchParams();
  // Forward only supported parameters; malformed/out-of-range links recover to page one.
  const query = new URLSearchParams();
  for (const key of ["q", "category", "level"]) {
    const value = search.get(key);
    if (value) query.set(key, value.slice(0, key === "q" ? 200 : 100));
  }
  const rawOffset = Number(search.get("offset") ?? 0);
  const offset =
    Number.isInteger(rawOffset) && rawOffset >= 0 && rawOffset <= 100000
      ? rawOffset
      : 0;
  query.set("offset", String(offset));
  const serialized = query.toString();
  const load = useCallback(() => catalogueApi.list(serialized), [serialized]);
  const resource = useResource(load);
  function pageLink(nextOffset: number) {
    const next = new URLSearchParams(serialized);
    next.set("offset", String(nextOffset));
    return `/catalogue?${next.toString()}#records`;
  }
  return (
    <section className="catalogue-page">
      <div className="page-heading">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p className="muted">{t.lead}</p>
      </div>
      <Form action="/catalogue" className="catalogue-filters" key={serialized}>
        <label className="catalogue-query">
          {t.searchLabel}
          <span className="search-field">
            <Search size={19} aria-hidden="true" />
            <input
              type="search"
              name="q"
              maxLength={200}
              defaultValue={search.get("q") ?? ""}
              placeholder={t.placeholder}
            />
          </span>
        </label>
        <label>
          {t.category}
          <select
            key={resource.data?.categories.length ?? 0}
            aria-label={t.category}
            name="category"
            defaultValue={search.get("category") ?? ""}
          >
            <option value="">{t.allCategories}</option>
            {resource.data?.categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          {t.level}
          <select name="level" defaultValue={search.get("level") ?? ""}>
            <option value="">{t.allLevels}</option>
            <option value="central">{t.central}</option>
            <option value="state">{t.state}</option>
          </select>
        </label>
        <button className="button primary" type="submit">
          {t.search}
        </button>
      </Form>
      <div className="reference-notice" role="status">
        <p>{t.notice}</p>
        <p className="small">{t.englishData}</p>
      </div>
      {resource.error && (
        <div role="alert" className="panel">
          <p>{resource.error}</p>
          <button className="button secondary" onClick={resource.retry}>
            {t.retry}
          </button>
        </div>
      )}
      {resource.loading ? (
        <p aria-live="polite" className="catalogue-loading">
          {t.finding}
        </p>
      ) : (
        !resource.error &&
        resource.data && (
          <div id="records">
            <div className="catalogue-result-heading">
              <p data-testid="catalogue-count">
                <strong>
                  {resource.data.total.toLocaleString(
                    locale === "en"
                      ? "en-IN"
                      : locale === "hi"
                        ? "hi-IN"
                        : "kn-IN",
                  )}
                </strong>{" "}
                {t.results}
              </p>
              <Link href="/catalogue" className="text-link">
                {t.clear}
              </Link>
            </div>
            {!resource.data.items.length ? (
              <div className="panel">
                <h2>{t.empty}</h2>
                <p>{t.tryAgain}</p>
              </div>
            ) : (
              <div className="catalogue-grid">
                {resource.data.items.map((record) => (
                  <article className="reference-card" key={record.slug}>
                    <div className="reference-meta">
                      <span>
                        {record.government_level === "central"
                          ? t.central
                          : t.state}
                      </span>
                      <span>{record.category}</span>
                    </div>
                    <h2>
                      <Link href={`/catalogue/${record.slug}`}>
                        {record.name}
                      </Link>
                    </h2>
                    <p lang="en">{record.summary}</p>
                    <Link
                      className="text-link"
                      href={`/catalogue/${record.slug}`}
                    >
                      {t.read}
                      <ArrowUpRight size={17} aria-hidden="true" />
                    </Link>
                  </article>
                ))}
              </div>
            )}
            <nav className="catalogue-pagination" aria-label="Pagination">
              {offset > 0 && (
                <Link
                  className="button secondary"
                  href={pageLink(Math.max(0, offset - resource.data.limit))}
                >
                  {t.previous}
                </Link>
              )}
              {offset + resource.data.limit < resource.data.total && (
                <Link
                  className="button secondary"
                  href={pageLink(offset + resource.data.limit)}
                >
                  {t.next}
                </Link>
              )}
            </nav>
          </div>
        )
      )}
    </section>
  );
}
