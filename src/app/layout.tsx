import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

/** Tipografía de marca: Montserrat en toda la interfaz, como en el sitio. */
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Minerva CRM",
  description: "Sistema CRM de Minerva Consultores",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}