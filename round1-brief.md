# Soaring High: Round 1 application

Project: Soaring High. Team: Soaring. Track: technical (working code and demo).

## Idea brief

**Soaring High finds airline refunds your company card is owed and proves each one.**

When a flight bought on a company card is cancelled, or arrives three or more hours late, the US DOT refund rule (14 CFR Part 260) gives the buyer a right to a full cash refund to that card. The moment a traveler accepts the airline's travel credit instead, the company's cash refund is gone, and the credit sits in that traveler's personal airline account. Other refunds are owed automatically and still go unclaimed: tickets for disrupted flights the traveler never responded to, fees for significantly delayed bags, and paid seats or Wi-Fi that were never provided. Nobody connects the card charge, airline email and flight record.

Soaring High joins all three. It pulls trips and card transactions from Ramp's API, reads airline emails, and checks each flight against independent flight-status data. A rules engine encodes the DOT thresholds, so each claim cites the exact clause it relies on and the flight data that proves it. When a disruption happens, it tells the traveler to hold off on the credit and requests the refund to the card. For past trips it claims refunds already owed. If an airline refuses, it escalates to a DOT complaint and then a card dispute, each with evidence attached and one-click admin approval.

We will build on Ramp's sandbox API and MCP server, Claude, a flight-status API and Stripe Issuing test-mode disputes, and measure accuracy on 50 seeded trips.

## What the form asks (read Oct 21)

Five pages. Required unless marked optional.

