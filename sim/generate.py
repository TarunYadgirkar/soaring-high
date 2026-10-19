# /// script
# requires-python = ">=3.11"
# dependencies = ["anthropic", "python-dotenv"]
# ///
import argparse
import json
import sys
import time
from pathlib import Path

import anthropic
from anthropic.types.message_create_params import MessageCreateParamsNonStreaming
from anthropic.types.messages.batch_create_params import Request
from dotenv import load_dotenv

from prompts import build_sessions

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
INPUTS = ROOT / "inputs"
LEDGER = DATA / "spend.json"

# $200 grant; the rest is reserved for extraction and classification.
BUDGET_USD = 185.0
POLL_SECONDS = 60

# Batch API bills at 50% of these per-MTok rates.
PRICES = {
    "claude-opus-5-5": {"in": 4.00, "out": 20.00, "cache_read": 0.20},
    "claude-fable-5-1": {"in": 10.00, "out": 50.00, "cache_read": 0.25},
    "claude-haiku-5-5": {"in": 0.10, "out": 0.50, "cache_read": 0.01},
}
CACHE_WRITE_MULTIPLIER = 1.25
BATCH_DISCOUNT = 0.5

# Used only until a collected run gives a measured average.
DEFAULT_COST_PER_CALL = {"claude-opus-5-5": 0.07, "claude-fable-5-1": 0.22}


def call_cost(model: str, usage: dict) -> float:
    p = PRICES[model]
    dollars = (
        usage.get("input_tokens", 0) * p["in"]
        + (usage.get("cache_creation_input_tokens") or 0) * p["in"] * CACHE_WRITE_MULTIPLIER
        + (usage.get("cache_read_input_tokens") or 0) * p["cache_read"]
        + usage.get("output_tokens", 0) * p["out"]
    )
    return dollars / 1_000_000 * BATCH_DISCOUNT


def load_ledger() -> dict:
    if not LEDGER.exists():
        return {"runs": {}}
    return json.loads(LEDGER.read_text())


def save_ledger(ledger: dict) -> None:
    LEDGER.write_text(json.dumps(ledger, indent=2))


def measured_cost_per_call(ledger: dict) -> dict[str, float]:
    totals: dict[str, list[float]] = {}
    for run in ledger["runs"].values():
        for model, stats in run.get("by_model", {}).items():
            agg = totals.setdefault(model, [0.0, 0])
            agg[0] += stats["cost"]
            agg[1] += stats["calls"]
    measured = {m: c / n for m, (c, n) in totals.items() if n}
    return {**DEFAULT_COST_PER_CALL, **measured}


def committed_spend(ledger: dict) -> float:
    return sum(r.get("cost", r.get("projected", 0.0)) for r in ledger["runs"].values())


def upload_inputs(client: anthropic.Anthropic) -> dict:
    ids_path = DATA / "file_ids.json"
    if ids_path.exists():
        return json.loads(ids_path.read_text())
    ids = {
        "image": client.files.upload(file=INPUTS / "email.png").id,
        "pdf": client.files.upload(file=INPUTS / "info.pdf").id,
    }
    ids_path.write_text(json.dumps(ids, indent=2))
    return ids


def build_content(session: dict, file_ids: dict) -> list[dict]:
    attachments = [{"type": "image", "source": {"type": "file", "file_id": file_ids["image"]}}]
    if session["arm"] == "image_pdf":
        attachments.append({"type": "document", "source": {"type": "file", "file_id": file_ids["pdf"]}})
    attachments[-1] = {**attachments[-1], "cache_control": {"type": "ephemeral"}}
    return [*attachments, {"type": "text", "text": session["prompt"]}]


def submit(args: argparse.Namespace, client: anthropic.Anthropic) -> None:
    run_dir = DATA / args.tag
    if run_dir.exists():
        sys.exit(f"Run '{args.tag}' already exists. Pick a new --tag.")

    ledger = load_ledger()
    sessions = build_sessions(args.n, seed=args.seed, start=args.start)
    rates = measured_cost_per_call(ledger)
    projected = sum(rates[s["model"]] for s in sessions)
    spent = committed_spend(ledger)
    print(f"Projected ${projected:.2f} for {len(sessions)} calls; committed so far ${spent:.2f}; cap ${BUDGET_USD:.2f}")
    if spent + projected > BUDGET_USD:
        sys.exit("Over budget. Lower --n.")

    file_ids = upload_inputs(client)
    requests = [
        Request(
            custom_id=s["id"],
            params=MessageCreateParamsNonStreaming(
                model=s["model"],
                max_tokens=16000,
                messages=[{"role": "user", "content": build_content(s, file_ids)}],
            ),
        )
        for s in sessions
    ]
    batch = client.messages.batches.create(requests=requests)

    run_dir.mkdir(parents=True)
    (run_dir / "sessions.jsonl").write_text("".join(json.dumps(s) + "\n" for s in sessions))
    ledger["runs"][args.tag] = {"batch_id": batch.id, "calls": len(sessions), "projected": projected}
    save_ledger(ledger)
    print(f"Submitted batch {batch.id}")


