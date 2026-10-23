import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import Anthropic from "@anthropic-ai/sdk";
import type { SeedTrip } from "../data/seed/build";
import { DEFAULT_MODEL, extractTrip, PRICES, type ExtractionResult } from "../lib/extract/extract";

const APP = join(import.meta.dirname, "..");
if (existsSync(join(APP, ".env"))) process.loadEnvFile(join(APP, ".env"));

const { values } = parseArgs({
  options: {
    model: { type: "string", default: DEFAULT_MODEL },
    limit: { type: "string" },
    only: { type: "string" },
    "max-usd": { type: "string", default: "2" },
    concurrency: { type: "string", default: "4" },
  },
});
const model = values.model;
const maxUsd = Number(values["max-usd"]);
if (!PRICES[model]) throw new Error(`No price for ${model}; add it to PRICES before spending money on it`);
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set. Add it to app/.env (gitignored).");
  process.exit(1);
}

const trips: SeedTrip[] = JSON.parse(readFileSync(join(APP, "data/seed/trips.json"), "utf8"));
const only = values.only ? new Set(values.only.split(",")) : null;
const cacheDir = join(APP, "data/extract", model);
mkdirSync(cacheDir, { recursive: true });
const cachePath = (id: string) => join(cacheDir, `${id}.json`);

let todo = trips.filter((t) => (!only || only.has(t.id)) && !existsSync(cachePath(t.id)));
if (values.limit) todo = todo.slice(0, Number(values.limit));
console.log(`${todo.length} trips to extract with ${model} (cached results are reused). Budget cap $${maxUsd.toFixed(2)}.`);

const client = new Anthropic();
let spent = 0;
let failures = 0;
let stopped = false;

async function worker(queue: SeedTrip[]): Promise<void> {
  for (let t = queue.shift(); t && !stopped; t = queue.shift()) {
    if (spent >= maxUsd) {
      stopped = true;
      console.error(`Budget cap reached at $${spent.toFixed(4)}; stopping.`);
      return;
    }
    try {
      const result: ExtractionResult = await extractTrip(client, t.id, t.emails, model);
      spent += result.cost_usd;
      writeFileSync(cachePath(t.id), `${JSON.stringify(result, null, 2)}\n`);
      console.log(`${t.id} ok  ${result.usage.input_tokens} in / ${result.usage.output_tokens} out  $${result.cost_usd.toFixed(4)}`);
    } catch (err: unknown) {
      failures++;
      if (err instanceof Anthropic.AuthenticationError) {
        stopped = true;
        console.error("Anthropic API key was rejected.");
        return;
      }
      if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.APIConnectionError) {
        console.error(`${t.id} transient error after SDK retries: ${err.message}`);
      } else {
        console.error(`${t.id} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
}

const queue = [...todo];
Promise.all(Array.from({ length: Number(values.concurrency) }, () => worker(queue))).then(() => {
  console.log(`Done. Spent $${spent.toFixed(4)} this run. ${failures} failed.`);
  if (failures > 0 || stopped) process.exit(1);
});
