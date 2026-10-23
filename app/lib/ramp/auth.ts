import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";

export const RAMP_DEMO_MCP_URL = "https://demo-mcp.ramp.com/mcp";
export const CALLBACK_PORT = 8765;
const REDIRECT_URL = `http://localhost:${CALLBACK_PORT}/callback`;
const SCOPES = "transactions:read trips:read users:read";

// Client registration, tokens and the PKCE verifier live in app/.ramp/ (gitignored, 0600).
export class FileOAuthProvider implements OAuthClientProvider {
  constructor(
    private readonly dir: string,
    private readonly onAuthorize: (url: URL) => void = () => {
      throw new Error("Ramp login needed: run `pnpm ramp:login`");
    },
  ) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  private read<T>(name: string): T | undefined {
    const path = join(this.dir, name);
    return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : undefined;
  }

  private write(name: string, value: unknown): void {
    const path = join(this.dir, name);
    writeFileSync(path, JSON.stringify(value, null, 2), { mode: 0o600 });
    chmodSync(path, 0o600);
  }

  get redirectUrl(): string {
    return REDIRECT_URL;
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: "Soaring High (BBS x Ramp hackathon)",
      redirect_uris: [REDIRECT_URL],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: SCOPES,
    };
  }

  clientInformation(): OAuthClientInformationMixed | undefined {
    return this.read("client.json");
  }

  saveClientInformation(info: OAuthClientInformationMixed): void {
    this.write("client.json", info);
  }

  tokens(): OAuthTokens | undefined {
    return this.read("tokens.json");
  }

  saveTokens(tokens: OAuthTokens): void {
    this.write("tokens.json", tokens);
  }

  // The MCP SDK requests every scope the server advertises, including write scopes
  // such as funds:write. Soaring High only reads, so narrow the request.
  redirectToAuthorization(url: URL): void {
    const narrowed = new URL(url);
    narrowed.searchParams.set("scope", SCOPES);
    this.onAuthorize(narrowed);
  }

  saveCodeVerifier(verifier: string): void {
    this.write("verifier.json", verifier);
  }

  codeVerifier(): string {
    const v = this.read<string>("verifier.json");
    if (!v) throw new Error("No PKCE verifier saved; restart `pnpm ramp:login`");
    return v;
  }
}

export function rampDir(): string {
  return join(import.meta.dirname, "../../.ramp");
}
