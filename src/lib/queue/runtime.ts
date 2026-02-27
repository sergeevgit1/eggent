import { Queue, QueueEvents, Worker } from "bullmq";
import { nanoid } from "nanoid";
import { createHash } from "node:crypto";
import { handleExternalMessage } from "@/lib/external/handle-external-message";
import { toTelegramHtml, toTelegramPlainText } from "@/lib/integrations/telegram-format";
import {
  createTaskRecord,
  findTaskByIdempotencyKey,
  getTaskRecord,
  listTaskRecords,
  updateTaskRecord,
} from "@/lib/queue/store";
import type {
  CronRunTaskPayload,
  ExternalMessageTaskPayload,
  QueueTaskRecord,
  TelegramSendTaskPayload,
  TelegramUpdateTaskPayload,
} from "@/lib/queue/types";

const QUEUE_NAME = "eggent-tasks";

type EnqueueExternalMessageInput = ExternalMessageTaskPayload & {
  idempotencyKey?: string;
  maxAttempts?: number;
};

type EnqueueCronRunInput = CronRunTaskPayload & {
  idempotencyKey?: string;
  maxAttempts?: number;
};

type EnqueueTelegramSendInput = TelegramSendTaskPayload & {
  idempotencyKey?: string;
  maxAttempts?: number;
};

type EnqueueTelegramUpdateInput = TelegramUpdateTaskPayload & {
  idempotencyKey?: string;
  maxAttempts?: number;
};

type QueueBootstrap = {
  queue: Queue;
  events: QueueEvents;
  worker: Worker;
  watchdog: NodeJS.Timeout;
};

let boot: QueueBootstrap | null = null;

function getRedisConnection() {
  const url = process.env.REDIS_URL?.trim() || "redis://127.0.0.1:6379";
  return { url };
}

function buildDefaultExternalMessageIdempotencyKey(payload: ExternalMessageTaskPayload): string {
  const hash = createHash("sha256");
  hash.update(payload.sessionId || "");
  hash.update("\n");
  hash.update(payload.message || "");
  hash.update("\n");
  hash.update(payload.projectId || "");
  hash.update("\n");
  hash.update(payload.chatId || "");
  return `extmsg:${hash.digest("hex")}`;
}

function buildDefaultCronRunIdempotencyKey(payload: CronRunTaskPayload): string {
  return `cron:${payload.projectId}:${payload.jobId}`;
}

function buildDefaultTelegramSendIdempotencyKey(payload: TelegramSendTaskPayload): string {
  const hash = createHash("sha256");
  hash.update(payload.botToken);
  hash.update("\n");
  hash.update(payload.chatId);
  hash.update("\n");
  hash.update(payload.text);
  return `tgsend:${hash.digest("hex")}`;
}

function buildDefaultTelegramUpdateIdempotencyKey(payload: TelegramUpdateTaskPayload): string {
  const maybeUpdateId = (payload.update as { update_id?: unknown } | null)?.update_id;
  if (typeof maybeUpdateId === "number" && Number.isInteger(maybeUpdateId)) {
    return `tgupd:${maybeUpdateId}`;
  }
  const hash = createHash("sha256");
  hash.update(JSON.stringify(payload.update ?? {}));
  return `tgupd:${hash.digest("hex")}`;
}

