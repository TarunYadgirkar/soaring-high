# /// script
# requires-python = ">=3.11"
# dependencies = ["anthropic", "python-dotenv"]
# ///
import json
import random
import string
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor

import anthropic
from dotenv import load_dotenv

from generate import DATA, ROOT, call_cost, load_ledger, save_ledger, BATCH_DISCOUNT

RUNS = 20
VERSION = "v4"
MODELS = ["claude-opus-5-5", "claude-fable-5-1"]
CRITERIA = ["technical_execution", "problem_fit", "demo_polish", "creativity"]

PITCHES_V2 = {
    "tariff_refunds": "Tariff refund recovery. After the Supreme Court struck down the IEEPA tariffs in Feb 2026, about $166B is owed back to importers; CBP's refund process runs in phases, and refunds go to the importer of record, so companies that bought through UPS/DDP sellers must chase carriers. The agent reads the broker and carrier invoices already flowing through Ramp Bill Pay, matches duty lines to customs entries, sizes what's recoverable, prepares the importer's own CBP refund CSV and carrier pass-through claims, and posts refund journal entries when money lands. Ramp has nothing on tariffs. Weaknesses: funded startups (Pax, Zollback, Caspian) already do refunds, students have no ACE/customs data so entries would be synthetic, and the IEEPA wave may be mostly processed by the final.",
    "unclaimed_property": "Stale check recovery before escheatment. Ramp auto-voids vendor checks not cashed within 180 days and its accounting guide tells customers to book them to a 'Stale Checks' liability and reissue manually. That money still belongs to the vendor; left alone it becomes unclaimed property that must be reported to the state after a 3-5 year dormancy period, with due-diligence letters first and Delaware audits adding 20% interest. The agent watches Ramp Bill Pay for voided and aging checks, contacts the vendor by email or phone to get ACH details (verifying them against fraud), reissues the payment through Ramp, and for unreachable payees tracks dormancy dates and produces the due-diligence letter and a NAUPA-format report for 3 states. Ramp has no escheatment feature. Weaknesses: annual and niche, and the multi-year dormancy part runs on synthetic data.",
    "card_disputes": "Corporate card recovery agent. Commercial cards get almost no Reg Z protection and Ramp's dispute window is 60 days from the statement date. Ramp's AI flags duplicate subscription charges, but disputing is a manual form and Ramp's help center mentions no automation. The agent finds disputable charges (renewals after a cancellation email, duplicates, undelivered orders), gathers evidence from the inbox, contacts the merchant by email and a live voice call, and if stonewalled assembles a dispute packet under the right Visa reason code with a deadline countdown, waiting for one-click admin approval. Demo can use Stripe Issuing test-mode disputes. Weaknesses: disputes are relatively rare and dollar amounts per company are modest.",
    "agent_payments_seller": "Make B2B vendors payable by AI agents. Ramp's x402 alpha lets a company's agents pay, but small B2B vendors (caterers, suppliers) only send PDF invoices on net-30. The tool onboards a vendor from its PDF menu or price list in a minute, publishes an x402/MCP endpoint (USDC or card), and returns a line-item receipt with tax and a suggested GL code, so an agent's purchase lands in the buyer's Ramp already coded and reconciled, with no invoice keying.",
    "lien_waivers": "Construction lien waiver agent. Ramp for Construction already runs an AI check on bills that verifies a lien waiver is attached, signed, matches the bill amount and covers the work through-date, but per Ramp's docs it does not collect waivers from vendors and a failed check doesn't block payment. Siteline and Procore Pay also review and chase waivers inside their own platforms. The agent generates the CA/TX statutory conditional waiver, sends it for e-signature, chases missing ones by email, diffs returned scans word-for-word against the statutory text (CA voids non-statutory waivers), and requests the unconditional waiver once Ramp's payment clears. Weaknesses: Ramp already does the basic validation, and judges outside construction need a primer.",
    "state_registrations": "Multi-state expansion agent. When a startup hires in a new state it must register for withholding and unemployment accounts, sometimes foreign-qualify with the Secretary of State, and pay fees, mostly through clunky state portals, taking weeks and blocking payroll. Continuing from Ramp for Agents' day-0 incorporation, the agent detects expansion, builds the registration plan, fills state portals with computer use, pays fees with a capped Ramp Agent Card, and tracks returned account numbers and renewal deadlines.",
}

COMBINED = "Ramp recovery agent: every dollar in Ramp that has a clock on it. Two leaks share one workflow. (1) Card charges you shouldn't have paid: renewals after a cancellation email, duplicates, undelivered orders. Ramp's AI flags duplicates but disputing is a manual form with a 60-day window. (2) Payments that never reached the vendor: Ramp auto-voids checks not cashed in 180 days and tells customers to book them to a 'Stale Checks' liability; left alone they become unclaimed property owed to the state with audit interest. The agent detects both in Ramp data, gathers evidence from the inbox, contacts the merchant or vendor by email and a live voice call, then with one-click admin approval files the dispute under the right Visa reason code or reissues the vendor payment by ACH, and shows a deadline board of recoverable dollars. Demo uses Stripe Issuing test-mode disputes and the Ramp sandbox. Weakness: two workflows in 10 days risks spreading the team thin."

