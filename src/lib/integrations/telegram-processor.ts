import {
  ExternalMessageError,
  handleExternalMessage,
} from "@/lib/external/handle-external-message";
import {
  createDefaultTelegramSessionId,
  createFreshTelegramSessionId,
  getTelegramChatSessionId,
  setTelegramChatSessionId,
} from "@/lib/storage/telegram-session-store";
import {
  consumeTelegramAccessCode,
  normalizeTelegramUserId,
} from "@/lib/storage/telegram-integration-store";
import { saveChatFile } from "@/lib/storage/chat-files-store";
import { createChat, getChat } from "@/lib/storage/chat-store";
import {
  contextKey,
  type ExternalSession,
  getOrCreateExternalSession,
  saveExternalSession,
} from "@/lib/storage/external-session-store";
import { getAllProjects } from "@/lib/storage/project-store";

import {
  splitTelegramText,
  toTelegramHtml,
  toTelegramPlainText,
} from "@/lib/integrations/telegram-format";

const TELEGRAM_FILE_MAX_BYTES = 30 * 1024 * 1024;

export interface TelegramUpdatePayload {
  update_id?: unknown;
  message?: TelegramMessage;
}
interface TelegramMessage {
  message_id?: unknown;
  text?: unknown;
  caption?: unknown;
  from?: { id?: unknown };
  chat?: { id?: unknown; type?: unknown };
  document?: { file_id?: unknown; file_name?: unknown; mime_type?: unknown };
  photo?: Array<{ file_id?: unknown; width?: unknown; height?: unknown }>;
  audio?: { file_id?: unknown; file_name?: unknown; mime_type?: unknown };
  video?: { file_id?: unknown; file_name?: unknown; mime_type?: unknown };
  voice?: { file_id?: unknown; mime_type?: unknown };
}
interface TelegramApiResponse { ok?: boolean; description?: string; result?: Record<string, unknown> }

interface TelegramIncomingFile { fileId: string; fileName: string }
interface TelegramExternalChatContext { chatId: string; projectId?: string; currentPath: string }

function normalizeTelegramCurrentPath(rawPath: string | undefined): string {
  const value = (rawPath ?? "").trim();
  if (!value || value === "/telegram") return "";
  return value;
}

function parseTelegramError(status: number, payload: TelegramApiResponse | null): string {
  const description = payload?.description?.trim();
  return description ? `Ошибка Telegram API (${status}): ${description}` : `Ошибка Telegram API (${status})`;
}

async function callTelegramApi(botToken: string, method: string, body?: Record<string, unknown>): Promise<TelegramApiResponse> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await response.json().catch(() => null)) as TelegramApiResponse | null;
  if (!response.ok || !payload?.ok) throw new Error(parseTelegramError(response.status, payload));
  return payload;
}

function extensionFromMime(mimeType: string): string {
  const lower = mimeType.toLowerCase();
  if (lower.includes("pdf")) return ".pdf";
  if (lower.includes("png")) return ".png";
  if (lower.includes("jpeg") || lower.includes("jpg")) return ".jpg";
  if (lower.includes("webp")) return ".webp";
  if (lower.includes("gif")) return ".gif";
  if (lower.includes("mp4")) return ".mp4";
  if (lower.includes("mpeg") || lower.includes("mp3")) return ".mp3";
  if (lower.includes("ogg")) return ".ogg";
  if (lower.includes("wav")) return ".wav";
  if (lower.includes("plain")) return ".txt";
  return "";
}

function buildIncomingFileName(params: { base: string; messageId?: number; mimeType?: string }): string {
  const suffix = params.messageId ?? Date.now();
  const ext = params.mimeType ? extensionFromMime(params.mimeType) : "";
  return `${params.base}-${suffix}${ext}`;
}
function sanitizeFileName(value: string): string { return value.trim().replace(/[\\/]+/g, "_") || `file-${Date.now()}`; }
function withMessageIdPrefix(fileName: string, messageId?: number): string { return typeof messageId === "number" ? `${messageId}-${fileName}` : fileName; }

