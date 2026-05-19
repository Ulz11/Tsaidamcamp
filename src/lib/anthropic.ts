import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function hasAnthropicKey(): boolean {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return false;
  if (key.startsWith("your-")) return false;
  return true;
}

export function getAnthropic(): Anthropic {
  if (_client) return _client;
  if (!hasAnthropicKey()) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

// Default to Haiku 4.5 — ~5× cheaper than Sonnet and accurate enough for
// structured booking-sheet extraction. Override with ANTHROPIC_PDF_MODEL.
export const PDF_PARSE_MODEL =
  process.env.ANTHROPIC_PDF_MODEL || "claude-haiku-4-5-20251001";
