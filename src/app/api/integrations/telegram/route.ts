import { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { claimTelegramUpdate, releaseTelegramUpdate } from "@/lib/storage/telegram-update-store";
import { getTelegramIntegrationRuntimeConfig } from "@/lib/storage/telegram-integration-store";
import { enqueueTelegramUpdateTask, ensureQueueWorkerStarted } from "@/lib/queue/runtime";

interface TelegramUpdate {
  update_id?: unknown;
}

function safeTokenMatch(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length) return false;
  return timingSafeEqual(actualBytes, expectedBytes);
}

function getBotId(botToken: string): string {
  const [rawBotId] = botToken.trim().split(":", 1);
  const botId = rawBotId?.trim() || "default";
  return botId.replace(/[^a-zA-Z0-9._:-]/g, "_").slice(0, 128) || "default";
}

export const maxDuration = 300;

export async function GET() {
  return Response.json({
    status: "ok",
    integration: "telegram",
    mode: "queued",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  const runtime = await getTelegramIntegrationRuntimeConfig();
  const botToken = runtime.botToken.trim();
  const webhookSecret = runtime.webhookSecret.trim();

  if (!botToken || !webhookSecret) {
    return Response.json(
      { error: "Telegram integration is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET." },
      { status: 503 }
    );
  }

  const providedSecret = req.headers.get("x-telegram-bot-api-secret-token")?.trim();
  if (!providedSecret || !safeTokenMatch(providedSecret, webhookSecret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as TelegramUpdate;
  const updateId =
    typeof body.update_id === "number" && Number.isInteger(body.update_id)
      ? body.update_id
      : null;
  if (updateId === null) {
    return Response.json({ error: "Invalid update_id" }, { status: 400 });
  }

  const botId = getBotId(botToken);
  const isNewUpdate = await claimTelegramUpdate(botId, updateId);
  if (!isNewUpdate) {
    return Response.json({ ok: true, duplicate: true, dedup: "update_store" });
  }

  try {
    ensureQueueWorkerStarted();
    const task = await enqueueTelegramUpdateTask({
      botToken,
      defaultProjectId: runtime.defaultProjectId || undefined,
      allowedUserIds: runtime.allowedUserIds,
      update: body,
      idempotencyKey: `tgupd:${botId}:${updateId}`,
      maxAttempts: 5,
    });

    return Response.json({ ok: true, accepted: true, taskId: task.id, queued: true });
  } catch (error) {
    await releaseTelegramUpdate(botId, updateId).catch(() => undefined);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to enqueue telegram update" },
      { status: 500 }
    );
  }
}