function extractIncomingFile(message: TelegramMessage, messageId?: number): TelegramIncomingFile | null {
  const documentFileId = typeof message.document?.file_id === "string" ? message.document.file_id.trim() : "";
  if (documentFileId) {
    const docNameRaw = typeof message.document?.file_name === "string" ? message.document.file_name : "";
    const fallback = buildIncomingFileName({ base: "document", messageId, mimeType: typeof message.document?.mime_type === "string" ? message.document.mime_type : undefined });
    return { fileId: documentFileId, fileName: withMessageIdPrefix(sanitizeFileName(docNameRaw || fallback), messageId) };
  }
  const photos = Array.isArray(message.photo) ? message.photo : [];
  for (let i = photos.length - 1; i >= 0; i -= 1) {
    const fileId = typeof photos[i]?.file_id === "string" ? photos[i].file_id.trim() : "";
    if (fileId) return { fileId, fileName: sanitizeFileName(buildIncomingFileName({ base: "photo", messageId, mimeType: "image/jpeg" })) };
  }
  const audioFileId = typeof message.audio?.file_id === "string" ? message.audio.file_id.trim() : "";
  if (audioFileId) {
    const audioNameRaw = typeof message.audio?.file_name === "string" ? message.audio.file_name : "";
    const fallback = buildIncomingFileName({ base: "audio", messageId, mimeType: typeof message.audio?.mime_type === "string" ? message.audio.mime_type : undefined });
    return { fileId: audioFileId, fileName: withMessageIdPrefix(sanitizeFileName(audioNameRaw || fallback), messageId) };
  }
  const videoFileId = typeof message.video?.file_id === "string" ? message.video.file_id.trim() : "";
  if (videoFileId) {
    const videoNameRaw = typeof message.video?.file_name === "string" ? message.video.file_name : "";
    const fallback = buildIncomingFileName({ base: "video", messageId, mimeType: typeof message.video?.mime_type === "string" ? message.video.mime_type : undefined });
    return { fileId: videoFileId, fileName: withMessageIdPrefix(sanitizeFileName(videoNameRaw || fallback), messageId) };
  }
  const voiceFileId = typeof message.voice?.file_id === "string" ? message.voice.file_id.trim() : "";
  if (voiceFileId) return { fileId: voiceFileId, fileName: sanitizeFileName(buildIncomingFileName({ base: "voice", messageId, mimeType: typeof message.voice?.mime_type === "string" ? message.voice.mime_type : undefined })) };
  return null;
}

async function downloadTelegramFile(botToken: string, fileId: string): Promise<Buffer> {
  const payload = await callTelegramApi(botToken, "getFile", { file_id: fileId });
  const filePath = typeof payload.result?.file_path === "string" ? payload.result.file_path : "";
  if (!filePath) throw new Error("Telegram getFile returned empty file_path");
  const response = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
  if (!response.ok) throw new Error(`Failed to download Telegram file (${response.status})`);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > TELEGRAM_FILE_MAX_BYTES) throw new Error(`Файл Telegram слишком большой (${bytes.byteLength} байт). Максимальный размер: ${TELEGRAM_FILE_MAX_BYTES} байт.`);
  return Buffer.from(bytes);
}

function extractCommand(text: string): string | null {
  const first = text.trim().split(/\s+/, 1)[0];
  if (!first || !first.startsWith("/")) return null;
  return first.split("@", 1)[0].toLowerCase();
}
function extractAccessCodeCandidate(text: string): string | null {
  const value = text.trim();
  if (!value) return null;
  const fromCommand = value.match(/^\/(?:code|start)(?:@[a-zA-Z0-9_]+)?\s+([A-Za-z0-9_-]{6,64})$/i);
  if (fromCommand?.[1]) return fromCommand[1];
  if (/^[A-Za-z0-9_-]{6,64}$/.test(value)) return value;
  return null;
}
function normalizeOutgoingText(text: string): string {
  return toTelegramPlainText(text);
}
async function sendTelegramChunk(
  botToken: string,
  chatId: number | string,
  text: string,
  replyToMessageId?: number
): Promise<void> {
  const plain = normalizeOutgoingText(text);
  const html = toTelegramHtml(text);
  const primaryBody = {
    chat_id: chatId,
    text: html,
    parse_mode: "HTML",
    ...(typeof replyToMessageId === "number" ? { reply_to_message_id: replyToMessageId } : {}),
  };

  let response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(primaryBody),
  });
  let payload = (await response.json().catch(() => null)) as { ok?: boolean; description?: string } | null;

  if (!response.ok || !payload?.ok) {
    response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: plain,
        ...(typeof replyToMessageId === "number" ? { reply_to_message_id: replyToMessageId } : {}),
      }),
    });
    payload = (await response.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
  }

  if (!response.ok || !payload?.ok) {
    throw new Error(`Telegram sendMessage failed (${response.status})${payload?.description ? `: ${payload.description}` : ""}`);
  }
}