1. **Email** (the Google account you're signed in with).
2. **Team:** team name, then for each of 2 members: full name, email, school, major and graduation year, planned contribution (short answer) and a **resume upload**. Member 3 is optional.
3. **Project:** project name; path (pick "Technical build: working code and demo"); which financial workflow (short answer); the 150–250 word brief, answering "the outdated workflow, why it matters, your proposed solution, and how AI would improve it"; which AI tools or capabilities.
4. **Video:** a link (Google Drive, Loom or unlisted YouTube) that anyone with the link can view.
5. **Availability:** Yes/No for Round 2 (Oct 28 – Nov 7) and for the Nov 19 evening final in SF; tick all three team-confirmation boxes; optional "anything else."

## Other form answers

**Workflow area:** Expense management and payments: recovering cash refunds that airlines owe on corporate card travel spend, including card disputes when an airline refuses.

**How we use AI tools:** Claude reads messy airline emails and receipts into structured trip records and drafts refund requests and DOT complaints. A Claude agent works with Ramp's data through Ramp's MCP server and developer API, pulling card transactions and travel bookings. A deterministic rules engine handles the legal decision, so the AI extracts and drafts but doesn't decide entitlement. Flight-status data supplies independent proof. Stripe Issuing test mode handles card disputes, and an evaluation harness measures precision and recall on seeded trips.

## Video pitch (recordable today, about 1:45)

The form asks for a video "introducing your team, explaining the problem, and describing your proposed solution," as a Google Drive, Loom or unlisted YouTube link that anyone with the link can view. Nothing is built yet, so this version needs no product screens: two people on camera, plus four text cards added in editing (CapCut, iMovie or Canva). Speaker A and Speaker B are whoever is on camera; fill in the brackets.

| Time | Who | On screen | Say |
|---|---|---|---|
| 0:00 | A | A to camera, holding a phone | "Your coworker's flight just got cancelled. The airline offers a travel credit. They tap Accept, and your company's cash refund is gone for good." |
| 0:10 | All three | All on camera, name captions | Tarun: "I'm Tarun, [major]." Aadi: "I'm Aadi, [major]." Dhruv: "I'm Dhruv, [major]. We're team Soaring from Berkeley." |
| 0:18 | B | Card 1: **Cancelled, or 3+ hours late = full cash refund to the card that paid.** 14 CFR Part 260 | "That money belonged to the company. Under federal rules, a cancelled or badly delayed flight owes a full cash refund to the card that paid for it. Accept the credit and the refund is gone, and the credit sits in the traveler's personal airline account." |
| 0:36 | A | Card 2: three boxes, **Ramp charge · Airline email · Flight record** | "Nobody catches this because the proof lives in three places. The charge is in Ramp. The cancellation email is in someone's inbox. The flight record is public data. Nobody puts them together." |
| 0:50 | B | B to camera | "We're building Soaring High to do that. It pulls trips and card charges from Ramp's API, reads the airline email with Claude, and checks the flight against real flight-status data. A rules engine decides what's owed, not a chatbot guess, and every claim cites the exact clause and the flight data behind it." |
| 1:10 | A | Card 3: **Hold the credit. Request the refund. Escalate only with approval.** | "When a flight gets cancelled, it tells the traveler to hold off on the credit and requests the refund to the card. If the airline refuses, it drafts a DOT complaint, then a card dispute, each with the evidence attached and one click of admin approval." |
| 1:28 | B | Card 4: **Ramp catches a hotel price drop after you book. We catch the airfare refund after the airline cancels.** | "Ramp already catches a hotel price drop after you book. Soaring High catches the airfare refund after the airline cancels." |
| 1:36 | A and B | Both on camera | "We'll build it on Ramp's sandbox and measure its accuracy on fifty test trips. Thanks for watching." |

About 260 words. At a natural pace that lands between 1:45 and 1:55. If it runs over 2:00, cut the second sentence of the 0:18 beat first.

### Recording checklist

- Landscape, phone at eye level, window light on your faces, a quiet room. Do one take per beat; cuts between beats are fine.
- Read from a laptop placed just behind the phone. Talk slower than feels natural.
- Add the four cards as full-screen text in editing. Black text on white is fine.
- Watch the cut once with the sound off. Each card should make sense on its own.
- Export at 1080p, check the length is under 2:00, and upload where the form asks (if it wants a link, use YouTube "Unlisted" or a Google Drive link set to "Anyone with the link").

## Check before submitting

- The DOT refund rule (Part 260) still stands, and parts of it are written into statute at 49 U.S.C. 42305 by the FAA Reauthorization Act of 2024, so rescinding those parts would take Congress. Confirm the day you submit.
- Refunds don't depend on who caused the disruption. A weather cancellation still owes a refund. The DOT cause-code rule effective Oct 19, 2026 narrows when airlines owe meals and hotels, but those come from voluntary airline commitments and don't affect refunds. Soaring High doesn't claim meals or hotels.
- DOT is not enforcing refunds for cancelled-and-renumbered flights that still operate without a significant change, until July 7, 2027. Exclude those cases from the rules engine.
- DOT has been drafting "Refund III" to narrow the definition of a cancelled flight. No final rule has been found. Recheck before the final on Nov 19.
- The US has no cash compensation for delays. DOT withdrew that proposal in Nov 2025, so Soaring High only claims refunds of what was paid.
- The rule's thresholds come from 14 CFR 260.2: arrival 3+ hours late for domestic itineraries, 6+ for international, a changed airport, added connections or a downgrade. https://www.law.cornell.edu/cfr/text/14/260.2
- A refund is owed when the traveler declines the rebooking or credit, or doesn't respond before departure. Accepting a credit generally gives up the refund. https://www.law.cornell.edu/cfr/text/14/260.6
- The rule binds the airline when it is the merchant of record. A ticket bought through a travel agency or a booking site may refund through that seller instead.
- Expect "isn't this AirHelp?" AirHelp claims EU compensation for individual travelers. Soaring High claims US cash refunds owed to the company, found from card data. Service and Gyro Autopilot get the same answer.
- Expect "doesn't Ramp already do this?" Ramp Intelligence catches fraud, codes spend and rebooks hotels when the price drops, but it doesn't recover money an airline owes. Line: "Ramp Intelligence already catches a hotel price drop after you book. Soaring High catches the airfare refund after the airline cancels." Details in AGENTS.md.
- Expect "most travelers just fly the rebooked flight." That's true, and flying it means no refund. Soaring High targets trips that get called off or rebooked on another airline, and the alert stops a credit from being accepted.
- Never file a card dispute while a refund is pending. Double recovery is the first thing a payments engineer will ask about.
- Ramp's dispute window is 60 days from the statement date: https://support.ramp.com/hc/en-us/articles/9325138502547-Disputes-at-Ramp