AIRLINE = "Company card recovery agent, starting with airfare. Corporate travelers' flights get cancelled or significantly changed, bags arrive late, and paid seats or Wi-Fi aren't delivered. Under the US DOT refund rule (14 CFR 260) airlines owe a cash refund to the original card within 7 business days, with no carve-out for business travel, yet travelers accept credits that expire in personal loyalty accounts (vendor estimates put unused tickets at 5-10% of corporate air spend). Ramp's AI flags duplicate charges but recovering money is manual: a dispute form with a 60-day window. The agent matches Ramp card transactions to airline emails in the inbox, works out what's owed under the rule, requests the refund by email and a live voice call to the airline, and only if refused files a card dispute under the right reason code with the call transcript as evidence, after one-click admin approval. It also catches SaaS renewals after cancellation and duplicate charges. Demo uses the Ramp sandbox, Stripe Issuing test-mode disputes and a teammate playing the airline agent."

PITCHES = {"card_disputes": PITCHES_V2["card_disputes"], "airline_first": AIRLINE, "unclaimed_property": PITCHES_V2["unclaimed_property"], "lien_waivers": PITCHES_V2["lien_waivers"]}

SYSTEM = """You are a senior Ramp engineer judging the BBS x Ramp student hackathon. Prompt: "Automate an outdated financial workflow using the newest AI tools." Teams of 2-3 UC Berkeley students get about 10 days to build working code and a 3-5 minute demo. Rubric: 35% technical execution, 25% problem fit, 20% product polish and demo clarity, 10% creativity, 10% presentation.

You will see several anonymous idea pitches. Judge each as the project it would most likely become in 10 days. Be skeptical: penalize ideas that duplicate what Ramp already ships, that can't be demoed credibly, or whose pain you doubt. Score each criterion 1-10, then pick the single idea you'd most want to see in the final and the one you'd least want."""


def output_format(labels: list[str]) -> dict:
    score = {"type": "object", "properties": {c: {"type": "integer"} for c in CRITERIA}, "required": CRITERIA, "additionalProperties": False}
    item = {
        "type": "object",
        "properties": {"label": {"type": "string", "enum": labels}, "scores": score, "concern": {"type": "string"}},
        "required": ["label", "scores", "concern"],
        "additionalProperties": False,
    }
    return {
        "type": "json_schema",
        "schema": {
            "type": "object",
            "properties": {
                "ideas": {"type": "array", "items": item},
                "winner": {"type": "string", "enum": labels},
                "loser": {"type": "string", "enum": labels},
                "why_winner": {"type": "string"},
            },
            "required": ["ideas", "winner", "loser", "why_winner"],
            "additionalProperties": False,
        },
    }


def run_one(client: anthropic.Anthropic, i: int) -> dict:
    rng = random.Random(i)
    keys = list(PITCHES)
    rng.shuffle(keys)
    labels = list(string.ascii_uppercase[: len(keys)])
    mapping = dict(zip(labels, keys))
    body = "\n\n".join(f"Idea {label}: {PITCHES[key]}" for label, key in mapping.items())
    model = MODELS[i % len(MODELS)]
    msg = client.messages.create(
        model=model,
        max_tokens=16000,
        system=SYSTEM,
        output_config={"format": output_format(labels)},
        messages=[{"role": "user", "content": body}],
    )
    verdict = json.loads(next(b.text for b in msg.content if b.type == "text"))
    cost = call_cost(model, msg.usage.to_dict()) / BATCH_DISCOUNT
    return {"run": i, "model": model, "mapping": mapping, "verdict": verdict, "cost": cost}


def summarize(results: list[dict]) -> None:
    wins, losses = Counter(), Counter()
    scores: dict[str, dict[str, list[int]]] = defaultdict(lambda: defaultdict(list))
    for r in results:
        m = r["mapping"]
        wins[m[r["verdict"]["winner"]]] += 1
        losses[m[r["verdict"]["loser"]]] += 1
        for idea in r["verdict"]["ideas"]:
            for c, v in idea["scores"].items():
                scores[m[idea["label"]]][c].append(v)
    weights = {"technical_execution": 0.35, "problem_fit": 0.25, "demo_polish": 0.20, "creativity": 0.10}
    print(f"{'idea':24} wins loses  weighted  " + "  ".join(c[:6] for c in CRITERIA))
    for key in sorted(PITCHES, key=lambda k: -wins[k]):
        avg = {c: sum(v) / len(v) for c, v in scores[key].items()}
        weighted = sum(avg[c] * w for c, w in weights.items()) / sum(weights.values())
        print(f"{key:24} {wins[key]:4} {losses[key]:5}  {weighted:8.2f}  " + "  ".join(f"{avg[c]:6.1f}" for c in CRITERIA))
    print(f"\nCost ${sum(r['cost'] for r in results):.2f}")


def main() -> None:
    load_dotenv(ROOT / ".env")
    client = anthropic.Anthropic()
    with ThreadPoolExecutor(max_workers=10) as pool:
        results = list(pool.map(lambda i: run_one(client, i), range(RUNS)))
    (DATA / f"judge_{VERSION}.jsonl").write_text("".join(json.dumps(r) + "\n" for r in results))
    ledger = load_ledger()
    ledger["runs"][f"judge-{VERSION}"] = {"calls": RUNS, "cost": sum(r["cost"] for r in results)}
    save_ledger(ledger)
    summarize(results)


if __name__ == "__main__":
    main()