async function sendTelegramMessage(botToken: string, chatId: number | string, text: string, replyToMessageId?: number): Promise<void> {
  const chunks = splitTelegramText(text);
  if (chunks.length <= 1) {
    await sendTelegramChunk(botToken, chatId, chunks[0] || text, replyToMessageId);
    return;
  }

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    const prefix = chunks.length > 1 ? `[${i + 1}/${chunks.length}]\n` : "";
    await sendTelegramChunk(botToken, chatId, `${prefix}${chunk}`, i === 0 ? replyToMessageId : undefined);
  }
}

function startTypingHeartbeat(botToken: string, chatId: number | string): () => void {
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    try {
      await callTelegramApi(botToken, "sendChatAction", {
        chat_id: chatId,
        action: "typing",
      });
    } catch {
      // ignore transient typing errors
    }
  };

  void tick();
  const timer = setInterval(() => {
    void tick();
  }, 4000);

  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

function resolveTelegramAgentTimeoutMs(params: { message: string; hasAttachment: boolean }): number {
  const base = Number(process.env.TELEGRAM_AGENT_TIMEOUT_MS || 120000);
  const min = Number(process.env.TELEGRAM_AGENT_TIMEOUT_MIN_MS || 60000);
  const max = Number(process.env.TELEGRAM_AGENT_TIMEOUT_MAX_MS || 2400000); // 40 min

  let timeout = Number.isFinite(base) && base > 0 ? base : 120000;

  const textLength = params.message.trim().length;
  if (textLength > 4000) timeout += 10 * 60 * 1000;
  else if (textLength > 1500) timeout += 5 * 60 * 1000;
  else if (textLength > 500) timeout += 2 * 60 * 1000;

  if (params.hasAttachment) timeout += 3 * 60 * 1000;

  const lower = params.message.toLowerCase();
  if (/(исслед|deep research|отчет|report|почини|debug|проверь|проанализ)/i.test(lower)) {
    timeout += 2 * 60 * 1000;
  }

  const safeMin = Number.isFinite(min) && min > 0 ? min : 60000;
  const safeMax = Number.isFinite(max) && max >= safeMin ? max : 2400000;
  return Math.max(safeMin, Math.min(timeout, safeMax));
}

async function resolveTelegramProjectContext(sessionId: string, defaultProjectId?: string) {
  const session = await getOrCreateExternalSession(sessionId);
  const projects = await getAllProjects();
  const projectById = new Map(projects.map((project) => [project.id, project]));
  let resolvedProjectId: string | undefined;
  const explicitProjectId = defaultProjectId?.trim() || "";
  if (session.activeProjectId && projectById.has(session.activeProjectId)) {
    // Always prioritize the project already bound to this Telegram session/chat.
    resolvedProjectId = session.activeProjectId;
  } else if (explicitProjectId && projectById.has(explicitProjectId)) {
    resolvedProjectId = explicitProjectId;
    session.activeProjectId = explicitProjectId;
  } else if (projects.length > 0) {
    // Fallback path: if no valid bound/default project exists,
    // automatically use the first available project instead of failing the whole update.
    resolvedProjectId = projects[0].id;
    session.activeProjectId = projects[0].id;
  } else {
    session.activeProjectId = null;
  }
  return { session, resolvedProjectId, projectName: resolvedProjectId ? projectById.get(resolvedProjectId)?.name : undefined };
}