def text_of(message) -> str:
    return "\n".join(b.text for b in message.content if b.type == "text")


def collect(args: argparse.Namespace, client: anthropic.Anthropic) -> None:
    ledger = load_ledger()
    run = ledger["runs"][args.tag]
    while (batch := client.messages.batches.retrieve(run["batch_id"])).processing_status != "ended":
        c = batch.request_counts
        print(f"processing={c.processing} succeeded={c.succeeded} errored={c.errored}", flush=True)
        time.sleep(POLL_SECONDS)

    sessions = {
        s["id"]: s
        for s in map(json.loads, (DATA / args.tag / "sessions.jsonl").read_text().splitlines())
    }
    by_model: dict[str, dict] = {}
    rows = []
    for result in client.messages.batches.results(run["batch_id"]):
        session = sessions[result.custom_id]
        row = {**session, "result": result.result.type}
        if result.result.type == "succeeded":
            msg = result.result.message
            usage = msg.usage.to_dict()
            cost = call_cost(session["model"], usage)
            row |= {"stop_reason": msg.stop_reason, "text": text_of(msg), "usage": usage, "cost": cost}
            stats = by_model.setdefault(session["model"], {"calls": 0, "cost": 0.0})
            stats["calls"] += 1
            stats["cost"] += cost
        else:
            row["error"] = str(getattr(result.result, "error", ""))
        rows.append(row)

    (DATA / args.tag / "responses.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows))
    run |= {"by_model": by_model, "cost": sum(s["cost"] for s in by_model.values())}
    save_ledger(ledger)

    failed = sum(r["result"] != "succeeded" for r in rows)
    print(f"Collected {len(rows)} ({failed} failed). Actual cost ${run['cost']:.2f}")
    for model, s in by_model.items():
        print(f"  {model}: {s['calls']} calls, ${s['cost'] / s['calls']:.3f}/call")


def probe(args: argparse.Namespace, client: anthropic.Anthropic) -> None:
    session = {"id": "probe", "model": args.model, "arm": "image_pdf", "prompt": "give me ideas for this hackathon"}
    msg = client.messages.create(
        model=session["model"],
        max_tokens=16000,
        messages=[{"role": "user", "content": build_content(session, upload_inputs(client))}],
    )
    usage = msg.usage.to_dict()
    print(msg.stop_reason, usage)
    print(f"Cost at full price ${call_cost(session['model'], usage) / BATCH_DISCOUNT:.3f}")
    print(text_of(msg)[:1500])


def status(args: argparse.Namespace, client: anthropic.Anthropic) -> None:
    batch = client.messages.batches.retrieve(load_ledger()["runs"][args.tag]["batch_id"])
    print(batch.processing_status, batch.request_counts, f"created {batch.created_at:%Y-%m-%d %H:%M} UTC")


def spend(_: argparse.Namespace, __: anthropic.Anthropic) -> None:
    ledger = load_ledger()
    for tag, run in ledger["runs"].items():
        label = f"${run['cost']:.2f} actual" if "cost" in run else f"${run['projected']:.2f} projected"
        print(f"{tag}: {run['calls']} calls, {label}")
    print(f"Committed ${committed_spend(ledger):.2f} of ${BUDGET_USD:.2f}")
    print("Per-call rates:", {m: round(c, 3) for m, c in measured_cost_per_call(ledger).items()})


def main() -> None:
    load_dotenv(ROOT / ".env")
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("submit")
    s.add_argument("--tag", required=True)
    s.add_argument("--n", type=int, required=True)
    s.add_argument("--seed", type=int, required=True)
    s.add_argument("--start", type=int, default=0)
    c = sub.add_parser("collect")
    c.add_argument("--tag", required=True)
    st = sub.add_parser("status")
    st.add_argument("--tag", required=True)
    p = sub.add_parser("probe")
    p.add_argument("--model", default="claude-opus-5-5")
    sub.add_parser("spend")
    args = parser.parse_args()

    DATA.mkdir(exist_ok=True)
    handlers = {"submit": submit, "collect": collect, "status": status, "probe": probe, "spend": spend}
    handlers[args.cmd](args, anthropic.Anthropic())


if __name__ == "__main__":
    main()
