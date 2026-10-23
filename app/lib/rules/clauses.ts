import type { Citation, ClauseId } from "../types";

// Excerpts are verbatim from eCFR, Title 14, up to date as of Oct 21, 2026,
// and from the Federal Register notice of July 7, 2026 (FR Doc. 2026-13675).
const ECFR = "https://www.ecfr.gov/current/title-14";

const CLAUSES: Record<ClauseId, Omit<Citation, "clause">> = {
  "260.2/cancelled-flight": {
    label: "14 CFR 260.2, Cancelled flight",
    excerpt:
      "a covered flight with a specific flight number scheduled to be operated between a specific origin-destination city pair that was published in the carrier's Computer Reservation System at the time of the ticket sale but not operated by the carrier.",
    url: `${ECFR}/section-260.2`,
  },
  "260.2/significant-change": {
    label: "14 CFR 260.2, Significantly delayed or changed flight",
    excerpt:
      "a covered flight itinerary with a delay or change made by a covered carrier where, as the result of the delay or change: (1) The consumer is scheduled to depart from the origination airport three hours or more for domestic itineraries and six hours or more for international itineraries earlier than the original scheduled departure time; (2) The consumer is scheduled to arrive at the destination airport three or more hours for domestic itineraries or six or more hours for international itineraries after the original scheduled arrival time; (3) The consumer is scheduled to depart from a different origination airport or arrive at a different destination airport; (4) The consumer is scheduled to travel on an itinerary with more connection points than that of the original itinerary; (5) The consumer is downgraded to a lower class of service;",
    url: `${ECFR}/section-260.2`,
  },
  "260.2/covered-flight": {
    label: "14 CFR 260.2, Covered flight",
    excerpt:
      "a scheduled flight operated or marketed by a covered carrier to, from, or within the United States, including itineraries with brief and incidental stopover(s) at a foreign point without a break in journey.",
    url: `${ECFR}/section-260.2`,
  },
  "260.2/prompt-refund": {
    label: "14 CFR 260.2, Prompt refund",
    excerpt:
      "refunds made within 7 business days after the earliest date the refund was requested as set forth in § 260.6(a)(2) as required by 14 CFR 374.3 for credit card purchases",
    url: `${ECFR}/section-260.2`,
  },
  "260.6(a)(1)": {
    label: "14 CFR 260.6(a)(1)",
    excerpt:
      "A covered carrier that is the merchant of record must provide a full and prompt refund of the airfare, including any taxes and ancillary fees, ... for any cancelled flight or significantly delayed or changed flight where the consumer chooses not to: (i) Fly on the significantly delayed or changed flight or accept rebooking on an alternative flight; or (ii) Accept any voucher, credit, or other form of compensation offered",
    url: `${ECFR}/section-260.6#p-260.6(a)(1)`,
  },
  "260.6(a)(1)(i)": {
    label: "14 CFR 260.6(a)(1)(i)",
    excerpt:
      "where the consumer chooses not to: (i) Fly on the significantly delayed or changed flight or accept rebooking on an alternative flight",
    url: `${ECFR}/section-260.6#p-260.6(a)(1)(i)`,
  },
  "260.6(a)(1)(ii)": {
    label: "14 CFR 260.6(a)(1)(ii)",
    excerpt:
      "where the consumer chooses not to: ... (ii) Accept any voucher, credit, or other form of compensation offered by the air carrier or foreign air carrier",
    url: `${ECFR}/section-260.6#p-260.6(a)(1)(ii)`,
  },
  "260.6(a)(2)(i)": {
    label: "14 CFR 260.6(a)(2)(i)",
    excerpt:
      "A flight is canceled and a consumer is not offered an alternative flight or any voucher, credit, or other form of compensation by the air carrier or foreign air carrier",
    url: `${ECFR}/section-260.6#p-260.6(a)(2)(i)`,
  },
  "260.6(a)(2)(ii)": {
    label: "14 CFR 260.6(a)(2)(ii)",
    excerpt:
      "A consumer rejects the significantly delayed or changed flight, rebooking on an alternative flight, or any voucher, credit, or other form of compensation offered by the covered carrier",
    url: `${ECFR}/section-260.6#p-260.6(a)(2)(ii)`,
  },
  "260.6(a)(2)(iii)(A)": {
    label: "14 CFR 260.6(a)(2)(iii)(A)",
    excerpt:
      "A consumer does not respond to an offer of: (A) A significantly delayed or changed flight or an alternative flight and the flight departs without the consumer",
    url: `${ECFR}/section-260.6#p-260.6(a)(2)(iii)(A)`,
  },
  "260.6(a)(2)(iii)(B)": {
    label: "14 CFR 260.6(a)(2)(iii)(B)",
    excerpt:
      "A consumer does not respond to an offer of: ... (B) A voucher, credit, or other form of compensation by the date on which the cancelled flight was scheduled to depart",
    url: `${ECFR}/section-260.6#p-260.6(a)(2)(iii)(B)`,
  },
  "260.6(c)": {
    label: "14 CFR 260.6(c)",
    excerpt:
      "A covered carrier may offer a voucher, credit, or other form of compensation as an explicit alternative to providing a refund ... if: (1) The offer includes a clear and conspicuous notice of ... (ii) The consumer's right to a full refund under this section.",
    url: `${ECFR}/section-260.6#p-260.6(c)`,
  },
  "260.7": {
    label: "14 CFR 260.7",
    excerpt:
      "A covered carrier must not deem a consumer to have accepted an offer for travel credits, vouchers, or other compensation in lieu of a refund under § 260.6(c) unless the consumer affirmatively agrees to the alternative form of compensation.",
    url: `${ECFR}/section-260.7`,
  },
  "260.10": {
    label: "14 CFR 260.10",
    excerpt:
      "the refund must be issued promptly in the original form of payment ... Carriers may not retain a processing fee for issuing refunds that are due.",
    url: `${ECFR}/section-260.10`,
  },
  "399.80(l)": {
    label: "14 CFR 399.80(l)",
    excerpt:
      "Failing to make a prompt refund of airfare (including any taxes and ancillary fees) to a consumer, upon request, for a cancelled flight or a significantly delayed or changed flight if the consumer chooses not to travel or accept compensation in lieu of a refund in situations described in 14 CFR 260.6(a) and (b) when the ticket agent is the merchant of record.",
    url: `${ECFR}/section-399.80#p-399.80(l)`,
  },
  "91-FR-41556": {
    label: "DOT enforcement discretion, 91 FR 41556 (July 7, 2026)",
    excerpt:
      "The Department is extending its discretion to not enforce these requirements for renumbered flights, provided that the passenger is rebooked on a flight with a new number and the flight operates without any \"significant change or delay\" ... expiring on July 7, 2027.",
    url: "https://www.federalregister.gov/documents/2026/07/07/2026-13675/airline-refunds-and-other-consumer-protections",
  },
};

export function cite(clause: ClauseId): Citation {
  return { clause, ...CLAUSES[clause] };
}

export const RENUMBER_DISCRETION_ENDS = "2027-07-07";
