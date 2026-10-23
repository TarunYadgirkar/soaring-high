export type Airport = {
  code: string;
  city: string;
  country: string;
  tz: string;
};

const LIST: Airport[] = [
  { code: "ATL", city: "Atlanta", country: "US", tz: "America/New_York" },
  { code: "AUS", city: "Austin", country: "US", tz: "America/Chicago" },
  { code: "BOS", city: "Boston", country: "US", tz: "America/New_York" },
  { code: "BWI", city: "Baltimore", country: "US", tz: "America/New_York" },
  { code: "CLT", city: "Charlotte", country: "US", tz: "America/New_York" },
  { code: "DCA", city: "Washington", country: "US", tz: "America/New_York" },
  { code: "DEN", city: "Denver", country: "US", tz: "America/Denver" },
  { code: "DFW", city: "Dallas", country: "US", tz: "America/Chicago" },
  { code: "EWR", city: "Newark", country: "US", tz: "America/New_York" },
  { code: "IAD", city: "Washington", country: "US", tz: "America/New_York" },
  { code: "JFK", city: "New York", country: "US", tz: "America/New_York" },
  { code: "LAS", city: "Las Vegas", country: "US", tz: "America/Los_Angeles" },
  { code: "LAX", city: "Los Angeles", country: "US", tz: "America/Los_Angeles" },
  { code: "LGA", city: "New York", country: "US", tz: "America/New_York" },
  { code: "MCO", city: "Orlando", country: "US", tz: "America/New_York" },
  { code: "MIA", city: "Miami", country: "US", tz: "America/New_York" },
  { code: "MSP", city: "Minneapolis", country: "US", tz: "America/Chicago" },
  { code: "OAK", city: "Oakland", country: "US", tz: "America/Los_Angeles" },
  { code: "ORD", city: "Chicago", country: "US", tz: "America/Chicago" },
  { code: "PDX", city: "Portland", country: "US", tz: "America/Los_Angeles" },
  { code: "PHX", city: "Phoenix", country: "US", tz: "America/Phoenix" },
  { code: "SAN", city: "San Diego", country: "US", tz: "America/Los_Angeles" },
  { code: "SEA", city: "Seattle", country: "US", tz: "America/Los_Angeles" },
  { code: "SFO", city: "San Francisco", country: "US", tz: "America/Los_Angeles" },
  { code: "SJC", city: "San Jose", country: "US", tz: "America/Los_Angeles" },
  { code: "SLC", city: "Salt Lake City", country: "US", tz: "America/Denver" },
  { code: "CDG", city: "Paris", country: "FR", tz: "Europe/Paris" },
  { code: "FRA", city: "Frankfurt", country: "DE", tz: "Europe/Berlin" },
  { code: "LHR", city: "London", country: "GB", tz: "Europe/London" },
  { code: "NRT", city: "Tokyo", country: "JP", tz: "Asia/Tokyo" },
  { code: "YYZ", city: "Toronto", country: "CA", tz: "America/Toronto" },
];

const BY_CODE = new Map(LIST.map((a) => [a.code, a]));

export function airport(code: string): Airport {
  const found = BY_CODE.get(code);
  if (!found) throw new Error(`Unknown airport ${code}`);
  return found;
}

export function isUS(code: string): boolean {
  return airport(code).country === "US";
}
