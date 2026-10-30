import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { callRampTool, connectRamp } from "../lib/ramp/mcp";

// Pulls a sample of the sandbox's card transactions and flight bookings so the
// seeded trip shape can be checked against what Ramp really returns.
const OUT = join(import.meta.dirname, "../data/ramp");
const RATIONALE = "Soaring High hackathon: read airline charges and flight bookings to find refunds owed under 14 CFR 260.";

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const conn = await connectRamp();
  const save = (name: string, data: unknown) => writeFileSync(join(OUT, `sample-${name}.json`), `${JSON.stringify(data, null, 2)}\n`);

  const transactions = await callRampTool(conn, "ramp_get_transactions", {
    rationale: RATIONALE,
    transactions_to_retrieve: "all_transactions_across_entire_business",
    page_size: 200,
    include_count: true,
  });
  save("transactions", transactions);

  const bookings = await callRampTool(conn, "ramp_get_bookings", {
    rationale: RATIONALE,
    include_flights: true,
    include_hotels: false,
    include_cars: false,
    include_past: true,
    include_failed: true,
    limit: 50,
  });
  save("bookings", bookings);

  const flights = (bookings as { flights?: { flight_booking_id?: string }[] }).flights ?? [];
  const bookingId = flights[0]?.flight_booking_id;
  if (bookingId) {
    save("booking-details", await callRampTool(conn, "ramp_get_booking_details", { rationale: RATIONALE, flight_booking_id: bookingId }));
    save("booking-cancellation", await callRampTool(conn, "ramp_booking_cancellation_details", { rationale: RATIONALE, booking_id: bookingId }));
  }
  console.log(`Saved samples to data/ramp/: ${flights.length} flight bookings${bookingId ? `, details for ${bookingId}` : ""}`);
  await conn.client.close();
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
