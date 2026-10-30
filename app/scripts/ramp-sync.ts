import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AeroDataBox } from "../lib/flightstatus/aerodatabox";
import { BookingsResponse, matchCharge, toRampTransaction, TransactionsResponse, tripFromBooking } from "../lib/ramp/join";
import { callRampTool, connectRamp } from "../lib/ramp/mcp";
import { localDate } from "../lib/rules/dates";
import type { RampTransaction, Trip } from "../lib/types";

// Builds trips from the Ramp sandbox (flight bookings joined to airline charges)
// and writes them to app/.data/ramp-trips.json for the app to show.
const APP = join(import.meta.dirname, "..");
if (existsSync(join(APP, ".env"))) process.loadEnvFile(join(APP, ".env"));
const RATIONALE = "Soaring High hackathon: join airline charges to flight bookings to check refunds owed under 14 CFR 260.";
const MAX_PAGES = 20;

async function main(): Promise<void> {
  const conn = await connectRamp();

  const charges: RampTransaction[] = [];
  let cursor: string | null | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = TransactionsResponse.parse(
      await callRampTool(conn, "ramp_get_transactions", {
        rationale: RATIONALE,
        transactions_to_retrieve: "all_transactions_across_entire_business",
        page_size: 200,
        ...(cursor ? { next_page_cursor: cursor } : {}),
      }),
    );
    charges.push(...res.transactions.filter((t) => t.merchant_category === "Airlines" || t.merchant_category === "Travel Misc").map(toRampTransaction));
    cursor = res.next_page_cursor;
    if (!cursor) break;
  }

  const { flights } = BookingsResponse.parse(
    await callRampTool(conn, "ramp_get_bookings", {
      rationale: RATIONALE,
      include_flights: true,
      include_hotels: false,
      include_cars: false,
      include_past: true,
      include_failed: false,
      limit: 50,
    }),
  );
  await conn.client.close();

  const adbKey = process.env.AERODATABOX_RAPIDAPI_KEY;
  const adb = adbKey ? new AeroDataBox(adbKey, join(APP, ".cache/aerodatabox")) : null;

  const trips: Trip[] = [];
  for (const b of flights) {
    const m = matchCharge(b, charges);
    if (!m) {
      console.log(`  no matching card charge: ${b.flight_number} ${b.departure_airport}-${b.arrival_airport} ${b.departure_time.slice(0, 10)}`);
      continue;
    }
    const trip = tripFromBooking(b, m);
    if (adb) {
      for (const s of trip.facts.original) {
        const status = await adb.status(s.flight_number, localDate(s.departure), s.origin);
        if (status) trip.flight_status.push(status);
      }
    }
    trips.push(trip);
    console.log(`  matched ${b.flight_number} ${b.departure_airport}-${b.arrival_airport} to ${m.charge.amount} (${m.why.join("; ")})`);
  }

  mkdirSync(join(APP, ".data"), { recursive: true });
  writeFileSync(join(APP, ".data/ramp-trips.json"), `${JSON.stringify(trips, null, 2)}\n`);
  const airline = charges.filter((c) => c.merchant_category === "Airlines").length;
  console.log(
    `Ramp sandbox: ${flights.length} flight bookings, ${airline} airline charges. ${trips.length} trips joined and written to .data/ramp-trips.json.${adb ? "" : " No AERODATABOX_RAPIDAPI_KEY, so no flight-status records yet."}`,
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