export function ensureQueueWorkerStarted(): QueueBootstrap {
  if (boot) return boot;

  const connection = getRedisConnection();
  const queue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 5,
      timeout: Number(process.env.QUEUE_JOB_TIMEOUT_MS || 180000),
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  });

  const events = new QueueEvents(QUEUE_NAME, { connection });

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const taskId = String(job.data?.taskId || "");
      if (!taskId) return;

      const task = await getTaskRecord(taskId);
      if (!task) return;
      if (task.status === "done") return;

      await updateTaskRecord(taskId, {
        status: "running",
        attempt: Math.max(task.attempt, job.attemptsMade + 1),
        error: undefined,
      });

      if (task.type === "external_message") {
        const payload = task.payload as ExternalMessageTaskPayload;
        const result = await handleExternalMessage(payload);
        await updateTaskRecord(taskId, {
          status: "done",
          result,
        });
        return;
      }

      if (task.type === "cron_run") {
        const payload = task.payload as CronRunTaskPayload;
        const mod = await import("@/lib/cron/service");
        const result = await mod.runClaimedCronJob(payload.projectId, payload.jobId);
        await updateTaskRecord(taskId, {
          status: "done",
          result,
        });
        return;
      }

      if (task.type === "telegram_send") {
        const payload = task.payload as TelegramSendTaskPayload;
        const plain = toTelegramPlainText(payload.text);
        const html = toTelegramHtml(payload.text);
        let response = await fetch(`https://api.telegram.org/bot${payload.botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: payload.chatId, text: html, parse_mode: "HTML" }),
        });
        let data = await response.json().catch(() => null);
        if (!response.ok || !(data && data.ok)) {
          response = await fetch(`https://api.telegram.org/bot${payload.botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: payload.chatId, text: plain }),
          });
          data = await response.json().catch(() => null);
        }
        if (!response.ok || !(data && data.ok)) {
          throw new Error(`Telegram sendMessage failed (${response.status})${data?.description ? `: ${data.description}` : ""}`);
        }
        await updateTaskRecord(taskId, {
          status: "done",
          result: data,
        });
        return;
      }

      if (task.type === "telegram_update") {
        const payload = task.payload as TelegramUpdateTaskPayload;
        const mod = await import("@/lib/integrations/telegram-processor");
        const result = await mod.processTelegramUpdate({
          botToken: payload.botToken,
          defaultProjectId: payload.defaultProjectId,
          allowedUserIds: payload.allowedUserIds,
          update: payload.update as any,
        });
        await updateTaskRecord(taskId, {
          status: "done",
          result,
        });
        return;
      }
    },
    { connection, concurrency: Number(process.env.QUEUE_CONCURRENCY || 3) }
  );

  worker.on("failed", async (job, error) => {
    const taskId = String(job?.data?.taskId || "");
    if (!taskId) return;
    const isDead = (job?.attemptsMade || 0) >= (job?.opts?.attempts || 1);
    await updateTaskRecord(taskId, {
      status: isDead ? "dead" : "retry_wait",
      attempt: Math.max(1, job?.attemptsMade || 1),
      error: error?.message || "Task failed",
    });

    if (!isDead) {
      // Auto self-heal for stalled/retry tasks by forcing requeue once failed callback fires
      await updateTaskRecord(taskId, { status: "queued" });
      await queue.add(String(job?.name || "task"), { taskId }, { attempts: job?.opts?.attempts || 5, jobId: taskId });
    }
  });

  const watchdog = setInterval(() => {
    void (async () => {
      const tasks = await listTaskRecords(1000);
      const cutoff = Date.now() - Number(process.env.QUEUE_STALLED_REQUEUE_MS || 90000);
      for (const task of tasks) {
        const updatedAtMs = Date.parse(task.updatedAt);
        const stale = Number.isFinite(updatedAtMs) && updatedAtMs < cutoff;
        if ((task.status === "running" || task.status === "retry_wait") && stale) {
          await updateTaskRecord(task.id, { status: "queued", error: task.error || "auto-requeued by watchdog" });
          await queue.add(task.type, { taskId: task.id }, { attempts: task.maxAttempts, jobId: task.id });
        }
      }
    })();
  }, Number(process.env.QUEUE_WATCHDOG_INTERVAL_MS || 30000));

  boot = { queue, events, worker, watchdog };

  void (async () => {
    const tasks = await listTaskRecords(1000);
    const cutoff = Date.now() - 2 * 60_000;
    for (const task of tasks) {
      const updatedAtMs = Date.parse(task.updatedAt);
      if (task.status === "running" && Number.isFinite(updatedAtMs) && updatedAtMs < cutoff) {
        await updateTaskRecord(task.id, { status: "queued" });
        await queue.add(task.type, { taskId: task.id }, { attempts: task.maxAttempts, jobId: task.id });
      }
      if (task.status === "retry_wait") {
        await queue.add(task.type, { taskId: task.id }, { attempts: task.maxAttempts, jobId: task.id });
      }
    }
  })();

  return boot;
}

