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
| Nov 10, 11:59 p.m. PT | Round 2 due (moved from Nov 7 per the Oct 29 email from BBS), submitted at https://forms.gle/FxUVTm6Z75f121ov5. The form (read Nov 10) asks for: a **public** GitHub repo with no API keys, a demo video link of **2 to 3 minutes** (Drive, Loom or unlisted YouTube, viewable without signing in), and a 200 to 300 word architecture answer. Answers and demo script are in [round2-submission.md](round2-submission.md) |
| Nov 12 | Finalists announced |
| Nov 19 | Live final for Ramp engineers at Ramp's SF office |

Source files: the info-session deck and the announcement email from BBS. They are the organizers' material, so they were removed from this repo and its history on Nov 10 before it went public. Tarun has copies.

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
- Refunds go to the original form of payment with no processing fee (§260.10). The 7-business-day deadline for card purchases is in the **"Prompt refund" definition in §260.2**, counted from the date the refund became due under §260.6(a)(2), not in §260.10. (Checked against eCFR text current to Oct 21, 2026.)
- **§260.7:** a carrier can't treat a traveler as having accepted a credit unless the traveler affirmatively agrees. A credit the airline drops into the account on its own does not forfeit the refund.
- **Booking sites ([14 CFR 399.80(l)](https://www.ecfr.gov/current/title-14/section-399.80#p-399.80(l))):** when a ticket agent is the merchant of record, the ticket agent owes the refund, **upon request**, within 7 business days of hearing from the carrier (§260.6(d)–(e)). It may keep a disclosed per-passenger service fee. The merchant of record is whoever appears on the card statement, so the Ramp charge's merchant tells Soaring High who to ask.
- Thresholds include the boundary: "three hours or more" (domestic) and "six or more" (international). 3h00m counts; 2h59m doesn't.
- Covered flights are to, from or within the US (§260.2). A London to Paris flight on a company card is out of scope.
- Parts of the rule are in statute: 49 U.S.C. 42305, from the FAA Reauthorization Act of 2024.
- **The cause doesn't matter for refunds.** A weather cancellation still owes a refund. The DOT cause-code rule effective Oct 19, 2026 only narrows when airlines owe meals and hotels, which Soaring High doesn't claim.
- **Exclude:** cancelled-and-renumbered flights that operate without a significant change. DOT is not enforcing refunds for those until July 7, 2027. Primary source: [91 FR 41556, FR Doc. 2026-13675 (July 7, 2026)](https://www.federalregister.gov/documents/2026/07/07/2026-13675/airline-refunds-and-other-consumer-protections); summary by [Eckert Seamans](https://www.eckertseamans.com/stay-informed/blogs/aviation/enforcement-discretion-extended-as-applied-to-specific-refund-regulations). The discretion covers only renumbered flights with no significant change or delay.
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
| Dispute if refused | Ramp has no disputes API. The demo prepares the evidence package for Ramp's dispute form; Stripe Issuing test mode needs sales approval (Oct 30). |

### Ramp tooling (from github.com/ramp-public)

- **Demo MCP server with sample data:** `https://demo-mcp.ramp.com/mcp`. Checked Oct 22: it returns 401 without a bearer token and advertises OAuth (PKCE, authorize at `demo-mcp.ramp.com/oauth/authorize?auth_level=auto`, token at `demo-api.ramp.com/developer/v1/token/pkce`). Unverified whether the login needs a Ramp account. The response schemas (`get-transactions`, `get-bookings`) are public in [ramp-cli specs/agent-tool.json](https://github.com/ramp-public/ramp-cli/blob/main/src/ramp_cli/specs/agent-tool.json); the seeded charges mirror them. Production is `https://mcp.ramp.com/mcp`. Source: [ramp-public/skills](https://github.com/ramp-public/skills).
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

Repo: https://github.com/TarunYadgirkar/soaring-high (public since Nov 10). Default branch `main`. The old private repo `BBS-RAMP-Hack` is a frozen archive: GitHub still serves its pre-scrub commits by hash, so it stays private. Do not push there.

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
| [app/](app/) | The product: Next.js 16, TypeScript strict, Tailwind, pnpm. Node 22 (`app/.nvmrc`; pnpm 11 fails on node 20) |
| [app/lib/types.ts](app/lib/types.ts) | Trip record: Ramp-shaped charges, airline emails, flight-status records, structured facts, and the engine's `Decision` |
| [app/lib/rules/](app/lib/rules/) | The 14 CFR 260 rules engine (`engine.ts`), verbatim clause excerpts (`clauses.ts`), business days and federal holidays (`dates.ts`), unit tests |
| [app/data/seed/](app/data/seed/) | The 50 seeded trips: case specs and labels (`cases.ts`), generator (`build.ts`), output (`trips.json`) |
| [app/lib/ramp/](app/lib/ramp/) | Ramp demo MCP client and OAuth provider |
| [app/lib/extract/](app/lib/extract/) | Claude email extraction: schema, call, merge into a trip, field comparison |
| [app/lib/eval/score.ts](app/lib/eval/score.ts) | Shared precision, recall and report for both evals |
| [app/scripts/](app/scripts/) | `pnpm seed` regenerates `trips.json`; `pnpm eval` prints precision and recall and writes `app/data/eval/latest.json` |

In `app/`: `pnpm install`, then `pnpm test`, `pnpm seed`, `pnpm eval`, `pnpm typecheck`. None of these call a paid API. `pnpm ramp:login` logs in to the Ramp demo MCP. `pnpm extract [--model M] [--limit N] [--max-usd 2]` calls the Anthropic API (costs money; reads `app/.env`), then `pnpm eval:e2e` scores the extracted facts.

Running the `sim/` scripts needs [uv](https://docs.astral.sh/uv/) and your own Anthropic API key in a `.env` file (copy `.env.example`). Run them from the repo root, for example `uv run sim/report.py --tags pilot full`. Every script that calls the API spends real money; check `uv run sim/generate.py spend` first.

## Status

- [x] Simulation, dashboard and idea selection
- [x] Round 1 brief and video script drafted
- [x] Rewrite the video script so it can be recorded before anything is built (two people on camera, four text cards, no made-up numbers)
- [x] Record the video (script and recording checklist in round1-brief.md)
- [x] Edit the video: Remotion project in `video/` (split-flap title, lower thirds, word captions, timed callouts). Render with `pnpm render` in `video/`; source clips and renders are gitignored, output copied to `assets/generated/video/`
- [x] Upload the video (Drive, anyone with the link) and paste the link into the form
- [x] Form checked page by page on Oct 21; ready to submit
- [x] Submit Round 1. Soaring advanced to the build round (email from the BBS organizers, Oct 29)
- [x] Request Ramp developer API sandbox access: submitted Oct 29 under Tarun's Berkeley email (sandbox "Soaring High (BBS x Ramp Hackathon)"); Ramp says it goes live by email. Reply sent to the BBS organizers asking for help getting it approved. The demo MCP login needs a Ramp account email, so use the sandbox login once it arrives
- [x] Ramp demo MCP connected Oct 29 (`pnpm ramp:login`; Tarun approved in his Chrome and the one-time code was relayed to the build machine). 132 tools. `pnpm exec tsx scripts/ramp-probe.ts` saves samples to `app/data/ramp/sample-*.json` (gitignored)
  - What the sandbox returns, compared with the seeds:
    - Amounts are display strings (`"$1,446.13"`, `"-$259.49"`). `toCents` now parses them and the seeds use the same format.
    - Airlines are `merchant_category: "Airlines"`.
    - Booking sites such as Egencia sit in `"Travel Misc"` alongside Amtrak and Enterprise, so the engine identifies them by merchant name. The seeds now use "Travel Misc".
    - Demo charges have `trip_uuid: null`, so charges and bookings don't join directly.
  - Bookings: `ramp_get_bookings` returns `flight_booking_id`, flight number, airline, airports, times, cabin, trip, and `slices[]`. Slices include `is_refundable`, `fare_name` and `number_of_stops`. The sandbox has 4 flight bookings (AC 1521, UA 8565, AA 6020, B6 2153).
  - `ramp_booking_cancellation_details` says Ramp Travel bookings are "managed by Duffel, Ramp's travel partner". Unverified: whether Duffel, the airline or Ramp is the merchant of record on the card. That decides who owes the refund.
- [x] Sandbox join (`pnpm ramp:sync`, logic in `app/lib/ramp/join.ts`, tested on a trimmed fixture of the sandbox responses):
  - Pulls all business transactions (paginated) and the acting user's flight bookings.
  - Matches a booking to an "Airlines" charge from the same airline, within 60 days before departure up to departure day. The charge memo must name the route or the destination city; a same-airline charge alone could be wifi or a bag fee, so it isn't enough.
  - Writes trips to `app/.data/ramp-trips.json` (gitignored). The app lists them under a "Ramp sandbox" filter and shows how each trip was joined.
  - Result on Oct 29: 1 of 4 bookings joined (AC 1521 LGA to YYZ, the $435.56 Air Canada charge with memo "Flight to Toronto"). The other three have no route-matching ticket charge (B6 2153 has only $10 wifi charges; AA 6020's only candidate memo is "Flight for work trip"), so the join reports them instead of guessing.
  - The joined trip shows "Not proven yet": with no flight-status record, the engine won't claim anything.
- [ ] Flight data for sandbox trips: the sandbox flight numbers look synthetic (UA 8565 DCA-DEN), so AeroDataBox may have no record of them. If so, demo the sandbox trip as "joined from Ramp, waiting for proof" and keep the seeded trips for the full refund flow
- [x] Remove `inputs/` from history, then make the repo public (done Nov 10 with `git filter-repo`; emails scrubbed in the same pass)
- [x] Pick a flight-status API (AeroDataBox, see Decisions)
- [x] Plan the build sprint (Oct 28 – Nov 10): pieces 1 to 4 below, plan confirmed by Tarun on Oct 22
- [x] Piece 1: 50 seeded trips (26 positive, 24 negative) with near misses: 2h50m and 2h59m late, 2h59m earlier, 5h and 5h59m international, cabin upgrade, voluntary changes, renumbered flights (with and without a significant change), flew the rebooked flight, credit accepted, booking-site purchases, non-US flight, already refunded, missing flight data
- [x] Piece 2: rules engine with cited clauses and proof, unit tests (boundaries, holidays, the July 7, 2027 date), and `pnpm eval`. On the seeded set: precision 100%, recall 100%, verdict and cited-clause match 100% (seeded, author-labeled; see Decisions). An independent agent re-labeled all 50 cases from the regulation text without seeing the engine: it agreed with every verdict, and its four basis corrections (T04, T05, T46, T49) and four missing near misses are applied. A mutation check (threshold 180 to 181 minutes) makes the eval fail on T08, so the eval does catch boundary bugs.
- [ ] Teammate review of the 50 labels in `app/data/seed/cases.ts`
- [ ] Piece 3: data join
  - [x] Ramp demo MCP OAuth client (`pnpm ramp:login`): dynamic client registration, PKCE, tokens in `app/.ramp/` (gitignored), read-only scopes
  - [x] Tarun approved the Ramp demo MCP login; real demo transactions and bookings pulled and `RampTransaction` aligned (Oct 29)
  - [x] Claude email extraction (`pnpm extract`, cached per trip, budget cap) and end-to-end eval (`pnpm eval:e2e`). The merge is unit-tested: a perfect extraction reproduces every gold fact and decision
  - [x] End-to-end eval run Oct 29 with `claude-opus-5-5` at effort `low` (Claude reads the emails, the engine decides). Results in `app/data/eval/e2e-claude-opus-5-5-v1.json` and `-v2.json`; extractions cached in `app/data/extract/claude-opus-5-5/v1|v2/`
    - **Prompt v1** (first run, $0.69): precision 96.3%, recall 100%, verdict and clause accuracy 98%. One miss: T40, a renumbered flight Claude labeled "schedule change", so the engine treated it as a cancellation and called the refund owed. Claude also put delay estimates in as a new itinerary (10 trips, no verdict changed). Cause: the prompt never defined the change kinds
    - **Prompt v2** (change kinds defined; the merge ignores email times for delays because flight status is the proof; $0.71): precision 100%, recall 100%, verdict and clause 100%, fields 449/450. The one field miss is T38: Claude read "your ticket value is available as a travel credit" (a voluntary cancellation) as accepted_credit; the verdict is unaffected
    - Caveat: v2 was fixed after seeing v1's misses on the same 50 trips, so its 100% is optimistic. Quote v1 as the honest first-run number, or build a held-out set with new email templates before quoting v2
  - [x] Flight-status API compared (see Decisions): AeroDataBox via RapidAPI Basic
  - [x] AeroDataBox adapter (`app/lib/flightstatus/aerodatabox.ts`): maps responses to `FlightStatus`, caches in `app/.cache/` (gitignored, 7-day retention per their terms), stops at 190 lookups a month. `CanceledUncertain` counts as no proof. Mapping tested against the published response schema
  - [ ] Tarun signs up for AeroDataBox Basic and adds `AERODATABOX_RAPIDAPI_KEY` to `app/.env`; then check real responses (time format, diversions) against the mapping
- [ ] Piece 4: product
  - [x] Escalation rules (`app/lib/escalation/escalation.ts`): fixed order, refund request then DOT complaint then dispute. A dispute is blocked while a refund request is inside its 7-business-day window. Unit-tested
  - [x] Deterministic drafts: traveler alert, refund request, DOT complaint, dispute evidence. Each cites the clauses and lists the proof
  - [x] UI (`pnpm build && pnpm start`): claims board, claim page (boarding-pass header with the amount owed, the deciding clause quoted, evidence table, escalation steps with drafts and one-click approval), and an accuracy page that reads the eval output. Demo clock ("Skip 8 business days") and "Reset demo" make the overdue path showable. State lives in `app/.data/` (gitignored). Checked in a browser on Oct 22
  - [x] Dispute step: after the DOT complaint, admin approves a dispute evidence package (`dispute_prepared` event, stage "Dispute package ready"). The app does not file it anywhere
  - [ ] Stripe Issuing test-mode dispute: blocked. Sandbox account "BBS-Ramp Hack" exists and `STRIPE_SECRET_KEY` is in `app/.env`, but the API answers "Your account is not set up to use Issuing" and the dashboard shows only "Contact sales" (checked Oct 30)
  - [ ] AeroDataBox credit line in the UI once live flight data is shown (required by its free-plan terms)
  - [ ] Demo script (3 to 5 minutes) and screen recording. Tarun said on Nov 1 not to start this yet

## Decisions

- Names: project **Soaring High**, team **Soaring** (chosen by the team, Oct 21). Earlier working names "Owed", "Part 260" and "Soaring Away" were dropped.
- Submit in the **technical** track. The rules engine, data join and eval are the differentiators, and technical execution is 35% of the score.
- The repo stayed private until Round 1 closed (Oct 22) so other teams couldn't copy the idea. It went public on Nov 10 for Round 2, after `inputs/` (the organizers' deck and email) was removed from git history.
- Lead with airline refunds. SaaS renewals after cancellation and duplicate charges are secondary detectors.
- Entitlement comes from a rules engine with cited clauses, not an LLM judgment.
- No voice call in the core pitch. It read as a gimmick.
- Escalation order: refund request, then DOT complaint, then card dispute, each behind admin approval.
- Don't present made-up results as real. Every number on a slide needs a source or a measurement.
- The product lives in `app/` as one Next.js project. The rules engine is TypeScript in the same project so the UI imports it directly. `sim/` and `video/` stay separate.
- Engine verdicts: `refund_owed`, `hold_credit_alert` (a qualifying disruption where the traveler hasn't responded and the flight hasn't left: the "don't accept the credit" moment), `not_owed`, `excluded` (renumbered flights under 91 FR 41556), `needs_info` (no independent flight-status record, so no claim). Precision and recall treat `refund_owed` and `hold_credit_alert` as positive.
- Each decision has one `basis` clause that the eval checks, plus all supporting citations and proof rows that point at the card charge, the email and the flight-status record.
- Who owes the refund comes from the ticket charge's Ramp `merchant_category`: "Airlines" means the carrier (§260.6(a)(1)), "Travel Agencies and Tour Operators" means the booking site (§399.80(l)). A booking-site refund is "upon request", so it gets no automatic due date.
- The renumbered-flight exclusion applies when the original flight's scheduled departure date is before July 7, 2027. Assumption: the notice is read as covering flights in that window.
- The eval numbers are on seeded cases whose labels the same author wrote, so 100% shows the engine matches our reading of the rule, not real-world accuracy. Label rationales are in `cases.ts`. The end-to-end eval in piece 3 (Claude-extracted records) is where real errors will show.
- A traveler who buys another airline's ticket hasn't told the carrier anything, so the engine treats it as no response (§260.6(a)(2)(iii)), not as a rejection under (a)(2)(ii). The second Ramp charge is the proof they didn't fly.
- An in-flight diversion is not a scheduled airport change under §260.2 ("scheduled to ... arrive at a different destination airport"), so it isn't a trigger by itself.
- `not_owed` covers trips outside Part 260 (for example a London to Paris flight). `excluded` means only DOT enforcement discretion (renumbered flights).
- **Flight-status API: AeroDataBox on RapidAPI, Basic plan** (compared Oct 22 against FlightAware AeroAPI, Aviationstack, FlightLabs, Cirium, OAG, AirLabs, OpenSky and BTS; sources in the session report). It's the only free plan with both 365 days of history and future schedules. Limits:
  - 400 units a month at 2 units per flight lookup, so about 200 lookups. Cache every response.
  - Free plan is non-commercial and needs a visible "AeroDataBox" credit with a link that does not use `noreferrer`.
  - Endpoint: `GET https://aerodatabox.p.rapidapi.com/flights/number/{flightNumber}/{dateLocal}`.
  - Statuses include `Canceled` and `Diverted`; times come as `scheduledTime` and `revisedTime`.
  - Unverified: whether the arrival airport changes on a diversion.
  - Pro is $8 a month if we outgrow the free plan; Tarun must approve that.
  - FlightAware's free Personal tier only reaches 10 days back.
- Ramp demo MCP login asks for read-only scopes only (`transactions:read trips:read users:read`). The MCP SDK by default requests every scope the server advertises, including `funds:write` and `bank_accounts:write`, so `FileOAuthProvider` narrows the authorization URL.
- Email extraction defaults to `claude-opus-5-5` at effort `low`, with Zod structured outputs. `--model claude-haiku-5-5` is about 40 times cheaper per token; Tarun picks.
  - Claude returns local wall-clock times and code converts them to offsets using the airport table, so the model never does timezone arithmetic.
  - Facts that come from outside the inbox stay as joined: card charge ids, a traveler's reply, a second airline charge.
- The demo app has no login. Server actions re-check the escalation rules on every POST, so a crafted request can't skip a step. Add auth before anything leaves localhost.
- UI type: Barlow Condensed (airport codes, amounts), Public Sans (interface), Source Serif 4 (quoted regulation only). Palette: ink navy, ticket paper, taxiway yellow only for money owed, stamp red only for blocked or refused. The board's "What happened" column comes from the engine's triggers, never from the eval labels.
- Dispute step prepares the package and files nothing. Stripe Issuing is gated behind sales even in a sandbox, and for Ramp cards the issuer is Ramp anyway. No fake dispute ids.
- Out of scope for now: disability-specific changes (§260.6(b)), bag and ancillary-only refunds (§260.4, §260.5), refundable fares, multi-ticket round trips (one trip record is one direction of one ticket).

## Open questions

- Tickets bought through a travel agency or booking site may refund through that seller rather than the airline. How does Soaring High handle each case?
- DOT's "Refund III" may narrow the definition of a cancelled flight. Recheck before the Nov 19 final.
- Can Soaring High act for the company when the ticket is in an employee's name? Who files the DOT complaint?
- ~~Which flight-status API?~~ AeroDataBox Basic, free (see Decisions).
- How do we get Ramp sandbox access as students?
- ~~Does the demo MCP OAuth login work without a Ramp account?~~ It worked with Tarun's login on Oct 29.
- If an airline offers a credit without the §260.6(c) notice (no statement of the refund right, or valid less than 5 years) and the traveler accepts it, does the acceptance still forfeit the refund? Not modeled yet.
- Multi-segment itineraries are not seeded yet: a domestic leg of an international trip (the 6h threshold should apply to the whole itinerary) and a London to Paris leg on a single ticket from the US (a covered flight, unlike T47). Add them once the builder supports connections in the original booking.
- When a traveler doesn't respond to a cancellation and the airline offered both a rebooking and a credit, the engine uses §260.6(a)(2)(iii)(A) (the rebooked flight left without them). (iii)(B) applies only when only a credit was offered. Confirm this reading.
- "Isn't this AirHelp?" Answer: AirHelp claims EU compensation for individual travelers; Soaring High claims US cash refunds owed to the company, found from card data. The same answer covers Service and Gyro Autopilot.
- "Doesn't Ramp already do this?" Answer: Ramp Intelligence prevents bad spend and catches hotel price drops, but nothing in Ramp recovers money an airline owes (see **Ramp Intelligence** above).
- How many corporate trips are called off or rebooked on another airline, rather than flown on the rebooked flight? That is the real size of the refund pool.
- Ask Stripe sales for Issuing sandbox access, or ask Ramp whether judges can see a dispute filed in the Ramp sandbox? Either would make the last step real.
- Should the brief mention Ramp Intelligence? It is at 248 of 250 words, so a line would have to replace one.

## Writing rules for copy (brief, slides, UI)

- No em dashes. Use a comma, a period or parentheses.
- Specific beats clever. Every sentence has a subject and a verb.
- Label vendor estimates as estimates (for example "5–10% of corporate air spend" comes from Corporate Traveler and Navan).

## Ongoing

Updated: 2026-11-10 by Claude session on Tarun's main Mac (deadline day).

### Where things stand

The MVP is built and on `main`. Round 2 (GitHub repo plus a 3 to 5 minute demo) is due **Nov 10, 11:59 p.m. PT** at https://forms.gle/FxUVTm6Z75f121ov5. Finalists are announced Nov 12; the live final is Nov 19 at Ramp's SF office.

Done:
- Round 1 submitted (technical track) with the brief in `round1-brief.md` and the animated video cut (source in `video/`, final render on the team Drive). Soaring advanced.
- Pieces 1 and 2: 50 seeded trips, the 14 CFR 260 rules engine with cited clauses, unit tests, `pnpm eval` (5a048ec and earlier).
- Piece 3: Claude email extraction and end-to-end eval (cd27af3), AeroDataBox adapter, Ramp demo MCP login and sandbox join (eced530, 122f170).
- Piece 4: escalation rules, drafts, claims board, claim page with approvals, accuracy page (5a048ec); dispute step prepares an evidence package (9529214).

In flight:
- Nothing is running. Latest work is pushed to main; 33 tests pass, typecheck and build are clean. The build session is waiting on the AeroDataBox key (Next, step 1).

Blocked:
- Stripe Issuing test-mode dispute: Stripe gates Issuing behind sales even in a sandbox. The app prepares the evidence package instead. Only unblock if Stripe or Ramp gives access.
- Ramp developer API sandbox: requested Oct 29, waiting on Ramp's approval email. The demo MCP works meanwhile.

### Next (in order)

1. **Tarun: AeroDataBox key (optional but makes the demo live).** Sign in at rapidapi.com, subscribe to AeroDataBox **Basic** ($0; if it asks for a card, stop). Copy `X-RapidAPI-Key` from the API's Endpoints page into `AERODATABOX_RAPIDAPI_KEY` in `app/.env`. Then an agent checks real responses (time format, diversions) against `app/lib/flightstatus/aerodatabox.ts` and adds the required "AeroDataBox" credit link (no `noreferrer`) wherever live flight data shows.
2. **Write the demo script (3 to 5 minutes). Wait for Tarun's go** (on Nov 1 he said there's plenty of time and not to start the script, recording or form yet). Suggested path: claims board, then one `refund_owed` trip (deciding clause, evidence table), approve the refund request, "Skip 8 business days" to show it overdue, approve the DOT complaint, then the dispute package; end on the accuracy page and quote the **v1** end-to-end number (96.3% precision, 100% recall), since v2 was tuned on the same 50 trips. Show the Ramp sandbox trip as "joined from Ramp, waiting for proof".
3. **Team: record the demo** (after Tarun's go). Run `pnpm build && pnpm start` in `app/`, press "Reset demo" first. Put the recording on Drive (anyone with the link) like Round 1.
4. Done Nov 10: Tarun approved; `inputs/` and email addresses were removed from git history with `git filter-repo`, and the clean history was pushed to the new public repo `soaring-high`. **Aadi and Dhruv: delete your old clone and clone `soaring-high`.** Do not push from an old clone, because that brings the removed files back.
5. **Team: fill the Round 2 form** (after Tarun's go). Each member adds their own name, major and contribution. Check every page before submitting, and let Tarun press Submit.
6. **Before the Nov 19 final (if we're a finalist):** teammate review of the 50 labels in `app/data/seed/cases.ts`; a held-out set of new email templates so the extraction number isn't tuned on its own test set; recheck DOT "Refund III"; Q&A prep from **Risks** and **Open questions**.

Build work an agent can do now, no Tarun action needed, once the key is in: check one real recent flight against the adapter (time format, diversions, `CanceledUncertain`) and fix `mapFlight` if the live shape differs; run `pnpm ramp:sync` with the key (expect no records for the synthetic sandbox flight numbers, so that trip stays "Not proven yet"); add the AeroDataBox credit line. Without the key: held-out eval set, multi-segment seeded cases (see Open questions).

Wait for Tarun's go before: demo script, recording, anything on the submission form, rewriting git history or changing repo visibility, anything paid (including a non-free AeroDataBox plan).

### Run the app

In `app/` (node 22 via nvm, pnpm 11):
- `pnpm build && pnpm start`, then open http://localhost:3000. "Skip 8 business days" and "Reset demo" in the header drive the overdue path.
- `pnpm test`, `pnpm typecheck`, `pnpm eval` (seeded eval, free).
- `pnpm ramp:sync` rebuilds `app/.data/ramp-trips.json` from the Ramp demo MCP. If the token in `app/.ramp/` has expired, run `pnpm ramp:login` first.
- `pnpm extract` and `pnpm eval:e2e` call the Anthropic API (about $0.70 per 50-trip run with `claude-opus-5-5`). Check `uv run sim/generate.py spend` first.
- `app/.env` (gitignored, mode 0600) holds `ANTHROPIC_API_KEY` (set), `STRIPE_SECRET_KEY` (set, test mode, unused by the code) and `AERODATABOX_RAPIDAPI_KEY` (empty).

### How work runs

- Heavy builds run on Tarun's second Mac over SSH (the Claude app connection `taruns-macbook`), clone at `~/TarunsCode/bbs-ramp`. Use `git@github.com:` remotes there, since HTTPS git can't reach the Keychain over SSH. One dev server at a time (8 GB RAM). Toolchain: node 22 via nvm, pnpm 11 via corepack, uv and gh from Homebrew.
- Tarun often works from a different Mac than the build machine, so commands he types in his own Terminal can land on the wrong machine. Use the app's Terminal panel on the build session.
- Keys: Tarun pastes them into `app/.env` himself (`nano +<line> .env` in a Terminal panel tab in `app/`). He rejected hidden-prompt scripts. Never print a key; check it by length and prefix only.
- Ramp OAuth: the callback listens on localhost:8765 on the build machine. When Tarun approves in his browser, he pastes the callback URL into chat and the session relays it with `curl`.
- Claude in Chrome was flaky on Oct 30. After two failed tries, stop and give Tarun the link to do it himself.
- Anything Tarun must type himself (passwords, sign-ins, approvals in his browser) is called out as "Tarun:" above. Agents don't sign in, pay or submit forms for him.
- Scripts that call the Anthropic API cost money: check `uv run sim/generate.py spend` and use `--max-usd` on `pnpm extract`.
- Keep personal info out of this repo (it will be public): no personal emails, phone numbers, IPs or keys. Write "Tarun's Berkeley email" rather than the address.

### Log

- Nov 10 (Claude, Tarun's main Mac): read the Round 2 form (public repo, 2 to 3 minute demo, 200 to 300 word architecture answer). App installed and built on this Mac (node 24 works; 33 tests pass). Tarun approved the Ramp demo MCP login here; `pnpm ramp:sync` joined 1 of 4 bookings (AC 1521), same as Oct 29. Rewrote README for judges and added round2-submission.md. History scan: no API keys ever committed; `inputs/` and teammates' emails are still in history. Later the same day, on Tarun's go: history rewritten with `git filter-repo` (`inputs/` removed, email addresses replaced, commit author email mapped to the GitHub noreply address), main force-pushed. GitHub still served the old commits by hash, so the clean history went to a new public repo, `soaring-high`, and `BBS-RAMP-Hack` stays private. Old commit hashes no longer exist, so teammates must re-clone. Still open: AeroDataBox key, demo video, form.

- Oct 18 (Claude, for a teammate): added **Ramp Intelligence** and **Risks** sections and Q&A answers.
- Oct 21–22 (Claude, for Tarun): Round 1 brief and video script, video edit in `video/`, form checked page by page; Tarun submitted. Built pieces 1 and 2 on the build Mac.
- Oct 29–30 (Claude, build session): pieces 3 and 4, Ramp demo MCP and sandbox join, Stripe sandbox (Issuing blocked).
- Nov 1 (Claude, build session and main session): both wrote handoffs; merged here. Real email addresses removed from **Status**. They were scrubbed from git history on Nov 10.
