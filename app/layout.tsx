import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { ToastProvider } from "@/components/toast-provider";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal"],
  display: "swap",
  variable: "--font-ibm-plex-sans",
});

export const metadata: Metadata = {
  title: "1TASK — Service desk interne",
  description: "1TASK centralise les demandes, incidents, SLA et actions de support interne.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={ibmPlexSans.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: "try { document.documentElement.dataset.theme = localStorage.getItem('1task-theme') === 'light' ? 'light' : 'dark'; } catch { document.documentElement.dataset.theme = 'dark'; }",
          }}
        />
      </head>
      <body><a href="#main-content" className="skip-link">Aller au contenu principal</a><ToastProvider>{children}</ToastProvider></body>
    </html>
  );
}
