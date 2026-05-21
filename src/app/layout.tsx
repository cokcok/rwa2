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
  title: "ระบบลงเวลาทำงาน",
  description: "ระบบลงเวลาทำงานผ่านเว็บ สำหรับหน่วยงานราชการ",
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
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <h1 className="text-xl font-bold text-gray-800 text-center">
              ระบบลงเวลาทำงานผ่านเว็บ
            </h1>
            <p className="text-sm text-gray-500 text-center mt-1">
              Web-Based Attendance System
            </p>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto">
          {children}
        </main>

        {/* Footer */}
        <footer className="text-center py-4 text-sm text-gray-400 border-t border-gray-200 mt-8">
          ระบบลงเวลาทำงานผ่านเว็บ &copy; {new Date().getFullYear()}
        </footer>
      </body>
    </html>
  );
}
