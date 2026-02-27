export type QueueTaskType = "external_message" | "cron_run" | "telegram_send" | "telegram_update";

export type QueueTaskStatus =
  | "queued"
  | "running"
  | "retry_wait"
  | "done"
  | "failed"
  | "dead";

export interface ExternalMessageTaskPayload {
  sessionId: string;
  message: string;
  projectId?: string;
  chatId?: string;
  currentPath?: string;
}

export interface CronRunTaskPayload {
  projectId: string;
  jobId: string;
}

export interface TelegramSendTaskPayload {
  botToken: string;
  chatId: string;
  text: string;
}

export interface TelegramUpdateTaskPayload {
  botToken: string;
  defaultProjectId?: string;
  allowedUserIds: string[];
  update: unknown;
}

export type QueueTaskPayload =
  | ExternalMessageTaskPayload
  | CronRunTaskPayload
  | TelegramSendTaskPayload
  | TelegramUpdateTaskPayload;

export interface QueueTaskRecord {
  id: string;
  type: QueueTaskType;
  payload: QueueTaskPayload;
  status: QueueTaskStatus;
  idempotencyKey: string;
  attempt: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
  result?: unknown;
  error?: string;
}

export interface QueueStoreFile {
  version: 1;
  tasks: QueueTaskRecord[];
}
