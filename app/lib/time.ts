import { airport } from "./airports";

function offsetMinutes(ms: number, tz: string): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" })
    .formatToParts(new Date(ms))
    .find((p) => p.type === "timeZoneName")?.value;
  if (!name || name === "GMT") return 0;
  const sign = name[3] === "-" ? -1 : 1;
  return sign * (Number(name.slice(4, 6)) * 60 + Number(name.slice(7, 9)));
}

function offsetString(min: number): string {
  const sign = min < 0 ? "-" : "+";
  const abs = Math.abs(min);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

export function isoAt(ms: number, airportCode: string): string {
  const off = offsetMinutes(ms, airport(airportCode).tz);
  return `${new Date(ms + off * 60_000).toISOString().slice(0, 19)}${offsetString(off)}`;
}

// "2026-09-14 08:05" local to the airport -> epoch ms.
export function localMs(local: string, airportCode: string): number {
  const tz = airport(airportCode).tz;
  const guess = Date.parse(`${local.replace(" ", "T")}:00Z`);
  const first = guess - offsetMinutes(guess, tz) * 60_000;
  return guess - offsetMinutes(first, tz) * 60_000;
}

export function human(iso: string, airportCode: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: airport(airportCode).tz,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export const MIN = 60_000;
export const HOUR = 60 * MIN;