async function ensureTelegramExternalChatContext(sessionId: string, defaultProjectId?: string): Promise<TelegramExternalChatContext> {
  const { session, resolvedProjectId } = await resolveTelegramProjectContext(sessionId, defaultProjectId);
  const projectKey = contextKey(resolvedProjectId);
  let resolvedChatId = session.activeChats[projectKey];
  if (resolvedChatId) {
    const existing = await getChat(resolvedChatId);
    if (!existing || (existing.projectId ?? null) !== (resolvedProjectId ?? null)) resolvedChatId = "";
  }
  if (!resolvedChatId) {
    resolvedChatId = crypto.randomUUID();
    await createChat(resolvedChatId, `Внешняя сессия ${session.id}`, resolvedProjectId);
  }
  session.activeChats[projectKey] = resolvedChatId;
  session.currentPaths[projectKey] = normalizeTelegramCurrentPath(session.currentPaths[projectKey]);
  session.updatedAt = new Date().toISOString();
  await saveExternalSession(session);
  return { chatId: resolvedChatId, projectId: resolvedProjectId, currentPath: session.currentPaths[projectKey] ?? "" };
}

function helpText(activeProject?: { id?: string; name?: string }, t?: (key: string, fallback: string) => string): string {
  const activeProjectLine = activeProject?.id
    ? (t ? t("telegram.help.activeProject", "Active project: {{name}} ({{id}})")
         .replace("{{name}}", activeProject.name || activeProject.id)
         .replace("{{id}}", activeProject.id)
       : `Active project: ${activeProject.name ? `${activeProject.name} (${activeProject.id})` : activeProject.id}`)
    : (t ? t("telegram.help.noProject", "Active project: not selected") : "Active project: not selected");
  return [
    t ? t("telegram.connection.active", "Telegram connection is active.") : "Telegram connection is active.",
    activeProjectLine,
    "",
    t ? t("telegram.commands.title", "Commands:") : "Commands:",
    t ? t("telegram.commands.start", "/start - show this help") : "/start - show this help",
    t ? t("telegram.commands.help", "/help - show this help") : "/help - show this help",
    t ? t("telegram.commands.code", "/code <access_code> - activate access for your Telegram user") : "/code <access_code> - activate access for your Telegram user",
    t ? t("telegram.commands.new", "/new - start a new conversation (reset context)") : "/new - start a new conversation (reset context)",
  ].join("\n");
}

