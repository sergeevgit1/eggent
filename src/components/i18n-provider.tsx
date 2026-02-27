"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Locale = "en" | "ru";
type Theme = "light" | "dark";

type Dict = Record<string, string>;

const messages: Record<Locale, Dict> = {
  en: {
    "nav.project": "Project",
    "nav.files": "Files",
    "nav.chats": "Chats",
    "nav.navigation": "Navigation",
    "nav.projects": "Projects",
    "nav.memory": "Memory",
    "nav.skills": "Skills",
    "nav.mcp": "MCP",
    "nav.cron": "Cron Jobs",
    "nav.settings": "Settings",
    "nav.api": "API",
    "nav.messengers": "Messengers",
    "nav.docs": "Documentation",
    "nav.logout": "Logout",
    "chat.new": "New Chat",
    "empty.projects": "No projects yet",
    "empty.chats": "No chats yet",
    "login.title": "Eggent Login",
    "login.defaultCreds": "Default credentials:",
    "login.username": "Username",
    "login.password": "Password",
    "login.signin": "Sign In",
    "login.signingIn": "Signing in...",
    "common.loading": "Loading...",
    "common.loadingProjects": "Loading projects...",
    "memory.subtitle": "Browse and search the agent's persistent vector memory.",
    "memory.searchPlaceholder": "Search memories...",
    "memory.empty": "No memories found.",
    "skills.selectProject": "Select a project to view installed skills.",
    "auth.usernameRequired": "Username is required.",
    "auth.passwordMin": "Password must be at least 8 characters.",
    "common.noProjects": "No projects available",
    "common.total": "total",
    "messengers.title": "Messenger Integrations",
    "messengers.subtitle": "Connect external messengers to the agent. Telegram is available now.",
    "messengers.telegramCommands": "Telegram Commands",
    "messengers.availableCommands": "Available commands in Telegram private chat:",
    "messengers.cmdStart": "show help and connection status",
    "messengers.cmdHelp": "show help",
    "messengers.cmdCode": "activate access for your Telegram user_id",
    "messengers.cmdNew": "start a new conversation and reset context",
    "messengers.notes": "Notes: only private chats are supported. Uploaded files are saved into chat files, and you can ask the agent to send a local file back to Telegram.",
    "mcp.title": "MCP Servers",
    "mcp.subtitlePrefix": "View MCP servers configured for each project from",
    "mcp.subtitleSuffix": "and switch between projects.",
    "mcp.searchPlaceholder": "Search MCP servers...",
    "mcp.serversInProject": "Servers In Project",
    "mcp.loadingServers": "Loading MCP servers...",
    "mcp.selectProject": "Select a project to view MCP servers.",
    "mcp.noServers": "No MCP servers found for this project.",
    "cron.subtitle": "Manage scheduled jobs per project and switch between projects.",
    "cron.selectProject": "Select a project to manage cron jobs.",
    "common.updated": "Updated",
    "common.saving": "Saving...",
    "common.generating": "Generating...",
    "common.expiresAt": "Expires at",
    "common.url": "URL",
    "common.more": "More",
    "telegram.source.stored": "stored in app",
    "telegram.source.env": "from .env",
    "telegram.source.none": "not configured",
    "telegram.title": "Telegram",
    "telegram.intro.disconnected": "Enter the bot token and Public Base URL, then click Connect Telegram.",
    "telegram.intro.connected": "Telegram is connected. You can reconnect or disconnect it.",
    "telegram.botToken": "Bot Token",
    "telegram.currentSource": "Current source",
    "telegram.publicBaseUrl": "Public Base URL",
    "telegram.webhookEndpoint": "Webhook endpoint",
    "telegram.connecting": "Connecting...",
    "telegram.connect": "Connect Telegram",
    "telegram.tokenSource": "Token source",
    "telegram.reconnecting": "Reconnecting...",
    "telegram.reconnect": "Reconnect Telegram",
    "telegram.disconnecting": "Disconnecting...",
    "telegram.disconnect": "Disconnect Telegram",
    "telegram.accessControl": "Access Control",
    "telegram.accessControlDesc": "Only users from this allowlist can chat with the bot. Others must send an access code first.",
    "telegram.allowedUsers": "Allowed Telegram user_id",
    "telegram.allowedUsersHelp": "Use comma, space, or newline as separator.",
    "telegram.saveAllowlist": "Save Allowlist",
    "telegram.generateCode": "Generate Access Code",
    "telegram.pendingCodes": "Pending access codes",
    "telegram.latestCode": "Latest code",
    "telegram.webhook.status": "Webhook Status",
    "telegram.webhook.desc": "Current webhook status from the latest check.",
    "telegram.webhook.loading": "Loading webhook status...",
    "telegram.webhook.pendingUpdates": "Pending updates",
    "telegram.webhook.lastError": "Last error",
    "telegram.webhook.lastErrorAt": "Last error at",
    "telegram.webhook.notLoaded": "Webhook status is not loaded yet.",
    "telegram.webhook.warning": "Webhook warning",
    "telegram.errors.loadSettings": "Failed to load Telegram settings",
    "telegram.errors.loadWebhook": "Failed to load webhook status",
    "telegram.errors.baseUrlRequired": "Public Base URL is required",
    "telegram.errors.tokenRequired": "Telegram bot token is required",
    "telegram.errors.saveSettings": "Failed to save Telegram settings",
    "telegram.errors.connect": "Failed to connect Telegram",
    "telegram.errors.reconnect": "Failed to reconnect Telegram",
    "telegram.errors.disconnect": "Failed to disconnect Telegram",
    "telegram.errors.saveAllowed": "Failed to save allowed users",
    "telegram.errors.generateCode": "Failed to generate access code",
    "telegram.success.connected": "Telegram connected",
    "telegram.success.reconnected": "Telegram reconnected",
    "telegram.success.disconnected": "Telegram disconnected",
    "telegram.success.allowedUpdated": "Allowed Telegram user_id list updated",
    "telegram.success.codeGenerated": "Access code generated",
    "files.download": "Download",
    "files.empty": "Empty",
    "files.noFiles": "No files",
    "common.delete": "Delete",
    "knowledge.title": "Knowledge Base",
    "knowledge.uploading": "Uploading...",
    "knowledge.uploadFile": "Upload File",
    "knowledge.filesMemory": "Files Memory",
    "knowledge.loadingFiles": "Loading files...",
    "knowledge.emptyFiles": "No files in knowledge base yet.",
    "knowledge.emptyFilesHint": "Upload PDF, Word, Excel, text, or images to give the agent context.",
    "knowledge.chatMemory": "Chat Memory",
    "knowledge.loadingMemory": "Loading memory...",
    "knowledge.emptyChatMemory": "No chat memory saved for this project yet.",
    "knowledge.deleteMemory": "Delete memory",
    "knowledge.chunks": "Chunks",
    "knowledge.vectorizedChunks": "vectorized text chunk",
    "knowledge.loadingChunks": "Loading chunks...",
    "knowledge.emptyChunks": "No chunks for this file.",
    "knowledge.chunk": "Chunk",
    "knowledge.memory": "Memory",
    "knowledge.errors.upload": "Upload failed",
    "knowledge.errors.uploadFile": "Failed to upload file",
    "knowledge.errors.deleteFile": "Failed to delete file",
    "knowledge.errors.deleteMemory": "Failed to delete memory",
    "knowledge.confirm.deleteFile": "Are you sure you want to delete",
    "knowledge.confirm.deleteMemory": "Are you sure you want to delete this memory?",
  },
  ru: {
    "nav.project": "Проект",
    "nav.files": "Файлы",
    "nav.chats": "Чаты",
    "nav.navigation": "Навигация",
    "nav.projects": "Проекты",
    "nav.memory": "Память",
    "nav.skills": "Скиллы",
    "nav.mcp": "MCP",
    "nav.cron": "Крон-задачи",
    "nav.settings": "Настройки",
    "nav.api": "API",
    "nav.messengers": "Мессенджеры",
    "nav.docs": "Документация",
    "nav.logout": "Выйти",
    "chat.new": "Новый чат",
    "empty.projects": "Проектов пока нет",
    "empty.chats": "Чатов пока нет",
    "login.title": "Вход в Eggent",
    "login.defaultCreds": "Логин по умолчанию:",
    "login.username": "Имя пользователя",
    "login.password": "Пароль",
    "login.signin": "Войти",
    "login.signingIn": "Входим...",
    "common.loading": "Загрузка...",
    "common.loadingProjects": "Загрузка проектов...",
    "memory.subtitle": "Просматривайте и ищите записи в постоянной векторной памяти агента.",
    "memory.searchPlaceholder": "Поиск по памяти...",
    "memory.empty": "Воспоминания не найдены.",
    "skills.selectProject": "Выберите проект, чтобы увидеть установленные скиллы.",
    "auth.usernameRequired": "Имя пользователя обязательно.",
    "auth.passwordMin": "Пароль должен быть не менее 8 символов.",
    "common.noProjects": "Нет доступных проектов",
    "common.total": "всего",
    "messengers.title": "Интеграции мессенджеров",
    "messengers.subtitle": "Подключайте внешние мессенджеры к агенту. Сейчас доступен Telegram.",
    "messengers.telegramCommands": "Команды Telegram",
    "messengers.availableCommands": "Доступные команды в приватном чате Telegram:",
    "messengers.cmdStart": "показать справку и статус подключения",
    "messengers.cmdHelp": "показать справку",
    "messengers.cmdCode": "активировать доступ для вашего Telegram user_id",
    "messengers.cmdNew": "начать новый диалог и сбросить контекст",
    "messengers.notes": "Примечание: поддерживаются только приватные чаты. Загруженные файлы сохраняются в файлы чата, и вы можете попросить агента отправить локальный файл обратно в Telegram.",
    "mcp.title": "MCP-серверы",
    "mcp.subtitlePrefix": "Просмотр MCP-серверов проекта из",
    "mcp.subtitleSuffix": "и переключение между проектами.",
    "mcp.searchPlaceholder": "Поиск MCP-серверов...",
    "mcp.serversInProject": "Серверы проекта",
    "mcp.loadingServers": "Загрузка MCP-серверов...",
    "mcp.selectProject": "Выберите проект, чтобы увидеть MCP-серверы.",
    "mcp.noServers": "Для этого проекта MCP-серверы не найдены.",
    "cron.subtitle": "Управляйте расписанием задач по проектам и переключайтесь между проектами.",
    "cron.selectProject": "Выберите проект для управления cron-задачами.",
    "common.updated": "Обновлено",
    "common.saving": "Сохранение...",
    "common.generating": "Генерация...",
    "common.expiresAt": "Действует до",
    "common.url": "URL",
    "common.more": "Ещё",
    "telegram.source.stored": "сохранён в приложении",
    "telegram.source.env": "из .env",
    "telegram.source.none": "не настроен",
    "telegram.title": "Telegram",
    "telegram.intro.disconnected": "Введите токен бота и Public Base URL, затем нажмите «Подключить Telegram».",
    "telegram.intro.connected": "Telegram подключён. Вы можете переподключить или отключить его.",
    "telegram.botToken": "Токен бота",
    "telegram.currentSource": "Текущий источник",
    "telegram.publicBaseUrl": "Публичный Base URL",
    "telegram.webhookEndpoint": "Webhook endpoint",
    "telegram.connecting": "Подключение...",
    "telegram.connect": "Подключить Telegram",
    "telegram.tokenSource": "Источник токена",
    "telegram.reconnecting": "Переподключение...",
    "telegram.reconnect": "Переподключить Telegram",
    "telegram.disconnecting": "Отключение...",
    "telegram.disconnect": "Отключить Telegram",
    "telegram.accessControl": "Контроль доступа",
    "telegram.accessControlDesc": "Только пользователи из allowlist могут писать боту. Остальные сначала должны отправить код доступа.",
    "telegram.allowedUsers": "Разрешённые Telegram user_id",
    "telegram.allowedUsersHelp": "Используйте запятую, пробел или новую строку как разделитель.",
    "telegram.saveAllowlist": "Сохранить allowlist",
    "telegram.generateCode": "Сгенерировать код доступа",
    "telegram.pendingCodes": "Ожидающие коды доступа",
    "telegram.latestCode": "Последний код",
    "telegram.webhook.status": "Статус webhook",
    "telegram.webhook.desc": "Текущий статус webhook по последней проверке.",
    "telegram.webhook.loading": "Загрузка статуса webhook...",
    "telegram.webhook.pendingUpdates": "Ожидающие обновления",
    "telegram.webhook.lastError": "Последняя ошибка",
    "telegram.webhook.lastErrorAt": "Время последней ошибки",
    "telegram.webhook.notLoaded": "Статус webhook ещё не загружен.",
    "telegram.webhook.warning": "Предупреждение webhook",
    "telegram.errors.loadSettings": "Не удалось загрузить настройки Telegram",
    "telegram.errors.loadWebhook": "Не удалось загрузить статус webhook",
    "telegram.errors.baseUrlRequired": "Public Base URL обязателен",
    "telegram.errors.tokenRequired": "Токен Telegram-бота обязателен",
    "telegram.errors.saveSettings": "Не удалось сохранить настройки Telegram",
    "telegram.errors.connect": "Не удалось подключить Telegram",
    "telegram.errors.reconnect": "Не удалось переподключить Telegram",
    "telegram.errors.disconnect": "Не удалось отключить Telegram",
    "telegram.errors.saveAllowed": "Не удалось сохранить список разрешённых пользователей",
    "telegram.errors.generateCode": "Не удалось сгенерировать код доступа",
    "telegram.success.connected": "Telegram подключён",
    "telegram.success.reconnected": "Telegram переподключён",
    "telegram.success.disconnected": "Telegram отключён",
    "telegram.success.allowedUpdated": "Список разрешённых Telegram user_id обновлён",
    "telegram.success.codeGenerated": "Код доступа сгенерирован",
    "files.download": "Скачать",
    "files.empty": "Пусто",
    "files.noFiles": "Нет файлов",
    "common.delete": "Удалить",
    "knowledge.title": "База знаний",
    "knowledge.uploading": "Загрузка...",
    "knowledge.uploadFile": "Загрузить файл",
    "knowledge.filesMemory": "Память файлов",
    "knowledge.loadingFiles": "Загрузка файлов...",
    "knowledge.emptyFiles": "В базе знаний пока нет файлов.",
    "knowledge.emptyFilesHint": "Загрузите PDF, Word, Excel, текст или изображения, чтобы дать агенту контекст.",
    "knowledge.chatMemory": "Память чата",
    "knowledge.loadingMemory": "Загрузка памяти...",
    "knowledge.emptyChatMemory": "Для этого проекта пока нет сохранённой памяти чата.",
    "knowledge.deleteMemory": "Удалить память",
    "knowledge.chunks": "Чанки",
    "knowledge.vectorizedChunks": "векторизованный текстовый чанк",
    "knowledge.loadingChunks": "Загрузка чанков...",
    "knowledge.emptyChunks": "Для этого файла нет чанков.",
    "knowledge.chunk": "Чанк",
    "knowledge.memory": "Память",
    "knowledge.errors.upload": "Ошибка загрузки",
    "knowledge.errors.uploadFile": "Не удалось загрузить файл",
    "knowledge.errors.deleteFile": "Не удалось удалить файл",
    "knowledge.errors.deleteMemory": "Не удалось удалить память",
    "knowledge.confirm.deleteFile": "Вы точно хотите удалить",
    "knowledge.confirm.deleteMemory": "Вы точно хотите удалить эту память?",
  },
};

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  t: (key: string, fallback?: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const saved = (localStorage.getItem("eggent.locale") as Locale | null) || null;
    if (saved === "ru" || saved === "en") {
      setLocaleState(saved);
    } else {
      const lang = typeof navigator !== "undefined" ? navigator.language.toLowerCase() : "en";
      if (lang.startsWith("ru")) setLocaleState("ru");
    }

    const savedTheme = (localStorage.getItem("eggent.theme") as Theme | null) || null;
    if (savedTheme === "dark" || savedTheme === "light") {
      setThemeState(savedTheme);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("eggent.theme", theme);
  }, [theme]);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    localStorage.setItem("eggent.locale", next);
  };

  const setTheme = (next: Theme) => {
    setThemeState(next);
  };

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      theme,
      setTheme,
      t: (key, fallback) => messages[locale][key] || fallback || key,
    }),
    [locale, theme]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
