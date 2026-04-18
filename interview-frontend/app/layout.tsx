import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Vocalytics",
  description: "Voice-powered interviews, instantly.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <LanguageProvider>
          <AuthProvider>
            <Navbar />
            <main>{children}</main>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
