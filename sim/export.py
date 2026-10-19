# /// script
# requires-python = ">=3.11"
# dependencies = ["anthropic", "python-dotenv"]
# ///
import csv
import json
from collections import defaultdict
from pathlib import Path

from generate import DATA, load_ledger
from report import load_ideas, prevalence, saturation
from taxonomy import MECHANISMS, WORKFLOWS

OUT = DATA / "dashboard"
TAGS = ["pilot", "full"]
SATURATION_STEP = 10
CROWDED = 0.10
RARE = 0.01

MECHANISM_LABELS = {
    "document_extraction": "Reads documents",
    "anomaly_detection": "Flags anomalies or fraud",
    "generation_drafting": "Drafts reports or messages",
    "matching_reconciliation": "Matches records",
    "autonomous_agent": "Multi-step agent",
    "email_inbox": "Works an email inbox",
    "classification_coding": "Categorizes transactions",
    "forecasting": "Forecasts",
    "conversational_qa": "Chat over data",
    "browser_computer_use": "Drives legacy UIs",
    "voice_phone": "Voice or phone",
    "negotiation": "Negotiates",
    "payments_execution": "Moves money",
    "other": "Other",
}


def status_of(share: float, ideas: int) -> str:
    if ideas == 0:
        return "Never pitched"
    if share < RARE:
        return "Rare"
    if share < CROWDED:
        return "Common"
    return "Crowded"


def write_csv(name: str, rows: list[dict]) -> None:
    with open(OUT / name, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def by_model_share(ideas: list[dict]) -> dict[str, dict[str, float]]:
    groups = defaultdict(list)
    for i in ideas:
        groups[i["model"]].append(i)
    return {
        m: prevalence(rows, "workflow_id", len({r["session"] for r in rows}))
        for m, rows in groups.items()
    }


def main() -> None:
    OUT.mkdir(exist_ok=True)
    ideas = load_ideas(TAGS)
    n_sessions = len({i["session"] for i in ideas})
    share = prevalence(ideas, "workflow_id", n_sessions)
    models = by_model_share(ideas)

    workflows = []
    for wid, area, name in [*WORKFLOWS, ("other", "Other", "Doesn't fit any listed workflow")]:
        count = sum(i["workflow_id"] == wid for i in ideas)
        workflows.append({
            "id": wid,
            "area": area,
            "workflow": name,
            "session_share": round(share.get(wid, 0.0), 4),
            "ideas": count,
            "top_picks": sum(i["workflow_id"] == wid and i["top_pick"] for i in ideas),
            "opus_share": round(models["claude-opus-5-5"].get(wid, 0.0), 4),
            "fable_share": round(models["claude-fable-5-1"].get(wid, 0.0), 4),
            "status": status_of(share.get(wid, 0.0), count),
        })
    write_csv("workflows.csv", sorted(workflows, key=lambda w: -w["session_share"]))

    write_csv("mechanisms.csv", [
        {
            "mechanism": m,
            "label": MECHANISM_LABELS[m],
            "idea_share": round(sum(m in i["mechanisms"][:2] for i in ideas) / len(ideas), 4),
        }
        for m, _ in MECHANISMS if m != "other"
    ])

    curve = saturation(ideas)
    points = sorted({*range(SATURATION_STEP, len(curve) + 1, SATURATION_STEP), 1, len(curve)})
    write_csv("saturation.csv", [{"sessions": n, "distinct_workflows": curve[n - 1]} for n in points])

    ledger = load_ledger()
    write_csv("run.csv", [{
        "sessions": n_sessions,
        "ideas": len(ideas),
        "listed_workflows": len(WORKFLOWS),
        "ramp_overlap_share": round(sum(i["overlaps_ramp"] for i in ideas) / len(ideas), 4),
        "cost_usd": round(sum(r.get("cost", 0.0) for r in ledger["runs"].values()), 2),
    }])
    print(json.dumps({p.name: p.stat().st_size for p in OUT.iterdir()}, indent=1))


if __name__ == "__main__":
    main()
