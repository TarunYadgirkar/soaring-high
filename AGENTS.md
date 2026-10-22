# Soaring High: BBS × Ramp hackathon

Context for any agent or teammate working in this repo. Read this first. Keep it current: update **Status**, **Decisions** and **Open questions** at the end of every work session.

## The hackathon

- BBS × Ramp Hackathon (Berkeley Business Society and Ramp). Prompt: "Automate an outdated financial workflow using the newest AI tools."
- Teams of 2–3 UC Berkeley students.
- Draft rubric: 35% technical execution, 25% problem fit, 20% product polish and demo clarity, 10% creativity, 10% presentation.

| Date | What |
|---|---|
| Oct 22, 11:59 p.m. PT | Round 1 due: roster, 150–250 word idea brief, 1–2 min video pitch |
| Oct 28 | Build sprint starts for teams that advance |
| Nov 7 | Round 2 due: working code and a 3–5 min demo (or mockups and briefs) |
| Nov 12 | Finalists announced |
| Nov 19 | Live final for Ramp engineers at Ramp's SF office |

Source files: [inputs/info.pdf](inputs/info.pdf) (info-session deck), [inputs/email.png](inputs/email.png) (announcement email).

## The idea: Soaring High

Project: **Soaring High**. Team: **Soaring**. Technical track (working code and demo).

**Airlines legally owe cash refunds to the original card for cancelled and significantly changed flights. Travelers accept credits instead, so the company's cash is lost. Soaring High finds every refund a company's Ramp cards are owed, proves each one, and gets the cash back.**

How it works:

1. **Join three sources nobody connects:** the Ramp card charge, the airline email in the inbox, and independent flight-status data.
2. **Decide entitlement with a rules engine**, not an LLM opinion. The engine encodes the DOT refund rule, and every claim cites the clause it relies on plus the flight data that proves it. The LLM only reads messy airline emails.
3. **Intervene in real time:** when a disruption happens, tell the traveler not to accept the credit and request the refund to the card. Accepting the credit generally gives up the refund.
4. **Retrieve the cash:** a refund request to the airline (or the ticket seller), then a DOT consumer complaint, then a card dispute. Every step happens only after one-click admin approval.
5. **Measure it:** an eval on about 50 seeded trips, including near misses (2h50m late, voluntary changes, renumbered flights), reporting precision and recall.

The cash comes from the airline or the ticket seller, not from DOT. DOT enforces the rule, and a DOT complaint is an escalation step.

### The rule, verified

