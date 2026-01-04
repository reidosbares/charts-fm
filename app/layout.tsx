import type { Metadata } from "next";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import { NavigationProvider } from "@/contexts/NavigationContext";
import Navbar from "@/components/Navbar";

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
      <body className="antialiased">
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

