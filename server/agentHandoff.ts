import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { z } from "zod";
import { ENV } from "./_core/env";
import { OLOGYCREW_PUBLIC_ORIGIN } from "../shared/publicUrls";

const TOKEN_VERSION = "v1";
const TOKEN_AAD = Buffer.from("ologycrew-agent-handoff-v1", "utf8");
export const AGENT_HANDOFF_TTL_SECONDS = 30 * 60;

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Invalid calendar date");

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

function optionalTrimmedText(max: number) {
  return z.string().trim().min(1).max(max).optional();
}

export const agentHandoffRequestSchema = z.object({
  serviceId: z.number().int().positive(),
  intent: optionalTrimmedText(500),
  location: optionalTrimmedText(300),
  timing: optionalTrimmedText(200),
  preferredDate: dateSchema.optional(),
  preferredTime: timeSchema.optional(),
}).strict();

export type AgentHandoffRequest = z.infer<typeof agentHandoffRequestSchema>;
export type AgentHandoffMode = "direct" | "quote";

export type AgentHandoffPayload = AgentHandoffRequest & {
  version: 1;
  mode: AgentHandoffMode;
  issuedAt: number;
  expiresAt: number;
};

const payloadSchema = agentHandoffRequestSchema.extend({
  version: z.literal(1),
  mode: z.enum(["direct", "quote"]),
  issuedAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().positive(),
}).strict();

function requireSecret(secret: string): string {
  if (!secret || secret.length < 16) {
    throw new Error("Agent handoff signing secret is unavailable");
  }
  return secret;
}

function deriveKey(secret: string): Buffer {
  return createHash("sha256")
    .update(`${requireSecret(secret)}:ologycrew-agent-handoff:v1`)
    .digest();
}

function decodeCanonicalBase64Url(value: string, expectedLength?: number): Buffer {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid agent handoff token");
  const decoded = Buffer.from(value, "base64url");
  if (decoded.length === 0 || decoded.toString("base64url") !== value) {
    throw new Error("Invalid agent handoff token");
  }
  if (expectedLength !== undefined && decoded.length !== expectedLength) {
    throw new Error("Invalid agent handoff token");
  }
  return decoded;
}

export function createAgentHandoffToken(
  request: AgentHandoffRequest,
  mode: AgentHandoffMode,
  options: { secret?: string; now?: Date; ttlSeconds?: number } = {},
): { token: string; expiresAt: string } {
  const input = agentHandoffRequestSchema.parse(request);
  const now = options.now ?? new Date();
  const issuedAt = Math.floor(now.getTime() / 1000);
  const ttlSeconds = Math.min(Math.max(options.ttlSeconds ?? AGENT_HANDOFF_TTL_SECONDS, 60), AGENT_HANDOFF_TTL_SECONDS);
  const payload: AgentHandoffPayload = {
    version: 1,
    ...input,
    mode,
    issuedAt,
    expiresAt: issuedAt + ttlSeconds,
  };

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(options.secret ?? ENV.agentHandoffSecret), iv);
  cipher.setAAD(TOKEN_AAD);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  const token = [
    TOKEN_VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");

  return {
    token,
    expiresAt: new Date(payload.expiresAt * 1000).toISOString(),
  };
}

export function resolveAgentHandoffToken(
  token: string,
  options: { secret?: string; now?: Date } = {},
): AgentHandoffPayload {
  const [version, ivValue, authTagValue, ciphertextValue, extra] = token.split(".");
  if (version !== TOKEN_VERSION || !ivValue || !authTagValue || !ciphertextValue || extra) {
    throw new Error("Invalid agent handoff token");
  }

  try {
    const iv = decodeCanonicalBase64Url(ivValue, 12);
    const authTag = decodeCanonicalBase64Url(authTagValue, 16);
    const ciphertext = decodeCanonicalBase64Url(ciphertextValue);
    const decipher = createDecipheriv(
      "aes-256-gcm",
      deriveKey(options.secret ?? ENV.agentHandoffSecret),
      iv,
    );
    decipher.setAAD(TOKEN_AAD);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
    const payload = payloadSchema.parse(JSON.parse(plaintext));
    const nowSeconds = Math.floor((options.now ?? new Date()).getTime() / 1000);

    if (payload.expiresAt <= nowSeconds) throw new Error("Agent handoff token expired");
    if (payload.issuedAt > nowSeconds + 60) throw new Error("Agent handoff token is not active");
    return payload;
  } catch (error) {
    if (error instanceof Error && error.message === "Agent handoff token expired") throw error;
    throw new Error("Invalid agent handoff token");
  }
}

export function buildAgentHandoffReviewUrl(serviceId: number, token: string): string {
  const params = new URLSearchParams({ entry: "agent", handoff: token });
  return `${OLOGYCREW_PUBLIC_ORIGIN}/service/${serviceId}?${params.toString()}`;
}
