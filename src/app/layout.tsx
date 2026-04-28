import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Цайдам | Tsaidam Camp",
  description: "Цайдам жуулчны баазын захиалга, удирдлагын систем",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
