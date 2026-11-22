import Link from "next/link";
import { getLocale, getMessages } from "@/i18n/server";
import { catalogueMessages } from "@/features/catalogue/messages";

export default async function Privacy() {
  const m = await getMessages();
  const p = m.privacy;
  const copy = catalogueMessages[await getLocale()];
  return (
    <article className="reading-page">
      <h1>{p.title}</h1>
      <p>{p.intro}</p>
      <h2>{p.keepsTitle}</h2>
      <p>{p.keepsText}</p>
      <p>{copy.privacyStorage}</p>
      <p>{copy.privacySearch}</p>
      <h2>{p.aiTitle}</h2>
      <p>{p.aiText}</p>
      <h2>{p.clearTitle}</h2>
      <p>{p.clearText}</p>
      <p>{p.mockText}</p>
      <Link className="button secondary" href="/discover">
        {p.cta}
      </Link>
    </article>
  );
}
