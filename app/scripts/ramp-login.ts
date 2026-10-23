import { execFile } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import { CALLBACK_PORT, FileOAuthProvider, rampDir } from "../lib/ramp/auth";
import { connectRamp, rampTransport } from "../lib/ramp/mcp";

const LOGIN_TIMEOUT_MS = 60 * 60_000;

function waitForCode(expectedState: () => string | undefined): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost:${CALLBACK_PORT}`);
      if (url.pathname !== "/callback") {
        res.writeHead(404).end();
        return;
      }
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      const state = url.searchParams.get("state");
      const expected = expectedState();
      if (error || !code || (expected && state !== expected)) {
        res.writeHead(400, { "content-type": "text/plain" }).end("Ramp login failed. Check the terminal.");
        server.close();
        reject(new Error(error ? `Ramp returned error: ${error}` : "Callback missing code or state mismatch"));
        return;
      }
      res.writeHead(200, { "content-type": "text/plain" }).end("Ramp login complete. You can close this tab.");
      server.close();
      resolve(code);
    });
    server.listen(CALLBACK_PORT, "127.0.0.1");
    setTimeout(() => {
      server.close();
      reject(new Error("Timed out waiting for the Ramp login"));
    }, LOGIN_TIMEOUT_MS).unref();
  });
}

async function main(): Promise<void> {
  let authState: string | undefined;
  const provider = new FileOAuthProvider(rampDir(), (url) => {
    authState = url.searchParams.get("state") ?? undefined;
    console.log(`\nOpen this URL in a browser on this machine and approve access:\n\n${url.toString()}\n`);
    execFile("open", [url.toString()], () => undefined);
  });

  const transport = rampTransport(provider);
  try {
    await connectRamp(transport);
    console.log("Already logged in to the Ramp demo MCP.");
  } catch (err: unknown) {
    if (!(err instanceof UnauthorizedError)) throw err;
    const code = await waitForCode(() => authState);
    await transport.finishAuth(code);
    console.log("Token saved to app/.ramp/tokens.json");
  }

  const conn = await connectRamp(rampTransport(provider));
  const { tools } = await conn.client.listTools();
  const outDir = join(import.meta.dirname, "../data/ramp");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "tools.json"), `${JSON.stringify(tools, null, 2)}\n`);
  console.log(`Ramp demo MCP exposes ${tools.length} tools; list written to data/ramp/tools.json`);
  await conn.client.close();
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
