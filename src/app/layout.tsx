import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jbmono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Gyro Republic · Product Mix Dashboard",
  description: "Product mix, channels, modifiers, payments and attachment for Gyro Republic, from Toast via the Neon pipeline.",
};

// Restore the saved theme before paint so there's no light/dark flash (OS preference is the default).
const themeScript = `try{var t=localStorage.getItem('pmix-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);var n=localStorage.getItem('pmix-nav');if(n==='closed')document.documentElement.setAttribute('data-nav','closed');}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
