Read [AGENTS.md](AGENTS.md) first. It holds the project context, verified facts, decisions and status.

At the end of every work session, update AGENTS.md: tick or add items in **Status**, record new **Decisions** and **Open questions**, and note handoffs under **Ongoing**. Keep facts there sourced; mark anything unverified.

Scripts that call the Anthropic API spend real money. Check `uv run sim/generate.py spend` before running one, and never commit a `.env` file.
