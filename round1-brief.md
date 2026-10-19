# Part 260: Round 1 application

Team: Middle Seat. Track: technical (working code and demo).

## Idea brief

**Part 260 finds airline refunds your company card is owed and proves each one.**

When a flight bought on a company card is cancelled, or arrives three or more hours late, the US DOT refund rule (14 CFR Part 260) gives the buyer a right to a full cash refund to that card. The moment a traveler accepts the airline's travel credit instead, the company's cash refund is gone, and the credit sits in that traveler's personal airline account. Other refunds are owed automatically and still go unclaimed: tickets for disrupted flights the traveler never responded to, fees for significantly delayed bags, and paid seats or Wi-Fi that were never provided. Nobody connects the card charge, airline email and flight record.

Part 260 joins all three. It pulls trips and card transactions from Ramp's API, reads airline emails, and checks each flight against independent flight-status data. A rules engine encodes the DOT thresholds, so each claim cites the exact clause it relies on and the flight data that proves it. When a disruption happens, it tells the traveler to hold off on the credit and requests the refund to the card. For past trips it claims refunds already owed. If an airline refuses, it escalates to a DOT complaint and then a card dispute, each with evidence attached and one-click admin approval.

We will build on Ramp's sandbox API and MCP server, Claude, a flight-status API and Stripe Issuing test-mode disputes, and measure accuracy on 50 seeded trips.

## Video pitch (about 100 seconds)

| Time | On screen | Voiceover |
|---|---|---|
| 0:00 | A traveler's phone: "Your flight UA 1482 has been cancelled. Accept a $612 travel credit?" The thumb hovers over Accept. | "Your traveler's flight just got cancelled. The airline is offering a credit. One tap, and your company's $612 cash refund is gone." |
| 0:12 | Text: "14 CFR 260: cancelled or 3+ hours late means a full refund to the original card." | "Federal rules say that money belongs back on your company card. Almost nobody claims it, because the proof is scattered." |
| 0:25 | Three panels appear side by side: the Ramp charge, the airline email, a flight-status record showing CANCELLED. | "The charge is in Ramp. The cancellation is in an inbox. The flight record is public. Nobody puts them together." |
| 0:38 | Part 260's alert on the traveler's phone: "Don't accept the credit. You're owed a refund. We've requested it." | "Part 260 does. It catches the disruption as it happens and asks for the refund before the credit gets accepted." |
| 0:52 | A claim card: amount, flight, the cited clause, the flight-data proof. | "Every claim cites the exact rule and the flight data behind it, so you can check every dollar." |
| 1:05 | The board for past trips: "$9,840 owed across 19 trips." Then an eval panel: "50 seeded trips, 18 of 19 owed found, 1 false positive." | "It also finds refunds you're already owed, and we measure how often it's right." |
| 1:20 | A refused claim turning into a dispute packet; the admin clicks Approve. Then the team on camera. | "If an airline says no, Part 260 prepares the dispute for your approval. We're Middle Seat, and we're building Part 260 on Ramp's API." |

The board and eval numbers in the 1:05 beat are placeholders. Replace them with the real results from the build, or cut that beat for Round 1.

## Check before submitting

- The DOT refund rule (Part 260) still stands, and parts of it are written into statute at 49 U.S.C. 42305 by the FAA Reauthorization Act of 2024, so rescinding those parts would take Congress. Confirm the day you submit.
- Refunds don't depend on who caused the disruption. A weather cancellation still owes a refund. The DOT cause-code rule effective Oct 19, 2026 narrows when airlines owe meals and hotels, but those come from voluntary airline commitments and don't affect refunds. Part 260 doesn't claim meals or hotels.
- DOT is not enforcing refunds for cancelled-and-renumbered flights that still operate without a significant change, until July 7, 2027. Exclude those cases from the rules engine.
- DOT has been drafting "Refund III" to narrow the definition of a cancelled flight. No final rule has been found. Recheck before the final on Nov 19.
- The US has no cash compensation for delays. DOT withdrew that proposal in Nov 2025, so Part 260 only claims refunds of what was paid.
- The rule's thresholds come from 14 CFR 260.2: arrival 3+ hours late for domestic itineraries, 6+ for international, a changed airport, added connections or a downgrade. https://www.law.cornell.edu/cfr/text/14/260.2
- A refund is owed when the traveler declines the rebooking or credit, or doesn't respond before departure. Accepting a credit generally gives up the refund. https://www.law.cornell.edu/cfr/text/14/260.6
- The rule binds the airline when it is the merchant of record. A ticket bought through a travel agency or a booking site may refund through that seller instead.
- Expect "isn't this AirHelp?" AirHelp claims EU compensation for individual travelers. Part 260 claims US cash refunds owed to the company, found from card data. Service and Gyro Autopilot get the same answer.
- Expect "doesn't Ramp already do this?" Ramp Intelligence catches fraud, codes spend and rebooks hotels when the price drops, but it doesn't recover money an airline owes. Line: "Ramp Intelligence already catches a hotel price drop after you book. Part 260 catches the airfare refund after the airline cancels." Details in AGENTS.md.
- Expect "most travelers just fly the rebooked flight." That's true, and flying it means no refund. Part 260 targets trips that get called off or rebooked on another airline, and the alert stops a credit from being accepted.
- Never file a card dispute while a refund is pending. Double recovery is the first thing a payments engineer will ask about.
- Ramp's dispute window is 60 days from the statement date: https://support.ramp.com/hc/en-us/articles/9325138502547-Disputes-at-Ramp
