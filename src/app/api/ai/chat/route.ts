import OpenAI from "openai";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
// Sinh đoạn văn có thể mất hơn 1 phút; nới hạn cho route này
export const maxDuration = 180;

const UPSTREAM_TIMEOUT_MS = 170_000;
const MAX_ERROR_CHARS = 400;

interface ChatRequestBody {
  messages?: unknown;
  temperature?: unknown;
}

/** Lỗi do thiếu biến môi trường cấu hình model */
class AiConfigError extends Error {}

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

function readEnv() {
  return {
    apiKey: (process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || "").trim(),
    baseUrl: (process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL || "").trim(),
    model: (process.env.LLM_MODEL || process.env.OPENAI_MODEL || "").trim(),
  };
}

function createClient() {
  const { apiKey, baseUrl, model } = readEnv();

  if (!apiKey) throw new AiConfigError("Thiếu biến môi trường LLM_API_KEY.");
  if (!model) throw new AiConfigError("Thiếu biến môi trường LLM_MODEL.");

  return {
    model,
    client: new OpenAI({
      apiKey,
      ...(baseUrl ? { baseURL: baseUrl } : {}),
      timeout: UPSTREAM_TIMEOUT_MS,
      maxRetries: 1,
    }),
  };
}

function normalizeMessages(raw: unknown): OpenAI.Chat.ChatCompletionMessageParam[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  for (const item of raw) {
    const role = (item as { role?: unknown })?.role;
    const content = (item as { content?: unknown })?.content;
    if (typeof role !== "string" || typeof content !== "string" || !content.trim()) return null;
    if (role !== "system" && role !== "user" && role !== "assistant") return null;
    messages.push({ role, content });
  }
  return messages;
}

function extractUpstreamError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const text = message.trim() || "lỗi không xác định";
  return text.length > MAX_ERROR_CHARS ? `${text.slice(0, MAX_ERROR_CHARS)}…` : text;
}

/** Cho giao diện biết server đã có đủ biến môi trường để gọi model chưa */
export async function GET(): Promise<Response> {
  const { apiKey, model } = readEnv();
  return Response.json({ configured: !!apiKey && !!model, model: model || null });
}

/**
 * Proxy gọi model qua OpenAI SDK. API key nằm ở server (biến môi trường),
 * không bao giờ gửi xuống trình duyệt.
 */
export async function POST(request: NextRequest): Promise<Response> {
  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return jsonError("Body không phải JSON hợp lệ.", 400);
  }

  const messages = normalizeMessages(body.messages);
  if (!messages) return jsonError("Thiếu nội dung messages gửi cho model.", 400);
  const temperature = typeof body.temperature === "number" ? body.temperature : 0.85;

  let model: string;
  let client: OpenAI;
  try {
    ({ model, client } = createClient());
  } catch (err) {
    if (err instanceof AiConfigError) {
      return jsonError(`${err.message} Hãy khai báo trong .env rồi khởi động lại server.`, 503);
    }
    throw err;
  }

  try {
    const completion = await client.chat.completions.create({
      model,
      messages,
      temperature,
      stream: false,
    });

    const content = completion.choices?.[0]?.message?.content ?? "";
    if (!content.trim()) {
      return jsonError("Model không trả về nội dung nào.", 502);
    }

    return Response.json({
      content,
      model: completion.model || model,
      usage: completion.usage ?? null,
    });
  } catch (err) {
    if (err instanceof OpenAI.APIConnectionTimeoutError) {
      return jsonError("Model phản hồi quá lâu. Hãy thử lại hoặc đổi model.", 504);
    }
    if (err instanceof OpenAI.APIError) {
      return jsonError(`Model trả về lỗi: ${extractUpstreamError(err)}`, 502);
    }
    return jsonError(`Không gọi được model: ${extractUpstreamError(err)}`, 502);
  }
}
