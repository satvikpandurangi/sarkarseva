import React from "react";
import { BookmarkCheck, FileText, ShieldCheck, UsersRound } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { getLocale, getMessages } from "@/i18n/server";
import { catalogueMessages } from "@/features/catalogue/messages";

const icons = [FileText, UsersRound, BookmarkCheck, ShieldCheck];

export async function BenefitsStrip() {
  const m = await getMessages();
  const t = catalogueMessages[await getLocale()];
  const valueProps = m.home.benefits.items.map((item, i) => ({
    ...(i === 2 ? { title: t.sourceBenefitTitle, text: t.sourceBenefitText } : item),
    icon: icons[i],
  }));

  return (
    <section className="my-10 sm:my-14" aria-labelledby="benefits-title">
      <h2 id="benefits-title" className="sr-only">
        {m.home.benefits.title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {valueProps.map(({ icon: Icon, title, text }) => (
          <GlassCard
            key={title}
            variant="standard"
            interactive
            className="p-5 rounded-2xl bg-cream/80 backdrop-blur-md border border-white/90 shadow-xs hover:shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#fff3e8] text-[#a04100] flex items-center justify-center mb-3.5">
                <Icon size={18} aria-hidden="true" />
              </div>
              <p className="text-[15px] font-bold text-[#1a1a2e] tracking-tight leading-snug">
                {title}
              </p>
              <p className="text-xs text-[#47464c] mt-1.5 leading-relaxed">
                {text}
              </p>
            </div>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}
