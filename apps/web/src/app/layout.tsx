import type { Metadata } from "next";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/fraunces";
import "./globals.css";
import "@/styles/shell.css";
import "@/styles/navbar.css";
import "@/styles/sarkarseva.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { ProfileProvider } from "@/features/profile/hooks";
import { MatchingProvider } from "@/features/matching/hooks";
import { I18nProvider } from "@/i18n/client";
import { getLocale } from "@/i18n/server";
import { messages } from "@/i18n/messages";
import { SpeechProvider } from "@/features/speech/SpeechProvider";
import { AuthProvider } from "@/features/auth/AuthProvider";

export async function generateMetadata(): Promise<Metadata> {
  const m = messages[await getLocale()];
  return { title: m.meta.title, description: m.meta.description };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const m = messages[locale];
  return (
    <html lang={locale}>
      <body className="min-h-screen flex flex-col bg-[#faf9f5] text-[#1a1a2e] selection:bg-[#a04100] selection:text-white pb-16 md:pb-0">
        <I18nProvider locale={locale} messages={m}>
          <AuthProvider>
            <SpeechProvider>
              <ProfileProvider>
                <MatchingProvider>
                  <a href="#main" className="skip-link">
                    {m.nav.skipToContent}
                  </a>
                  <Navbar />
                  {process.env.NODE_ENV === "development" &&
                    process.env.RAG_DEMO_ENABLED === "1" && (
                      <div className="bg-emerald-50 px-4 text-emerald-900">
                        <a className="button quiet" href="/rag">
                          Open RAG test · eight unverified sample records
                        </a>
                      </div>
                    )}
                  <PageContainer ambientGlow={false}>
                    <main id="main" className="container flex-1">
                      {children}
                    </main>
                  </PageContainer>
                  <Footer />
                  <MobileBottomNav />
                </MatchingProvider>
              </ProfileProvider>
            </SpeechProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
