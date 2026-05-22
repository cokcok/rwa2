import type { Metadata } from "next";
import localFont from "next/font/local";

import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "RAOT - ระบบลงเวลาทำงาน",
  description: "RAOT - ระบบลงเวลาทำงาน",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 min-h-screen`}
      >
        {/* Header */}
        <header className="bg-gradient-to-r from-yellow-500 via-yellow-400 to-amber-500 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-5">
            <div className="flex items-center justify-center gap-3">
              <img src="/logo1.png" alt="RAOT Logo" className="w-12 h-12 rounded-full shadow-md" />
              <div className="text-center">
                <h1 className="text-2xl font-bold text-green-800 tracking-wide drop-shadow-sm">
                  ระบบลงเวลาทำงาน
                </h1>
                <p className="text-green-700 text-sm mt-0.5 font-medium tracking-widest uppercase">
                  RAOT Attendance System
                </p>
              </div>
            </div>
          </div>
          <div className="h-1 bg-gradient-to-r from-white/40 via-white/60 to-white/40"></div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto">
          {children}
        </main>

        {/* Footer */}
        <footer className="text-center py-4 text-sm text-amber-500 border-t border-amber-100 mt-8">
          ระบบลงเวลาทำงาน RAOT &copy; {new Date().getFullYear()}
        </footer>
      </body>
    </html>
  );
}
