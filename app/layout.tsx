import type { Metadata } from "next";
import { ToastProvider } from "@/components/toast-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "1TASK — Service desk interne",
  description: "1TASK centralise les demandes, incidents, SLA et actions de support interne.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body><a href="#main-content" className="skip-link">Aller au contenu principal</a><ToastProvider>{children}</ToastProvider></body>
    </html>
  );
}
