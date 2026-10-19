# Soaring

Airlines legally owe cash refunds to the original card for cancelled and significantly changed flights, but travelers accept credits instead. Soaring checks every flight on a company's Ramp cards against real flight data and the DOT refund rule, then claims each refund with the proof attached.

Built for the BBS × Ramp Hackathon. Full context, sources and status are in [AGENTS.md](AGENTS.md). The Round 1 brief and video script are in [round1-brief.md](round1-brief.md).

## Setup

1. Install [uv](https://docs.astral.sh/uv/).
2. Copy `.env.example` to `.env` and add your own Anthropic API key.
3. Run scripts from the repo root, for example `uv run sim/report.py --tags pilot full`.

Scripts that call the API spend money. Check `uv run sim/generate.py spend` first.
