"use client";

import { useCallback } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button, InlineAlert } from "@/components/ui";
import { useI18n } from "@/i18n/client";
import { useResource } from "@/lib/api/use-resource";
import { catalogueApi } from "@/features/catalogue/api";
import { catalogueMessages } from "@/features/catalogue/messages";
import { CategoryChip } from "./CategoryChip";
import { categories } from "./types";

const keywords: Record<string, string> = {
  agriculture: "farmer",
  education: "scholarship",
  women: "women",
  senior_citizen: "pension",
  entrepreneurship: "business",
  housing: "housing",
};

/** Citizen discovery uses the reference catalogue, not unpublished review workflows. */
export function ReferenceDiscovery() {
  const { locale, messages: m } = useI18n();
  const t = catalogueMessages[locale];
  const search = useSearchParams();
  const pathname = usePathname();
  const q = search.get("q") ?? keywords[search.get("category") ?? ""] ?? "";
  const level = search.get("level") ?? "";
  const query = new URLSearchParams({ limit: "6" });
  if (q) query.set("q", q.slice(0, 200));
  if (level === "central" || level === "state") query.set("level", level);
  const serialized = query.toString();
  const load = useCallback(() => catalogueApi.list(serialized), [serialized]);
  const resource = useResource(load);
  const catalogueQuery = new URLSearchParams(serialized);
  catalogueQuery.delete("limit");

  function update(next: URLSearchParams) {
    window.history.pushState(
      null,
      "",
      `${pathname}${next.size ? "?" + next.toString() : ""}#browse`,
    );
  }

  return (
    <section
      id="browse"
      className="browse-section"
      aria-labelledby="browse-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">{m.discover.browseEyebrow}</p>
          <h2 id="browse-title">{m.discover.browseTitle}</h2>
        </div>
        <span className="small muted">{m.discover.browseNote}</span>
      </div>
      <div className="category-chips" aria-label={m.discover.categoriesLabel}>
        {categories.map((category) => (
          <CategoryChip
            key={category.value}
            icon={category.icon}
            label={m.categoryAudience[category.value]}
            selected={q === keywords[category.value]}
            onClick={() => {
              const next = new URLSearchParams(search.toString());
              next.delete("category");
              next.delete("state_code");
              if (q === keywords[category.value]) next.delete("q");
              else next.set("q", keywords[category.value]);
              update(next);
            }}
          />
        ))}
      </div>
      <form
        className="search-form"
        key={serialized}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const next = new URLSearchParams();
          for (const name of ["q", "level"]) {
            const value = String(data.get(name) ?? "").trim();
            if (value) next.set(name, value);
          }
          update(next);
        }}
      >
        <label className="search-input">
          <span className="sr-only">{t.searchLabel}</span>
          <input
            className="input"
            name="q"
            maxLength={200}
            defaultValue={q}
            placeholder={t.placeholder}
          />
        </label>
        <label className="sr-only" htmlFor="discovery-level">
          {t.level}
        </label>
        <select
          id="discovery-level"
          className="input"
          name="level"
          defaultValue={level}
        >
          <option value="">{t.allLevels}</option>
          <option value="central">{t.central}</option>
          <option value="state">{t.state}</option>
        </select>
        <Button type="submit" variant="secondary">
          {t.search}
        </Button>
      </form>
      <p className="small muted" role="status">
        {t.notice}
      </p>
      {resource.loading && <p aria-live="polite">{t.finding}</p>}
      {resource.error && (
        <>
          <InlineAlert error>{resource.error}</InlineAlert>
          <Button variant="secondary" onClick={resource.retry}>
            {t.retry}
          </Button>
        </>
      )}
      {!resource.loading && !resource.error && resource.data && (
        <>
          <p data-testid="discover-catalogue-count">
            {resource.data.total.toLocaleString("en-IN")} {t.results}
          </p>
          {!resource.data.items.length ? (
            <p>
              {t.empty}. {t.tryAgain}
            </p>
          ) : (
            <div className="scheme-grid">
              {resource.data.items.map((record) => (
                <article className="reference-card" key={record.slug}>
                  <p className="small muted">{record.category}</p>
                  <h3>{record.name}</h3>
                  <p lang="en">{record.summary}</p>
                  <Link
                    className="text-link"
                    href={`/catalogue/${record.slug}`}
                  >
                    {t.read}
                  </Link>
                </article>
              ))}
            </div>
          )}
          <Link
            className="button secondary"
            href={`/catalogue?${catalogueQuery.toString()}`}
          >
            {m.guidePage.browseAll}
          </Link>
        </>
      )}
    </section>
  );
}
