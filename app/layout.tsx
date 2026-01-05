import type { Metadata } from "next";
import "react-day-picker/dist/style.css";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import { NavigationProvider } from "@/contexts/NavigationContext";
import Navbar from "@/components/Navbar";
import { Oswald } from "next/font/google";

const oswald = Oswald({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-oswald',
});

export const metadata: Metadata = {
  title: "ChartsFM - Your Last.fm Listening Stats",
  description: "Create beautiful charts and visualizations from your Last.fm listening data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased ${oswald.variable}`}>
        <SessionProvider>
          <NavigationProvider>
            <Navbar />
            {children}
          </NavigationProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