- **14 CFR 260.2 ([text](https://www.law.cornell.edu/cfr/text/14/260.2)):** a flight is "significantly delayed or changed" if it departs 3+ hours early or arrives 3+ hours late (6+ for international itineraries), if the departure or arrival airport changes, if connections are added, if the passenger is downgraded, or if accessibility changes for a passenger with a disability. A cancelled flight is a published flight that wasn't operated.
- **14 CFR 260.6 ([text](https://www.law.cornell.edu/cfr/text/14/260.6)):** the carrier owes a full refund (fare, taxes and ancillary fees) when the consumer rejects the changed flight, the rebooking or the credit, or doesn't respond before departure. Credits must be offered as an explicit alternative, with notice of the refund right, and must stay valid for at least 5 years. **Accepting a credit generally forfeits the refund.**
- Refunds go to the original form of payment within 7 business days for card purchases (§260.10).
- Parts of the rule are in statute: 49 U.S.C. 42305, from the FAA Reauthorization Act of 2024.
- **The cause doesn't matter for refunds.** A weather cancellation still owes a refund. The DOT cause-code rule effective Oct 19, 2026 only narrows when airlines owe meals and hotels, which Soaring High doesn't claim.
- **Exclude:** cancelled-and-renumbered flights that operate without a significant change. DOT is not enforcing refunds for those until July 7, 2027 ([Eckert Seamans](https://www.eckertseamans.com/stay-informed/blogs/aviation/enforcement-discretion-extended-as-applied-to-specific-refund-regulations)).
- The US has no cash compensation for delays. DOT withdrew that proposal in Nov 2025.

### Ramp facts, verified

- Ramp's dispute window is 60 days from the statement date. Disputing is a manual form, and the help article mentions no automation ([Ramp Help](https://support.ramp.com/hc/en-us/articles/9325138502547-Disputes-at-Ramp)).
- Ramp's AI flags duplicate subscription charges, but recovery is manual. Ramp has no disputes endpoint in its developer API.
- Ramp developer API sandbox: `demo-api.ramp.com`, pre-seeded transactions, access by request form ([Ramp Help](https://support.ramp.com/hc/en-us/articles/46681939909907-Accessing-the-Developer-API)).

### Ramp Intelligence: what Ramp already ships, and where Soaring High fits

Checked Oct 18, 2026 against [ramp.com/intelligence](https://ramp.com/intelligence) and the [Policy Agent help article](https://support.ramp.com/policy-agent-overview).

- **What it is:** Ramp Intelligence is the AI layer across Ramp's products. Its agents flag fraud, code expenses and invoices, enforce policy (they approve low-risk spend and escalate the rest), answer "is this in policy?" by text, compare software quotes against 85,000+ businesses, pay card-eligible vendors through their payment portals, and collect and match receipts.
- **Closest precedent to Soaring High:** "If the price drops, we'll catch it." Ramp watches booked hotels and rebooks when the price drops by $50 or more. So Ramp already watches a booking after purchase to save money. Soaring High does the same for airfare after an airline cancels or significantly changes a flight.
- **Same trust pattern:** Policy Agent shows its recommendation with its reasoning and the policy text it cites. Soaring High's claims cite the 14 CFR 260 clause and the flight data in the same way, so judges will recognize the pattern.
- **The gap:** the Ramp Intelligence page mentions no refunds, disputes, airline credits or recovering money. Ramp's agents stop bad spend before it happens. Nothing gets money back after an airline owes it.
- **Ramp Travel today** ([Ramp blog FAQ, June 2024](https://ramp.com/blog/10-frequently-asked-questions-about-ramp-travel)): cancelling a standard fare gives an airline credit, fully refundable fares go back to the Ramp card, unused airline credits can't yet be applied in Ramp, and Priceline handles booking support. That FAQ covers cancellations the traveler starts, not airline cancellations that owe a refund under §260.6. **Unverified:** whether Priceline is the merchant of record for Ramp Travel tickets (it decides who owes the refund).
- **Pitch line:** "Ramp Intelligence already catches a hotel price drop after you book. Soaring High catches the airfare refund after the airline cancels."

How Soaring High plugs into Ramp:

| Soaring High step | Ramp piece it uses |
|---|---|
| Find trips and card charges | Developer API or demo MCP (`transactions`, `travel bookings`) |
| Decide and cite entitlement | Our rules engine, in Policy Agent's cite-the-rule format |
| Attach proof to the charge | `receipts upload` / `receipts attach` (refund confirmation, flight-status record) |
| Confirm the money came back | The refund posts to the original Ramp card; match it to the original charge |
| Dispute if refused | Ramp has no disputes API, so the demo uses Stripe Issuing test mode. In production the packet would go into Ramp's dispute form. |

### Ramp tooling (from github.com/ramp-public)

- **Demo MCP server with sample data, no production account needed:** `https://demo-mcp.ramp.com/mcp`. Production is `https://mcp.ramp.com/mcp`. Source: [ramp-public/skills](https://github.com/ramp-public/skills).
- **`ramp` CLI** ([ramp-public/ramp-cli](https://github.com/ramp-public/ramp-cli)) defaults to the sandbox. Install with `brew install ramp-public/ramp/ramp-cli`. Relevant commands: `transactions list|get|trips|memo-suggestions`, `travel list|bookings`, `receipts upload|attach`. Use `--agent` for JSON output.
- **Python SDK** ([ramp-public/ramp-python](https://github.com/ramp-public/ramp-python)) defaults to the sandbox and uses `RAMP_CLIENT_ID` / `RAMP_CLIENT_SECRET`. It isn't on PyPI yet, so install it from the repo.
- **Older MCP server** ([ramp-public/ramp_mcp](https://github.com/ramp-public/ramp_mcp)) has `load_transactions` (`transactions:read`) with `RAMP_ENV=demo`.
- **Agent skills catalog:** [ramp-public/skills](https://github.com/ramp-public/skills). `npx skills add ramp-public/skills`.
- **Sandbox access docs:** https://docs.ramp.com/developer-api/v1/sandbox-access
- **Open:** trips booked through Ramp Travel (`travel bookings`) may give flight numbers directly with no email parsing. Check what the sandbox returns. Also check who is the merchant of record for Ramp Travel tickets, since that decides who owes the refund.

### Build stack (planned)

- **Ramp sandbox API / demo MCP** for trips and card transactions.
- **Claude** for reading airline emails into structured trip records.
- **A flight-status API** for independent proof. FlightAware AeroAPI has historical data; compare cost and free tiers before choosing.
- **Stripe Issuing test mode** for the dispute step. It can create test cards, authorizations and disputes with evidence, and forcing `winning_evidence` or `losing_evidence` settles the outcome in seconds ([docs](https://docs.stripe.com/issuing/purchases/disputes/how-to-submit)).
- **A seeded Gmail test account** as the inbox.

## Risks and how we answer them

Researched Oct 18, 2026. Not legal advice.

**Product**

- **Business travelers usually fly the rebooked flight.** Flying it counts as accepting the alternative, so no refund is owed. The refunds we can claim are narrower: the trip is called off, the traveler switches to another airline, or the change is significant and the traveler doesn't fly. Put these cases in the 50 seeded trips.
- **The 2024 rule already makes many refunds automatic** when the traveler doesn't respond, so the unclaimed pool is smaller than it looks. The main value is the real-time "don't accept the credit" alert. Recovering past refunds is secondary.
- **Consumer competitors** (add to the AirHelp answer): [Service](https://www.producthunt.com/p/service/service-6) scans a personal inbox and files delay claims, mostly for vouchers or miles. [Gyro Autopilot](https://toolradar.com/tools/gyro-autopilot) claims EU261 and US DOT compensation for a 30% fee. Neither mentions company cards or company-paid travel.

**Law and compliance**

- **No double recovery.** Airlines name chargebacks filed while a refund is pending as a top concern ([Chargebacks911](https://chargebacks911.com/airline-chargeback-data/), vendor survey). Rule for the build: never prepare a dispute while a refund is pending, and log the refund request first.
- **Inbox access.** Travelers opt in, and Soaring High reads only messages from airline senders and stores nothing else. California's privacy law covers employee data, so a company needs a notice at collection ([Baker McKenzie](https://insightplus.bakermckenzie.com/bm/data-technology/united-states-employers-must-prepare-now-for-new-california-employee-privacy-rights)). Airline emails often go to personal inboxes, which the company has no right to read without consent.
- **Gmail access in production.** Unverified: Gmail's read-only access is a Google "restricted" scope, which needs app verification and a yearly security assessment. Fine for the demo. Have an answer ready.
- **Act through email and official refund forms**, not bots on airline websites, which airline terms usually prohibit.
- **If a voice call ever comes back,** the agent must say it is an AI.

**Ethics**

- Some travelers keep credits in personal airline accounts and use them for personal trips. Present Soaring High as helping travelers protect company money, with the traveler copied on everything, not as monitoring them.
- Soaring High alerts and recommends. It never moves or redeems a credit in the traveler's name.

**Patents and IP**

- A light search found no patent on this workflow. "Match records, apply rules, file claims" is hard to patent under *Alice*, which also means we couldn't easily patent it.
- The Round 1 video is a public disclosure: one-year US grace period to file a patent, none in most other countries.
- Unverified: the hackathon's terms on IP ownership. Check before treating Soaring High as a startup.

## Why this idea (the research)

Everyone asks Claude for hackathon ideas, so we simulated 2,500 Claude sessions (Opus 5.5 and Fable 5.1, 40 student-style prompts, with the email and deck attached) and mapped 11,573 ideas onto 143 finance workflows.

- **Crowded:** auditor document requests (55% of sessions), invoice-vs-contract audit (38%), accruals (35%), expense policy (25%), cash application (22%), vendor fraud (21%). 54% of ideas mainly "read documents."
- **Airline refunds:** 0.1% of replies mention them. Disputes in any form: 3.9%.
- **Shortlist:** six uncrowded ideas were researched by separate agents, then judged by panels of simulated Ramp engineers in shuffled order:
  - Panel 4 (final): the airline-first version won 20 of 20, with problem fit 8.0/10.
  - Earlier panels ruled out lien waivers (Ramp already AI-checks waivers), tariff refunds (would need synthetic customs data, crowded by funded startups), unclaimed property (good backup: Ramp voids checks after 180 days) and state registrations.
- **Dashboard:** "Ramp idea crowding" is a private claude.ai artifact owned by Tarun. Ask him to share it.

## Repo map

Repo: https://github.com/TarunYadgirkar/BBS-RAMP-Hack (private). Default branch `main`.

| Path | What |
|---|---|
| [round1-brief.md](round1-brief.md) | Round 1 brief (paste-ready), video script, pre-submission checklist |
| [sim/prompts.py](sim/prompts.py) | Simulated student prompts and the session mix |
| [sim/generate.py](sim/generate.py) | Submit and collect simulation batches; `status`, `probe`, `spend` commands; budget guard |
| [sim/extract.py](sim/extract.py) | Haiku pulls each reply's top 5 ideas and labels workflow and AI method |
| [sim/taxonomy.py](sim/taxonomy.py) | The 143 reference finance workflows and 14 AI methods |
| [sim/report.py](sim/report.py) | Prints the distribution and white space |
| [sim/export.py](sim/export.py) | Writes the dashboard CSVs to `data/dashboard/` |
| [sim/judge.py](sim/judge.py) | Simulated judge panel; `VERSION` and `PITCHES` select the round |
| `data/` | Simulation responses, extracted ideas, judge results, spend ledger |
| [assets/generated/dashboard/](assets/generated/dashboard/) | Source of the dashboard page |

Running the scripts needs [uv](https://docs.astral.sh/uv/) and your own Anthropic API key in a `.env` file (copy `.env.example`). Run them from the repo root, for example `uv run sim/report.py --tags pilot full`. Every script that calls the API spends real money; check `uv run sim/generate.py spend` first.

## Status

- [x] Simulation, dashboard and idea selection
- [x] Round 1 brief and video script drafted
- [x] Rewrite the video script so it can be recorded before anything is built (two people on camera, four text cards, no made-up numbers)
- [x] Record the video (script and recording checklist in round1-brief.md)
- [x] Edit the video: Remotion project in `video/` (split-flap title, lower thirds, word captions, timed callouts). Render with `pnpm render` in `video/`; source clips and renders are gitignored, output copied to `assets/generated/video/`
- [ ] Upload the video (Drive, Loom or unlisted YouTube, anyone with the link) and paste the link into the form
- [ ] Submit Round 1 by Oct 22, 11:59 p.m. PT: https://forms.gle/oEb9ZhXFterxfr9d6
- [ ] Request Ramp developer API sandbox access now; it may take days. The demo MCP server works without it.
- [ ] After Oct 22: remove `inputs/` from history, then make the repo public
- [ ] Pick a flight-status API
- [ ] Plan the build sprint (Oct 28 – Nov 7)

## Decisions

- Names: project **Soaring High**, team **Soaring** (chosen by the team, Oct 21). Earlier working names "Owed", "Part 260" and "Soaring Away" were dropped.
- Submit in the **technical** track. The rules engine, data join and eval are the differentiators, and technical execution is 35% of the score.
- Keep the repo **private until Round 1 closes (Oct 22)** so other teams can't copy the idea. Then make it public and remove `inputs/` (the organizers' deck and email) first, including from git history.
- Lead with airline refunds. SaaS renewals after cancellation and duplicate charges are secondary detectors.
- Entitlement comes from a rules engine with cited clauses, not an LLM judgment.
- No voice call in the core pitch. It read as a gimmick.
- Escalation order: refund request, then DOT complaint, then card dispute, each behind admin approval.
- Don't present made-up results as real. Every number on a slide needs a source or a measurement.

## Open questions

- Tickets bought through a travel agency or booking site may refund through that seller rather than the airline. How does Soaring High handle each case?
- DOT's "Refund III" may narrow the definition of a cancelled flight. Recheck before the Nov 19 final.
- Can Soaring High act for the company when the ticket is in an employee's name? Who files the DOT complaint?
- Which flight-status API, and what does historical data cost?
- How do we get Ramp sandbox access as students?
- "Isn't this AirHelp?" Answer: AirHelp claims EU compensation for individual travelers; Soaring High claims US cash refunds owed to the company, found from card data. The same answer covers Service and Gyro Autopilot.
- "Doesn't Ramp already do this?" Answer: Ramp Intelligence prevents bad spend and catches hotel price drops, but nothing in Ramp recovers money an airline owes (see **Ramp Intelligence** above).
- How many corporate trips are called off or rebooked on another airline, rather than flown on the rebooked flight? That is the real size of the refund pool.
- Should the brief mention Ramp Intelligence? It is at 248 of 250 words, so a line would have to replace one.

## Writing rules for copy (brief, slides, UI)

- No em dashes. Use a comma, a period or parentheses.
- Specific beats clever. Every sentence has a subject and a verb.
- Label vendor estimates as estimates (for example "5–10% of corporate air spend" comes from Corporate Traveler and Navan).

## Ongoing

_Use this section for handoffs: who is working on what, what's in flight, blockers, next steps._

### Work split (proposed, owners not yet assigned)

Put your name next to a part to claim it.

| Part | Owner | Owns | Round 1 job (by Oct 22) | Build sprint (Oct 28 – Nov 7) |
|---|---|---|---|---|
| 1. Data | _open_ | Ramp sandbox and demo MCP, a seeded Gmail inbox, Claude reading airline emails into trip records, the flight-status API | Request Ramp sandbox access today (it may take days). Pick the flight-status API. | Card charge, email and flight record joined into one trip |
| 2. Rules engine | _open_ | The 14 CFR 260 rules engine with cited clauses, and the eval on 50 seeded trips | Write the seeded trip cases, including near misses, rebooked flights and renumbered flights | The engine, plus precision and recall numbers to replace the placeholders in the video |
| 3. Product and pitch | _open_ | Traveler alert, claim cards, admin approval screen, the escalation flow (refund request, DOT complaint, Stripe test-mode dispute), and the pitch | Record the video, fill in the roster, submit the form | UI, demo script and Q&A prep for the live final |

- Oct 18 (Claude, session for siddrrsh): added **Ramp Intelligence** and **Risks** sections and Q&A answers. The brief text is unchanged. Next: decide whether a Ramp Intelligence line should replace one in the brief, and add rebooked-flight cases to the seeded trips.
