"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Locale = "en" | "ru";

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
    "skills.selectProject": "Select a project to view installed skills.",
    "auth.usernameRequired": "Username is required.",
    "auth.passwordMin": "Password must be at least 8 characters.",
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
    "skills.selectProject": "Выберите проект, чтобы увидеть установленные скиллы.",
    "auth.usernameRequired": "Имя пользователя обязательно.",
    "auth.passwordMin": "Пароль должен быть не менее 8 символов.",
  },
};

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = (localStorage.getItem("eggent.locale") as Locale | null) || null;
    if (saved === "ru" || saved === "en") {
      setLocaleState(saved);
      return;
    }
    const lang = typeof navigator !== "undefined" ? navigator.language.toLowerCase() : "en";
    if (lang.startsWith("ru")) setLocaleState("ru");
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    localStorage.setItem("eggent.locale", next);
  };

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, fallback) => messages[locale][key] || fallback || key,
    }),
    [locale]
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
