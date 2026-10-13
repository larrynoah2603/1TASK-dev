import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono, Schibsted_Grotesk } from "next/font/google";
import { ToastProvider } from "@/components/toast-provider";
import { BiosGlassPreviewToggle } from "@/components/uiux/bios-glass-preview-toggle";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal"],
  display: "swap",
  variable: "--font-ibm-plex-sans",
});

// Additional fonts are not preloaded in production. They render only while the
// preview-only data-visual-profile="bios-glass-v31" attribute is active.
const schibstedGrotesk = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  preload: false,
  variable: "--font-schibsted-grotesk",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal"],
  display: "swap",
  preload: false,
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: "1TASK — Service desk interne",
  description: "1TASK centralise les demandes, incidents, SLA et actions de support interne.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Vercel production and CI builds have no preview toggle. The visual
  // profile stays off unless enabled by the user on a preview/dev deployment.
  const allowVisualPreview = process.env.VERCEL_ENV === "preview" || process.env.NODE_ENV === "development";
  return (
    <html lang="fr" className={`${ibmPlexSans.variable} ${schibstedGrotesk.variable} ${ibmPlexMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: "try { document.documentElement.dataset.theme = localStorage.getItem('1task-theme') === 'light' ? 'light' : 'dark'; } catch { document.documentElement.dataset.theme = 'dark'; }",
          }}
        />
      </head>
      <body><a href="#main-content" className="skip-link">Aller au contenu principal</a><ToastProvider>{children}</ToastProvider>{allowVisualPreview ? <BiosGlassPreviewToggle /> : null}</body>
    </html>
  );
}
