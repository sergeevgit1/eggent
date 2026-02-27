import fs from "fs/promises";
import path from "path";
import type { QueueStoreFile, QueueTaskRecord, QueueTaskStatus } from "@/lib/queue/types";

const storeLocks = new Map<string, Promise<void>>();

function resolveStorePath(): string {
  const root = process.cwd();
  return path.join(root, "data", "queue", "jobs.json");
}

async function resolveChain(promise: Promise<unknown>): Promise<void> {
  await promise.then(
    () => undefined,
    () => undefined
  );
}

async function withStoreLock<T>(storePath: string, fn: () => Promise<T>): Promise<T> {
  const resolved = path.resolve(storePath);
  const previous = storeLocks.get(resolved) ?? Promise.resolve();
  const next = resolveChain(previous).then(fn);
  storeLocks.set(resolved, resolveChain(next));
  return await next;
}

async function loadStoreUnsafe(storePath: string): Promise<QueueStoreFile> {
  try {
    const raw = await fs.readFile(storePath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<QueueStoreFile>;
    return {
      version: 1,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks.filter(Boolean) : [],
    };
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") {
      return { version: 1, tasks: [] };
    }
    throw error;
  }
}

async function saveStoreUnsafe(storePath: string, store: QueueStoreFile): Promise<void> {
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  const tmp = `${storePath}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(store, null, 2), "utf-8");
  await fs.rename(tmp, storePath);
}

export async function createTaskRecord(task: QueueTaskRecord): Promise<void> {
  const storePath = resolveStorePath();
  await withStoreLock(storePath, async () => {
    const store = await loadStoreUnsafe(storePath);
    store.tasks.push(task);
    await saveStoreUnsafe(storePath, store);
  });
}

export async function getTaskRecord(id: string): Promise<QueueTaskRecord | null> {
  const storePath = resolveStorePath();
  return await withStoreLock(storePath, async () => {
    const store = await loadStoreUnsafe(storePath);
    return store.tasks.find((task) => task.id === id) ?? null;
  });
}

export async function updateTaskRecord(
  id: string,
  patch: Partial<QueueTaskRecord> & { status?: QueueTaskStatus }
): Promise<QueueTaskRecord | null> {
  const storePath = resolveStorePath();
  return await withStoreLock(storePath, async () => {
    const store = await loadStoreUnsafe(storePath);
    const idx = store.tasks.findIndex((task) => task.id === id);
    if (idx === -1) return null;
    const current = store.tasks[idx];
    const next: QueueTaskRecord = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    store.tasks[idx] = next;
    await saveStoreUnsafe(storePath, store);
    return next;
  });
}

export async function findTaskByIdempotencyKey(key: string): Promise<QueueTaskRecord | null> {
  const storePath = resolveStorePath();
  return await withStoreLock(storePath, async () => {
    const store = await loadStoreUnsafe(storePath);
    return store.tasks.find((task) => task.idempotencyKey === key) ?? null;
  });
}

export async function listTaskRecords(limit = 100): Promise<QueueTaskRecord[]> {
  const storePath = resolveStorePath();
  return await withStoreLock(storePath, async () => {
    const store = await loadStoreUnsafe(storePath);
    return [...store.tasks]
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      .slice(0, Math.max(1, Math.min(limit, 1000)));
  });
}
