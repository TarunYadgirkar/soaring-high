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

The form asks for a video "introducing your team, explaining the problem, and describing your proposed solution," as a Google Drive, Loom or unlisted YouTube link that anyone with the link can view. The team does its own intros in the first 30 seconds. The script below covers the problem and the solution in about 90 seconds, split by what each person plans to build. The cards are optional full-screen text added in editing.

| Time | Who | Card (optional) | Say |
|---|---|---|---|
| 0:30 | Aadi | **Cancelled, or 3+ hours late = full cash refund to the card that paid.** 14 CFR Part 260 | "Here's the problem. When an airline cancels a flight, or it lands three or more hours late, federal rules say the airline owes a full cash refund to the card that paid. But airlines offer a travel credit instead, and travelers tap Accept. That one tap gives up the company's refund, and the credit lands in the employee's personal airline account, where finance can't use it." |
| 0:52 | Dhruv | **Ramp charge · Airline email · Flight record** | "Nobody catches it because the proof is split three ways. The charge is in Ramp. The cancellation email is in someone's inbox. The flight record is public data. Nobody connects them." |
| 1:03 | Tarun | | "Soaring High connects them. It pulls trips and card charges from Ramp's API, uses Claude to read the airline emails, and checks every flight against real flight-status data. Then a rules engine, not the AI, decides what's owed. Every claim cites the exact clause of the DOT rule and the flight data that proves it, so finance can check every dollar." |
| 1:26 | Aadi | **Hold the credit. Request the refund. Escalate only with approval.** | "When a flight is disrupted, Soaring High tells the traveler to hold off on the credit and requests the refund to the company card. If the airline refuses, it drafts a DOT complaint, then a card dispute. Nothing gets sent until an admin approves it in one click." |
| 1:43 | Dhruv | **Ramp catches a hotel price drop after you book. We catch the airfare refund after the airline cancels.** | "Ramp already catches a hotel price drop after you book. Soaring High catches the airfare refund after the airline cancels." |

About 215 words, which runs about 90 seconds at a natural pace. With 30 seconds of intros the video ends near 2:00, so keep the intros tight. If it runs long, cut "so finance can check every dollar" and "where finance can't use it."

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
