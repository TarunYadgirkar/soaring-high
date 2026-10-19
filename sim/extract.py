# /// script
# requires-python = ">=3.11"
# dependencies = ["anthropic", "python-dotenv"]
# ///
import argparse
import json
import time

import anthropic
from anthropic.types.message_create_params import MessageCreateParamsNonStreaming
from anthropic.types.messages.batch_create_params import Request
from dotenv import load_dotenv

from generate import DATA, POLL_SECONDS, ROOT, call_cost, load_ledger, save_ledger
from taxonomy import MECHANISM_IDS, MECHANISMS, WORKFLOW_IDS, WORKFLOWS

MODEL = "claude-haiku-5-5"
MAX_IDEAS = 5

SYSTEM = f"""You label hackathon idea lists. The input is one AI assistant's reply to a student asking for ideas for the BBS x Ramp hackathon ("Automate an outdated financial workflow using the newest AI tools").

Extract the reply's top {MAX_IDEAS} ideas: the first {MAX_IDEAS} distinct project ideas in the order presented, or in the reply's own ranking if it ranks them. Skip generic advice that is not a project idea. If the reply has fewer ideas, return fewer.

For each idea:
- name: the reply's name for it
- one_liner: what it does, one sentence in plain words
- workflow_text: the financial workflow it automates, in plain words
- target_user: who uses it
- workflow_id: the closest workflow from the reference list below; "other" only if nothing fits
- secondary_workflow_id: a second workflow it clearly also covers, else "none"
- mechanisms: the one or two AI mechanisms the idea's core value depends on, from the mechanism list below. Not every step it touches; a tool that reads invoices to catch overbilling is anomaly_detection, not also document_extraction and generation_drafting.
- top_pick: true only for the single idea the reply explicitly recommends most
- overlaps_ramp: true if Ramp already sells this (cards, expense management, bill pay/AP, procurement, travel, accounting automation, treasury)

Reference workflows (id | area | workflow):
{chr(10).join(f"{i} | {d} | {n}" for i, d, n in WORKFLOWS)}

Mechanisms (id | meaning):
{chr(10).join(f"{i} | {m}" for i, m in MECHANISMS)}"""

IDEA_SCHEMA = {
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "one_liner": {"type": "string"},
        "workflow_text": {"type": "string"},
        "target_user": {"type": "string"},
        "workflow_id": {"type": "string", "enum": [*WORKFLOW_IDS, "other"]},
        "secondary_workflow_id": {"type": "string", "enum": [*WORKFLOW_IDS, "none"]},
        "mechanisms": {"type": "array", "items": {"type": "string", "enum": MECHANISM_IDS}},
        "top_pick": {"type": "boolean"},
        "overlaps_ramp": {"type": "boolean"},
    },
    "required": [
        "name", "one_liner", "workflow_text", "target_user", "workflow_id",
        "secondary_workflow_id", "mechanisms", "top_pick", "overlaps_ramp",
    ],
    "additionalProperties": False,
}
OUTPUT_FORMAT = {
    "type": "json_schema",
    "schema": {
        "type": "object",
        "properties": {"ideas": {"type": "array", "items": IDEA_SCHEMA}},
        "required": ["ideas"],
        "additionalProperties": False,
    },
}


def load_responses(tag: str) -> list[dict]:
    rows = map(json.loads, (DATA / tag / "responses.jsonl").read_text().splitlines())
    return [r for r in rows if r["result"] == "succeeded" and r.get("text")]


def submit_batch(client: anthropic.Anthropic, responses: list[dict]) -> str:
    requests = [
        Request(
            custom_id=r["id"],
            params=MessageCreateParamsNonStreaming(
                model=MODEL,
                max_tokens=8000,
                output_config={"effort": "low", "format": OUTPUT_FORMAT},
                system=[{"type": "text", "text": SYSTEM, "cache_control": {"type": "ephemeral"}}],
                messages=[{"role": "user", "content": r["text"]}],
            ),
        )
        for r in responses
    ]
    return client.messages.batches.create(requests=requests).id


def wait(client: anthropic.Anthropic, batch_id: str) -> None:
    while client.messages.batches.retrieve(batch_id).processing_status != "ended":
        time.sleep(POLL_SECONDS)


def extract(tag: str, client: anthropic.Anthropic) -> None:
    responses = {r["id"]: r for r in load_responses(tag)}
    batch_id = submit_batch(client, list(responses.values()))
    print(f"Submitted extraction batch {batch_id} for {len(responses)} responses", flush=True)
    wait(client, batch_id)

    ideas, cost, failed = [], 0.0, []
    for result in client.messages.batches.results(batch_id):
        if result.result.type != "succeeded":
            failed.append(result.custom_id)
            continue
        msg = result.result.message
        cost += call_cost(MODEL, msg.usage.to_dict())
        text = next(b.text for b in msg.content if b.type == "text")
        session = responses[result.custom_id]
        for rank, idea in enumerate(json.loads(text)["ideas"][:MAX_IDEAS], start=1):
            ideas.append({
                "session": session["id"], "model": session["model"], "arm": session["arm"],
                "prompt": session["prompt"], "rank": rank, **idea,
            })

    (DATA / tag / "ideas.jsonl").write_text("".join(json.dumps(i) + "\n" for i in ideas))
    ledger = load_ledger()
    ledger["runs"][f"{tag}-extract-{batch_id[-6:]}"] = {"batch_id": batch_id, "calls": len(responses), "cost": cost}
    save_ledger(ledger)
    print(f"{len(ideas)} ideas from {len(responses) - len(failed)} responses, ${cost:.2f}. Failed: {failed}")


def main() -> None:
    load_dotenv(ROOT / ".env")
    parser = argparse.ArgumentParser()
    parser.add_argument("--tag", required=True)
    args = parser.parse_args()
    extract(args.tag, anthropic.Anthropic())


if __name__ == "__main__":
    main()
