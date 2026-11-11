# Soaring High

Airlines legally owe cash refunds to the original card for cancelled and significantly changed flights, but travelers accept credits instead, and the company's cash is lost. Soaring High checks every flight on a company's Ramp cards against flight data and the DOT refund rule (14 CFR Part 260), then claims each refund with the proof attached.

Built by team Soaring for the BBS × Ramp Hackathon (technical track). The prompt: "Automate an outdated financial workflow using the newest AI tools."

## What it does

1. **Joins three records nobody connects:** the Ramp card charge, the airline's email, and an independent flight-status record.
2. **Decides with a rules engine, not an LLM opinion.** The engine encodes 14 CFR 260 and 399.80(l). Every claim quotes the clause it relies on and points at the records that prove it. Claude only reads messy airline emails into structured facts.
3. **Alerts in real time.** When a disruption qualifies and the traveler hasn't answered, it tells them not to accept the credit, because accepting it gives up the refund.
4. **Gets the cash back in a fixed order:** refund request, then DOT complaint, then a card dispute package. Each step needs one admin approval, and a dispute is blocked while a refund request is still inside its 7-business-day window.
5. **Measures itself** on 50 seeded trips that include near misses (2h59m late, renumbered flights, voluntary changes).

## Run it

Needs Node 22 or newer and pnpm 11. No API keys are needed for the seeded demo.

```bash
cd app
pnpm install
pnpm build && pnpm start
```

Open http://localhost:3000. "Skip 8 business days" in the header moves the demo clock so a refund request goes overdue. "Reset demo" clears approvals.

Other commands in `app/`:

| Command | What it does | Cost |
|---|---|---|
| `pnpm test` | 34 unit tests: rule boundaries, federal holidays, escalation order, the Ramp join | Free |
| `pnpm eval` | Precision and recall of the rules engine on the 50 seeded trips | Free |
| `pnpm ramp:login`, `pnpm ramp:sync` | Log in to Ramp's demo MCP server (read-only scopes) and join sandbox bookings to card charges | Free, needs a Ramp sandbox login |
| `pnpm extract`, `pnpm eval:e2e` | Claude reads the airline emails, then the engine decides | About $0.70 per run, needs `ANTHROPIC_API_KEY` in `app/.env` |

## How it's built

```
Ramp demo MCP (charges, bookings) ─┐
Airline emails ── Claude ── facts ─┼─ join ── rules engine ── decision ── escalation ── approvals (UI)
Flight status (AeroDataBox) ───────┘          (14 CFR 260)    + clause     (request, DOT,
                                                              + proof       dispute package)
```

| Piece | Where | Notes |
|---|---|---|
| Rules engine | [app/lib/rules/](app/lib/rules/) | Pure TypeScript. Verbatim clause excerpts, business-day math, one deciding clause per decision |
| Email extraction | [app/lib/extract/](app/lib/extract/) | Claude Opus 5.5 with Zod structured outputs. Returns local wall-clock times; code does the timezone math |
| Ramp join | [app/lib/ramp/](app/lib/ramp/) | MCP client with OAuth (PKCE). Matches a booking to a charge by airline, date window and memo, and reports what it couldn't match instead of guessing |
| Flight status | [app/lib/flightstatus/](app/lib/flightstatus/) | AeroDataBox adapter with a cache and a quota guard. No record means no claim |
| Escalation | [app/lib/escalation/](app/lib/escalation/) | Fixed order, deterministic drafts, no double recovery |
| Seeded trips and labels | [app/data/seed/](app/data/seed/) | 26 owed, 24 not owed, each with a written rationale |
| UI | [app/app/](app/app/) | Next.js 16: claims board, claim page, accuracy page |

## Accuracy

Measured on the 50 seeded trips. We wrote and labeled these cases ourselves, and a second reviewer re-labeled them from the regulation text without seeing the engine. The numbers show the engine matches the rule as we read it. They are not a measurement on real company travel.

| Run | Precision | Recall | Right clause cited |
|---|---|---|---|
| Rules engine on seeded records | 100% | 100% | 100% |
| End to end, Claude reads the emails, first run (prompt v1) | 96.3% | 100% | 98% |
| End to end, prompt v2 | 100% | 100% | 100% |

Prompt v2 was fixed after seeing v1's one miss on the same 50 trips, so treat 96.3% as the honest first-run number.

## What is real and what is seeded

- **Real:** the rules engine, the escalation rules, the Claude extraction and its eval, the Ramp demo MCP login and the booking-to-charge join against Ramp's sandbox data.
- **Seeded:** the 50 trips (Ramp-shaped charges, airline emails, flight-status records). Ramp's sandbox has four flight bookings and none of them is disrupted, so the refund flow runs on seeded trips.
- **Not sent anywhere:** approving a step records it and shows the draft. The app does not email airlines, file DOT complaints or file disputes. Ramp has no disputes API, so the last step prepares the evidence package for Ramp's dispute form.

## More

- [AGENTS.md](AGENTS.md): full project context, the verified regulation notes with sources, decisions and open questions.
- [round2-submission.md](round2-submission.md): the Round 2 architecture answer and demo script.
- [round1-brief.md](round1-brief.md): the Round 1 brief and video script.
- `sim/` and `data/`: the idea research. We simulated 2,500 Claude sessions answering the hackathon prompt to find which finance workflows every team would pick, then chose one almost nobody did. Running `sim/` needs [uv](https://docs.astral.sh/uv/) and your own Anthropic key, and it spends money. Check `uv run sim/generate.py spend` first.

Not legal advice.
