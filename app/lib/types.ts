// Subset of an item from Ramp's agent-tools `get-transactions` response
// (ramp-public/ramp-cli specs/agent-tool.json). Ramp returns amount as a string.
export type RampTransaction = {
  transaction_uuid: string;
  amount: string;
  merchant_name: string;
  merchant_category: string;
  state: "CLEARED" | "PENDING";
  transaction_time: string;
  spent_by_user: string;
  card: {
    card_uuid: string;
    display_name: string;
    last_four: string;
    card_state: "ACTIVE";
    is_physical_card: boolean;
  };
  trip_uuid: string | null;
  trip_name: string | null;
};

export type AirlineEmail = {
  id: string;
  from: string;
  to: string;
  subject: string;
  received_at: string;
  body: string;
};

export type FlightStatusState = "scheduled" | "delayed" | "active" | "landed" | "cancelled" | "diverted";

// Normalized record from a flight-status provider. Times are ISO 8601 with offset.
export type FlightStatus = {
  id: string;
  flight_number: string;
  date: string;
  origin: string;
  destination: string;
  status: FlightStatusState;
  scheduled_departure: string;
  scheduled_arrival: string;
  estimated_departure: string | null;
  estimated_arrival: string | null;
  actual_departure: string | null;
  actual_arrival: string | null;
  actual_destination: string | null;
  provider: "seed" | "aerodatabox";
};

export type Cabin = "economy" | "premium_economy" | "business" | "first";

export type Segment = {
  flight_number: string;
  origin: string;
  destination: string;
  departure: string;
  arrival: string;
  cabin: Cabin;
};

export type ChangeKind = "cancellation" | "schedule_change" | "delay" | "renumbering" | "voluntary";

// What the airline told the traveler, as read from the email.
export type Change = {
  kind: ChangeKind;
  initiated_by: "carrier" | "traveler";
  notified_at: string;
  email_id: string;
  new_itinerary: Segment[] | null;
  alternative_offered: boolean;
  credit_offered: boolean;
  credit_issued: boolean;
};

export type ResponseAction =
  | "none"
  | "flew"
  | "accepted_rebooking"
  | "accepted_credit"
  | "rejected"
  | "booked_other_carrier";

export type TravelerResponse = {
  action: ResponseAction;
  at: string | null;
  source: "email" | "traveler_reply" | "card" | "none";
  ref: string | null;
};

// Structured trip record. In the seed these are gold labels; in piece 3 Claude
// extracts them from the emails and the eval compares the two.
export type TripFacts = {
  record_locator: string;
  ticket_charge_id: string;
  ancillary_charge_ids: string[];
  service_fee_charge_ids: string[];
  original: Segment[];
  change: Change | null;
  response: TravelerResponse;
};

export type Trip = {
  id: string;
  traveler: string;
  charges: RampTransaction[];
  emails: AirlineEmail[];
  flight_status: FlightStatus[];
  facts: TripFacts;
};

export type Verdict = "refund_owed" | "hold_credit_alert" | "not_owed" | "excluded" | "needs_info";

export type ClauseId =
  | "260.2/cancelled-flight"
  | "260.2/significant-change"
  | "260.2/covered-flight"
  | "260.2/prompt-refund"
  | "260.6(a)(1)"
  | "260.6(a)(1)(i)"
  | "260.6(a)(1)(ii)"
  | "260.6(a)(2)(i)"
  | "260.6(a)(2)(ii)"
  | "260.6(a)(2)(iii)(A)"
  | "260.6(a)(2)(iii)(B)"
  | "260.6(c)"
  | "260.7"
  | "260.10"
  | "399.80(l)"
  | "91-FR-41556";

export type Citation = {
  clause: ClauseId;
  label: string;
  excerpt: string;
  url: string;
};

export type ProofSource = "flight_status" | "email" | "card" | "traveler";

export type Proof = {
  source: ProofSource;
  ref: string;
  field: string;
  value: string;
  note: string;
};

export type TriggerKind =
  | "cancelled"
  | "depart_early"
  | "arrive_late"
  | "airport_change"
  | "more_connections"
  | "downgrade";

export type Trigger = {
  kind: TriggerKind;
  clause: ClauseId;
  detail: string;
};

export type Payee = {
  kind: "carrier" | "ticket_agent" | "unknown";
  name: string;
  clause: ClauseId | null;
};

export type Decision = {
  trip_id: string;
  verdict: Verdict;
  basis: ClauseId | null;
  reason: string;
  triggers: Trigger[];
  citations: Citation[];
  proof: Proof[];
  payee: Payee | null;
  amount_cents: number | null;
  refund_due_by: string | null;
  overdue: boolean;
};