export async function enqueueExternalMessageTask(
  input: EnqueueExternalMessageInput
): Promise<QueueTaskRecord> {
  const idempotencyKey = input.idempotencyKey?.trim() || buildDefaultExternalMessageIdempotencyKey(input);
  const existing = await findTaskByIdempotencyKey(idempotencyKey);
  if (existing) {
    return existing;
  }

  const task: QueueTaskRecord = {
    id: nanoid(),
    type: "external_message",
    payload: {
      sessionId: input.sessionId,
      message: input.message,
      projectId: input.projectId,
      chatId: input.chatId,
      currentPath: input.currentPath,
    },
    status: "queued",
    idempotencyKey,
    attempt: 0,
    maxAttempts: Math.max(1, Math.floor(input.maxAttempts ?? 5)),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await createTaskRecord(task);
  const { queue } = ensureQueueWorkerStarted();
  await queue.add(task.type, { taskId: task.id }, { attempts: task.maxAttempts, jobId: task.id });
  return task;
}

export async function enqueueCronRunTask(input: EnqueueCronRunInput): Promise<QueueTaskRecord> {
  const idempotencyKey = input.idempotencyKey?.trim() || buildDefaultCronRunIdempotencyKey(input);
  const existing = await findTaskByIdempotencyKey(idempotencyKey);
  if (existing && (existing.status === "queued" || existing.status === "running" || existing.status === "retry_wait")) {
    return existing;
  }

  const task: QueueTaskRecord = {
    id: nanoid(),
    type: "cron_run",
    payload: { projectId: input.projectId, jobId: input.jobId },
    status: "queued",
    idempotencyKey,
    attempt: 0,
    maxAttempts: Math.max(1, Math.floor(input.maxAttempts ?? 5)),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await createTaskRecord(task);
  const { queue } = ensureQueueWorkerStarted();
  await queue.add(task.type, { taskId: task.id }, { attempts: task.maxAttempts, jobId: task.id });
  return task;
}

export async function enqueueTelegramSendTask(input: EnqueueTelegramSendInput): Promise<QueueTaskRecord> {
  const idempotencyKey = input.idempotencyKey?.trim() || buildDefaultTelegramSendIdempotencyKey(input);
  const existing = await findTaskByIdempotencyKey(idempotencyKey);
  if (existing && (existing.status === "queued" || existing.status === "running" || existing.status === "retry_wait")) {
    return existing;
  }

  const task: QueueTaskRecord = {
    id: nanoid(),
    type: "telegram_send",
    payload: { botToken: input.botToken, chatId: input.chatId, text: input.text },
    status: "queued",
    idempotencyKey,
    attempt: 0,
    maxAttempts: Math.max(1, Math.floor(input.maxAttempts ?? 5)),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await createTaskRecord(task);
  const { queue } = ensureQueueWorkerStarted();
  await queue.add(task.type, { taskId: task.id }, { attempts: task.maxAttempts, jobId: task.id });
  return task;
}

export async function enqueueTelegramUpdateTask(input: EnqueueTelegramUpdateInput): Promise<QueueTaskRecord> {
  const idempotencyKey = input.idempotencyKey?.trim() || buildDefaultTelegramUpdateIdempotencyKey(input);
  const existing = await findTaskByIdempotencyKey(idempotencyKey);
  if (existing && (existing.status === "queued" || existing.status === "running" || existing.status === "retry_wait" || existing.status === "done")) {
    return existing;
  }

  const task: QueueTaskRecord = {
    id: nanoid(),
    type: "telegram_update",
    payload: {
      botToken: input.botToken,
      defaultProjectId: input.defaultProjectId,
      allowedUserIds: input.allowedUserIds,
      update: input.update,
    },
    status: "queued",
    idempotencyKey,
    attempt: 0,
    maxAttempts: Math.max(1, Math.floor(input.maxAttempts ?? 5)),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await createTaskRecord(task);
  const { queue } = ensureQueueWorkerStarted();
  await queue.add(task.type, { taskId: task.id }, { attempts: task.maxAttempts, jobId: task.id });
  return task;
}

export async function waitForTaskResult(taskId: string, timeoutMs = 30_000): Promise<QueueTaskRecord | null> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const current = await getTaskRecord(taskId);
    if (!current) return null;
    if (current.status === "done" || current.status === "dead" || current.status === "failed") {
      return current;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return await getTaskRecord(taskId);
}
