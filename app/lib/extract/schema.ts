import { z } from "zod";

// What Claude reads out of a trip's airline emails. Times are local wall-clock
// times at the airport ("2026-09-14T08:05"); code converts them to offsets.
export const ExtractedSegment = z.object({
  flight_number: z.string().describe('Carrier code and number with one space, e.g. "UA 1182"'),
  origin: z.string().describe("IATA code of the departure airport"),
  destination: z.string().describe("IATA code of the arrival airport"),
  departure_local: z.string().describe("Local departure time at the origin, YYYY-MM-DDTHH:MM"),
  arrival_local: z.string().describe("Local arrival time at the destination, YYYY-MM-DDTHH:MM"),
  cabin: z.enum(["economy", "premium_economy", "business", "first"]),
});

export const ExtractedTrip = z.object({
  record_locator: z.string().nullable(),
  original_itinerary: z.array(ExtractedSegment).describe("Flights as originally purchased"),
  change: z
    .object({
      email_id: z.string().describe("id of the email that announced the change"),
      kind: z.enum(["cancellation", "schedule_change", "delay", "renumbering", "voluntary"]),
      initiated_by: z.enum(["carrier", "traveler"]),
      new_itinerary: z.array(ExtractedSegment).nullable().describe("Replacement flights if the email gives them, else null"),
      alternative_offered: z.boolean().describe("The airline offered or booked a replacement flight"),
      credit_offered: z.boolean().describe("The airline offered a travel credit or voucher"),
      credit_issued: z.boolean().describe("The email says a credit was already added to the account"),
    })
    .nullable(),
  traveler_action_in_email: z
    .enum(["flew", "accepted_rebooking", "accepted_credit"])
    .nullable()
    .describe("Only if an email shows the traveler flew, accepted the new flight, or chose a credit"),
});

export type ExtractedTrip = z.infer<typeof ExtractedTrip>;
export type ExtractedSegment = z.infer<typeof ExtractedSegment>;
