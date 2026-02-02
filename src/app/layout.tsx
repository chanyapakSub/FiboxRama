import type { Metadata } from "next";
import "./globals.css";
// import { Geist, Geist_Mono } from "next/font/google"; // Removed to fix build error

export const runtime = 'edge';

export const metadata: Metadata = {
  title: "Medical Professional Questionnaire",
  description: "A secure questionnaire system for medical professionals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
