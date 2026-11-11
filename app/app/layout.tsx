import type { Metadata } from "next";
import { Barlow_Condensed, Public_Sans, Source_Serif_4 } from "next/font/google";
import Link from "next/link";
import { advanceClock, reset } from "./actions";
import { now } from "@/lib/store/claims";
import "./globals.css";

const publicSans = Public_Sans({ variable: "--font-public-sans", subsets: ["latin"] });
const barlow = Barlow_Condensed({ variable: "--font-barlow", subsets: ["latin"], weight: ["500", "600", "700"] });
const sourceSerif = Source_Serif_4({ variable: "--font-source-serif", subsets: ["latin"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Soaring High",
  description: "Finds the airline refunds your company cards are owed, proves each one, and gets the cash back.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  const clock = new Date(now()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return (
    <html lang="en" className={`${publicSans.variable} ${barlow.variable} ${sourceSerif.variable} antialiased`}>
      <body className="min-h-screen">
        <header className="border-b border-grid bg-card">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4">
            <Link href="/" className="font-sign text-2xl font-bold tracking-wide text-ink">
              Soaring High
            </Link>
            <nav className="flex gap-6 text-sm text-ink-soft">
              <Link href="/" className="hover:text-ink">
                Claims
              </Link>
              <Link href="/report" className="hover:text-ink">
                Recovery report
              </Link>
              <Link href="/eval" className="hover:text-ink">
                Accuracy
              </Link>
            </nav>
            <div className="ml-auto flex flex-wrap items-center gap-3 text-sm text-ink-soft">
              <span>
                Demo clock: <span className="font-semibold text-ink">{clock}</span>
              </span>
              <form action={advanceClock}>
                <input type="hidden" name="days" value="8" />
                <button className="rounded border border-grid px-2.5 py-1 hover:border-ink hover:text-ink">Skip 8 business days</button>
              </form>
              <form action={reset}>
                <button className="rounded px-2.5 py-1 hover:text-ink">Reset demo</button>
              </form>
            </div>
          </div>
          <p className="mx-auto max-w-6xl px-5 pb-3 text-xs text-ink-soft">
            Sample data: 50 seeded trips with Ramp-style card charges, airline emails and flight-status records, plus trips joined from Ramp&apos;s demo sandbox. Not real travelers. Live flight status for sandbox trips is powered by{" "}
            {/* AeroDataBox's free plan requires a credit link that sends a referrer, so no noreferrer. */}
            <a href="https://aerodatabox.com/" target="_blank" rel="noopener" className="underline hover:text-ink">AeroDataBox</a>.
          </p>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
      </body>
    </html>
  );
}
