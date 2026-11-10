# Round 2 submission

Form: https://forms.gle/FxUVTm6Z75f121ov5. Due Nov 10, 11:59 p.m. PT. One submission per team. Tarun presses Submit.

## Form answers

| Field | Answer |
|---|---|
| Team name | Soaring |
| Submission path | Technical build: working code and demo |
| Project name | Soaring High |
| GitHub repo link | https://github.com/TarunYadgirkar/BBS-RAMP-Hack (must be public first) |
| Live demo link | Drive, Loom or unlisted YouTube link, 2 to 3 minutes, viewable by anyone with the link |
| Can attend Nov 19 | Team confirms |

Each member fills in their own name and email.

### Architecture answer (200 to 300 words)

> Soaring High joins three records nobody connects: the Ramp card charge, the airline's email, and independent flight-status data. A rules engine then decides whether the airline owes a cash refund under the DOT refund rule (14 CFR 260).
>
> The main choice was to keep the LLM out of the decision. Claude Opus 5.5 only reads messy airline emails into a typed record, using Zod structured outputs. It returns local times, and code does the timezone math. A deterministic TypeScript engine applies the rule, including the 3-hour and 6-hour thresholds, booking-site purchases and the renumbered-flight exclusion. Every decision quotes its deciding clause and points at the charge, the email and the flight record. A finance team can audit that. They can't audit a model's opinion.
>
> Charges and bookings come from Ramp's demo MCP server over OAuth with read-only scopes. The join refuses to guess: a same-airline charge could be wifi, so the memo must name the route. Flight status comes from AeroDataBox behind a cache and a quota guard. With no flight record, the engine makes no claim. Escalation runs in a fixed order (refund request, DOT complaint, dispute package), each behind one admin approval, and a dispute is blocked while a refund is pending. The app is one Next.js project, so the UI imports the engine directly.
>
> Tradeoffs: the refund flow runs on 50 seeded trips, because Ramp's sandbox has no disrupted flights. We wrote those labels ourselves. A second reviewer re-labeled them without seeing the engine, and we report the first-run end-to-end number (96.3% precision, 100% recall) instead of the tuned one. The app drafts and records each step but sends nothing.
>
> With more time: a held-out email set, a real inbox connection, multi-segment itineraries, and writing proof back to the Ramp charge as a receipt.

(297 words.)

### Checklist before Submit

- [ ] Repo is public and opens in a signed-out browser window
- [ ] No API keys in the repo or its history
- [ ] Demo link opens in a signed-out browser window
- [ ] Demo is 2 to 3 minutes
- [ ] Every team member agreed to the submission

## Demo script (2 to 3 minutes)

Before recording: `pnpm build && pnpm start` in `app/`, then press "Reset demo".

| Time | On screen | Say |
|---|---|---|
| 0:00 | Claims board | "When an airline cancels or significantly changes a flight, it owes a cash refund to the original card. Travelers take the credit instead, and the company's money is gone. Soaring High checks every flight on a company's Ramp cards and gets that cash back." |
| 0:20 | Board totals and rows | "These are 50 seeded trips. 22 owe a refund to the company card right now, and 4 disruptions are live. Each row shows what happened and the rule that decides it." |
| 0:35 | Open SFO to ORD, UA 1182 | "United cancelled this flight and offered nothing. The engine cites 14 CFR 260.6(a)(2)(i) and quotes it. This decision comes from a rules engine. Claude only reads the airline's email." |
| 0:55 | Evidence table | "The proof is three records: the Ramp card charge, the airline's email, and an independent flight-status record showing the flight never operated." |
| 1:10 | Read the draft, then approve the refund request | "One approval sends the refund request. The airline has 7 business days." |
| 1:25 | Dispute step shows Blocked | "A dispute is blocked while the refund is pending, so the company can never recover the money twice." |
| 1:35 | Skip 8 business days, approve DOT complaint, approve dispute package | "The deadline passes. Now the DOT complaint unlocks, and after it, the evidence package for Ramp's dispute form." |
| 1:55 | Live disruptions tab, open SFO to NRT | "This one is live. The flight moved 7 hours earlier and the traveler hasn't answered. Soaring High tells them not to accept the credit, because accepting it gives up $1,876." |
| 2:15 | Ramp sandbox tab | "This trip is joined from Ramp's demo sandbox: a real booking matched to its card charge. With no flight record yet, the engine claims nothing." |
| 2:30 | Accuracy page | "On 50 labeled trips with near misses, the engine scores 100% precision and recall. End to end with Claude reading the emails, the first run scored 96.3% precision and 100% recall." |
| 2:45 | Board | "Ramp already catches a hotel price drop after you book. Soaring High catches the airfare refund after the airline cancels." |
