"use client";

import React from "react";
import { ShieldCheck, AlertCircle } from "lucide-react";
import { useMessages } from "@/i18n/client";

export function ProfilePrivacyNotice() {
  const m = useMessages();
  const t = m.profile;

  return (
    <div className="p-4 rounded-2xl bg-[#fff3e8]/60 border border-[#a04100]/15 text-[#1a1a2e] space-y-2">
      <div className="flex items-start gap-2.5">
        <ShieldCheck
          size={18}
          className="text-[#a04100] shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#1a1a2e] leading-relaxed">
            {t.privacyPanelText}
          </p>
          <p className="text-xs text-[#47464c] flex items-center gap-1.5 font-semibold">
            <AlertCircle size={13} className="shrink-0 text-[#a04100]" aria-hidden="true" />
            <span>{t.privacyPanelAadhaar}</span>
          </p>

        </div>
      </div>
    </div>
  );
}
