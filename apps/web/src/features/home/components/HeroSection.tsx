import Link from "next/link";
import Form from "next/form";
import { ArrowRight, Search, ShieldCheck } from "lucide-react";
import { getLocale } from "@/i18n/server";
import { catalogueMessages } from "@/features/catalogue/messages";

export async function HeroSection() {
  const locale = await getLocale();
  const t = catalogueMessages[locale];
  const popular =
    locale === "hi"
      ? ["छात्रवृत्ति", "किसान", "आवास", "पेंशन"]
      : locale === "kn"
        ? ["ವಿದ್ಯಾರ್ಥಿವೇತನ", "ರೈತ", "ವಸತಿ", "ಪಿಂಚಣಿ"]
        : ["Scholarship", "Farmer support", "Housing", "Pension"];
  return (
    <section className="seva-hero" aria-labelledby="hero-title">
      <div className="hero-independence">
        <ShieldCheck size={15} aria-hidden="true" />
        {t.independence}
      </div>
      <h1 id="hero-title">
        {t.heroLead}
        <br />
        <em>{t.heroAccent}</em>
      </h1>
      <p className="seva-hero-copy">{t.heroBody}</p>
      <Form action="/catalogue" className="seva-search" role="search">
        <Search size={22} aria-hidden="true" />
        <label className="sr-only" htmlFor="hero-search">
          {t.searchLabel}
        </label>
        <input
          id="hero-search"
          name="q"
          type="search"
          maxLength={200}
          placeholder={t.placeholder}
          required
        />
        <button type="submit">{t.search}</button>
      </Form>
      <div className="seva-popular">
        <span>{t.popular}:</span>
        {popular.map((term) => (
          <Link key={term} href={`/catalogue?q=${encodeURIComponent(term)}`}>
            {term}
          </Link>
        ))}
      </div>
      <div className="seva-hero-actions">
        <Link href="/catalogue" className="text-link">
          {t.browse}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <Link href="/discover" className="text-link">
          {t.personal}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <Link href="/assistant" className="text-link">
          {t.questions}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
