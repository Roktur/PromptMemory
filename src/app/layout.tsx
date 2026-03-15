import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    template: "%s | Prompt Memory",
    default: "Prompt Memory",
  },
  description: "Personal AI Prompt Collections",
};

export const viewport: Viewport = {
  themeColor: "#090d16",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
