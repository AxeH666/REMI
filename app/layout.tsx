import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "REMI | Reel Evaluation & Moment Inspector",
  description:
    "Timestamped creative direction for finished short-form videos.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
