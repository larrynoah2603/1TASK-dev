import type { Metadata } from "next";
// Self-hosted Fontsource files eliminate the flaky remote build dependency.
// Typeface families, permitted weights, and visual-profile toggle are unchanged.
import "@fontsource-variable/ibm-plex-sans/wght.css";
import "@fontsource-variable/schibsted-grotesk/wght.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-600.css";
import "@fontsource/ibm-plex-mono/latin-700.css";
import { ToastProvider } from "@/components/toast-provider";
import { BiosGlassPreviewToggle } from "@/components/uiux/bios-glass-preview-toggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "1TASK — Service desk interne",
  description: "1TASK centralise les demandes, incidents, SLA et actions de support interne.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Approved BIOS visual profile is enabled on Vercel Production.
  // Emergency visual rollback: BIOS_GLASS_ENABLED=false, then redeploy.
  // Preview and development keep their existing reversible session switch.
  const enableProductionBios = process.env.VERCEL_ENV === "production" && process.env.BIOS_GLASS_ENABLED !== "false";
  const allowVisualPreview = process.env.VERCEL_ENV === "preview" || process.env.NODE_ENV === "development";
  return (
    <html lang="fr" data-visual-profile={enableProductionBios ? "bios-glass-v31" : undefined} suppressHydrationWarning>
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
