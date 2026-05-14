import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppNavigation } from "./navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "Toram Adventurer Ledger",
  description: "Smart Play dashboard and explorer for Toram Online data."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skipLink" href="#main-content">
          Skip to content
        </a>
        <AppNavigation />
        <div id="main-content">{children}</div>
      </body>
    </html>
  );
}