export async function processTelegramUpdate(params: {
  botToken: string;
  defaultProjectId?: string;
  allowedUserIds: string[];
  update: TelegramUpdatePayload;
}): Promise<{ ok: true; reason?: string }> {
  const { botToken, defaultProjectId, allowedUserIds, update } = params;
  const message = update.message;
  const chatId = typeof message?.chat?.id === "number" || typeof message?.chat?.id === "string" ? message.chat.id : null;
  const chatType = typeof message?.chat?.type === "string" ? message.chat.type : "";
  const messageId = typeof message?.message_id === "number" ? message.message_id : undefined;
  if (chatId === null || !chatType) return { ok: true, reason: "unsupported_update" };
  if (chatType !== "private") return { ok: true, reason: "private_only" };

  const text = typeof message?.text === "string" ? message.text.trim() : "";
  const caption = typeof message?.caption === "string" ? message.caption.trim() : "";
  const incomingText = text || caption;
  const fromUserId = normalizeTelegramUserId(message?.from?.id);
  if (!fromUserId) return { ok: true, reason: "missing_user_id" };

  const allowed = new Set(allowedUserIds);
  if (!allowed.has(fromUserId)) {
    const accessCode = extractAccessCodeCandidate(text);
    const granted = accessCode && (await consumeTelegramAccessCode({ code: accessCode, userId: fromUserId }));
    if (granted) {
      await sendTelegramMessage(botToken, chatId, "Доступ выдан. Теперь можно отправлять сообщения агенту.", messageId);
      return { ok: true, reason: "access_granted" };
    }
    await sendTelegramMessage(botToken, chatId, ["Доступ запрещён: ваш user_id не в списке разрешённых.", "Отправьте код активации командой /code <код> или /start <код>.", `Ваш user_id: ${fromUserId}`].join("\n"), messageId);
    return { ok: true, reason: "user_not_allowed" };
  }

  const botId = (botToken.trim().split(":", 1)[0] || "default").replace(/[^a-zA-Z0-9._:-]/g, "_").slice(0, 128) || "default";
  let sessionId = await getTelegramChatSessionId(botId, chatId);
  if (!sessionId) {
    sessionId = createDefaultTelegramSessionId(botId, chatId);
    await setTelegramChatSessionId(botId, chatId, sessionId);
  }

  const command = extractCommand(text);
  if (command === "/start" || command === "/help") {
    const resolvedProject = await resolveTelegramProjectContext(sessionId, defaultProjectId);
    await saveExternalSession({ ...resolvedProject.session, updatedAt: new Date().toISOString() });
    await sendTelegramMessage(botToken, chatId, helpText({ id: resolvedProject.resolvedProjectId, name: resolvedProject.projectName }), messageId);
    return { ok: true, reason: command };
  }
  if (command === "/new") {
    const freshSessionId = createFreshTelegramSessionId(botId, chatId);
    await setTelegramChatSessionId(botId, chatId, freshSessionId);
    await sendTelegramMessage(botToken, chatId, "Начал новый диалог. Контекст очищен для следующего сообщения.", messageId);
    return { ok: true, reason: command };
  }

  let incomingSavedFile: { name: string; path: string; size: number } | null = null;
  const incomingFile = message ? extractIncomingFile(message, messageId) : null;
  let externalContext: TelegramExternalChatContext | null = null;
  if (incomingFile) {
    externalContext = await ensureTelegramExternalChatContext(sessionId, defaultProjectId);
    const fileBuffer = await downloadTelegramFile(botToken, incomingFile.fileId);
    const saved = await saveChatFile(externalContext.chatId, fileBuffer, incomingFile.fileName);
    incomingSavedFile = { name: saved.name, path: saved.path, size: saved.size };
  }

  if (!incomingText) {
    if (incomingSavedFile) {
      await sendTelegramMessage(botToken, chatId, `Файл "${incomingSavedFile.name}" сохранен в файлы чата.`, messageId);
      return { ok: true, reason: "file_saved" };
    }
    await sendTelegramMessage(botToken, chatId, "Сейчас поддерживаются только текстовые сообщения и загрузка файлов.", messageId);
    return { ok: true, reason: "non_text" };
  }

  const stopTyping = startTypingHeartbeat(botToken, chatId);
  const resolvedMessage = incomingSavedFile ? `${incomingText}\n\nAttached file: ${incomingSavedFile.name}` : incomingText;
  const timeoutMs = resolveTelegramAgentTimeoutMs({
    message: resolvedMessage,
    hasAttachment: Boolean(incomingSavedFile),
  });

  try {
    const result = await Promise.race([
      handleExternalMessage({
        sessionId,
        message: resolvedMessage,
        projectId: externalContext?.projectId ?? defaultProjectId,
        chatId: externalContext?.chatId,
        currentPath: normalizeTelegramCurrentPath(externalContext?.currentPath),
        runtimeData: { telegram: { botToken, chatId, replyToMessageId: messageId ?? null } },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Таймаут ответа агента")), timeoutMs)
      ),
    ]);
    await sendTelegramMessage(botToken, chatId, result.reply, messageId);
    return { ok: true };
  } catch (error) {
    if (error instanceof ExternalMessageError) {
      const errorMessage = typeof error.payload.error === "string" ? error.payload.error : "Не удалось обработать сообщение.";
      await sendTelegramMessage(botToken, chatId, `Ошибка: ${errorMessage}`, messageId);
      return { ok: true, reason: "handled_error" };
    }
    if (error instanceof Error && error.message === "Таймаут ответа агента") {
      await sendTelegramMessage(botToken, chatId, "⏱️ Превышено время ожидания ответа агента. Попробуйте короче сформулировать запрос или повторите позже.", messageId);
      return { ok: true, reason: "timeout" };
    }
    throw error;
  } finally {
    stopTyping();
  }
}
