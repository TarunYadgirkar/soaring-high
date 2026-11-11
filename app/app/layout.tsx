import type { Metadata } from "next";
import { Geist_Mono, Hanken_Grotesk, Schibsted_Grotesk } from "next/font/google";
import Link from "next/link";
import { advanceClock, reset } from "./actions";
import { now } from "@/lib/store/claims";
import "./globals.css";

const hanken = Hanken_Grotesk({ variable: "--font-hanken", subsets: ["latin"] });
const schibsted = Schibsted_Grotesk({ variable: "--font-schibsted", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Soaring High",
  description: "Finds the airline refunds your company cards are owed, proves each one, and gets the cash back.",
};

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/", label: "Claims" },
  { href: "/report", label: "Report" },
  { href: "/eval", label: "Accuracy" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  const clock = new Date(now()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return (
    <html lang="en" className={`${hanken.variable} ${schibsted.variable} ${geistMono.variable}`}>
      <body className="flex min-h-screen flex-col">
        <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-10 gap-y-3 px-6 py-6">
          <Link href="/" className="font-sign text-xl font-medium text-ink">
            Soaring High
          </Link>
          <nav className="flex gap-7 text-sm text-ink-soft">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="hover:text-ink">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="meta ml-auto flex items-center gap-6">
            <span>{clock}</span>
            <form action={advanceClock}>
              <input type="hidden" name="days" value="8" />
              <button className="hover:text-ink">Skip 8 business days</button>
            </form>
            <form action={reset}>
              <button className="hover:text-ink">Reset demo</button>
            </form>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-24 pt-10">{children}</main>
        <footer className="meta mx-auto w-full max-w-6xl px-6 pb-8">
          Seeded sample data, not real travelers. Flight status by{" "}
          {/* AeroDataBox's free plan requires a credit link that sends a referrer, so no noreferrer. */}
          <a href="https://aerodatabox.com/" target="_blank" rel="noopener" className="underline hover:text-ink">
            AeroDataBox
          </a>
          .
        </footer>
      </body>
    </html>
  );
}
