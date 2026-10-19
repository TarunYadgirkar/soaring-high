# /// script
# requires-python = ">=3.11"
# dependencies = ["anthropic", "python-dotenv"]
# ///
import argparse
import json
from collections import Counter, defaultdict

from generate import DATA
from taxonomy import MECHANISMS, WORKFLOWS

RARE_SHARE = 0.01


def load_ideas(tags: list[str]) -> list[dict]:
    rows = []
    for tag in tags:
        rows += map(json.loads, (DATA / tag / "ideas.jsonl").read_text().splitlines())
    return rows


def prevalence(ideas: list[dict], key: str, n_sessions: int) -> dict[str, float]:
    sessions_with: dict[str, set] = defaultdict(set)
    for idea in ideas:
        values = idea[key] if isinstance(idea[key], list) else [idea[key]]
        for v in values:
            sessions_with[v].add(idea["session"])
    return {k: len(s) / n_sessions for k, s in sessions_with.items()}


def saturation(ideas: list[dict]) -> list[int]:
    order = list(dict.fromkeys(i["session"] for i in ideas))
    by_session = defaultdict(set)
    for i in ideas:
        by_session[i["session"]].add(i["workflow_id"])
    seen: set = set()
    curve = []
    for s in order:
        seen |= by_session[s]
        curve.append(len(seen))
    return curve


def split_by(ideas: list[dict], field: str) -> dict[str, dict[str, float]]:
    groups = defaultdict(list)
    for i in ideas:
        groups[i[field]].append(i)
    return {
        g: dict(Counter({k: round(v, 4) for k, v in prevalence(rows, "workflow_id", len({r["session"] for r in rows})).items()}).most_common(15))
        for g, rows in groups.items()
    }


def build_summary(ideas: list[dict]) -> dict:
    n_sessions = len({i["session"] for i in ideas})
    wf_prev = prevalence(ideas, "workflow_id", n_sessions)
    names = {w[0]: (w[1], w[2]) for w in WORKFLOWS}
    workflows = [
        {
            "id": wid, "area": names.get(wid, ("Other", "Unmapped"))[0], "name": names.get(wid, ("Other", "Unmapped"))[1],
            "session_share": round(wf_prev.get(wid, 0.0), 4),
            "ideas": sum(i["workflow_id"] == wid for i in ideas),
            "top_picks": sum(i["workflow_id"] == wid and i["top_pick"] for i in ideas),
        }
        for wid in [*names, "other"]
    ]
    archetypes = Counter(
        (i["workflow_id"], m) for i in ideas for m in i["mechanisms"][:2] if m != "other"
    )
    return {
        "sessions": n_sessions,
        "ideas": len(ideas),
        "workflows": sorted(workflows, key=lambda w: -w["session_share"]),
        "mechanisms": {
            m: round(sum(m in i["mechanisms"][:2] for i in ideas) / len(ideas), 4) for m, _ in MECHANISMS
        },
        "archetypes": [{"workflow": w, "mechanism": m, "ideas": c} for (w, m), c in archetypes.most_common(25)],
        "overlaps_ramp_share": round(sum(i["overlaps_ramp"] for i in ideas) / len(ideas), 4),
        "saturation": saturation(ideas),
        "by_model": split_by(ideas, "model"),
        "by_arm": split_by(ideas, "arm"),
        "white_space": [w for w in workflows if w["id"] != "other" and w["session_share"] < RARE_SHARE],
        "unmapped_examples": [i["one_liner"] for i in ideas if i["workflow_id"] == "other"][:40],
    }


def print_summary(s: dict) -> None:
    print(f"{s['sessions']} sessions, {s['ideas']} ideas; {s['overlaps_ramp_share']:.0%} overlap Ramp's products")
    print("\nMost common workflows (share of sessions whose top 5 include it):")
    for w in s["workflows"][:20]:
        print(f"  {w['session_share']:6.1%}  picks={w['top_picks']:<4} {w['area']}: {w['name']}")
    print("\nMechanisms (share of ideas):")
    for m, v in sorted(s["mechanisms"].items(), key=lambda kv: -kv[1]):
        print(f"  {v:6.1%}  {m}")
    print(f"\nDistinct workflows hit: {s['saturation'][-1]} of {len(WORKFLOWS)}; curve tail: {s['saturation'][-10:]}")
    print(f"White space (<{RARE_SHARE:.0%} of sessions): {len(s['white_space'])} workflows")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tags", nargs="+", required=True)
    args = parser.parse_args()
    summary = build_summary(load_ideas(args.tags))
    (DATA / "summary.json").write_text(json.dumps(summary, indent=2))
    print_summary(summary)


if __name__ == "__main__":
    main()
