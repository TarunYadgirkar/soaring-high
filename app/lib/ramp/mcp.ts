import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { FileOAuthProvider, RAMP_DEMO_MCP_URL, rampDir } from "./auth";

export type RampConnection = {
  client: Client;
  transport: StreamableHTTPClientTransport;
};

export function rampTransport(provider: FileOAuthProvider = new FileOAuthProvider(rampDir())): StreamableHTTPClientTransport {
  return new StreamableHTTPClientTransport(new URL(RAMP_DEMO_MCP_URL), { authProvider: provider });
}

export async function connectRamp(transport: StreamableHTTPClientTransport = rampTransport()): Promise<RampConnection> {
  const client = new Client({ name: "soaring-high", version: "0.1.0" });
  await client.connect(transport);
  return { client, transport };
}

// MCP tool results come back as text content blocks holding JSON.
export async function callRampTool(conn: RampConnection, name: string, args: Record<string, unknown>): Promise<unknown> {
  const result = await conn.client.callTool({ name, arguments: args });
  if (result.isError) {
    throw new Error(`Ramp tool ${name} failed: ${JSON.stringify(result.content)}`);
  }
  const blocks = Array.isArray(result.content) ? result.content : [];
  const text = blocks
    .filter((b): b is { type: "text"; text: string } => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
