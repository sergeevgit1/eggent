"use client";

import { useEffect, useMemo, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ChatListItem, Project } from "@/lib/types";
import {
  Archive,
  ArchiveRestore,
  Loader2,
  Pin,
  PinOff,
  Search,
  Trash2,
} from "lucide-react";

export default function ChatsManagementPage() {
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [busyChatId, setBusyChatId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [chatsRes, projectsRes] = await Promise.all([
        fetch("/api/chat/history"),
        fetch("/api/projects"),
      ]);
      const chatsData = await chatsRes.json();
      const projectsData = await projectsRes.json();
      setChats(Array.isArray(chatsData) ? chatsData : []);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) map.set(p.id, p.name);
    return map;
  }, [projects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return chats.filter((chat) => {
      if (!showArchived && chat.isArchived) return false;
      if (projectFilter === "none" && chat.projectId) return false;
      if (projectFilter !== "all" && projectFilter !== "none" && chat.projectId !== projectFilter) return false;
      if (!q) return true;
      return (
        chat.title.toLowerCase().includes(q) ||
        chat.id.toLowerCase().includes(q) ||
        (chat.projectId ?? "").toLowerCase().includes(q)
      );
    });
  }, [chats, search, projectFilter, showArchived]);

  const patchChat = async (chatId: string, patch: Partial<{ title: string; isPinned: boolean; isArchived: boolean }>) => {
    setBusyChatId(chatId);
    try {
      const res = await fetch(`/api/chat/history?id=${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("patch_failed");
      const updated = await res.json();
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? {
                ...c,
                title: updated.title,
                isPinned: updated.isPinned,
                isArchived: updated.isArchived,
                updatedAt: updated.updatedAt,
              }
            : c
        )
      );
    } finally {
      setBusyChatId(null);
    }
  };

  const deleteChat = async (chatId: string) => {
    const ok = window.confirm("Удалить чат? Это действие нельзя отменить.");
    if (!ok) return;
    setBusyChatId(chatId);
    try {
      await fetch(`/api/chat/history?id=${chatId}`, { method: "DELETE" });
      setChats((prev) => prev.filter((c) => c.id !== chatId));
    } finally {
      setBusyChatId(null);
    }
  };

  return (
    <div className="h-svh overflow-hidden [--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex h-full min-h-0">
        <AppSidebar />
        <SidebarInset className="min-h-0 overflow-hidden">
          <SiteHeader title="Управление чатами" />
          <div className="flex h-[calc(100svh-var(--header-height))] min-h-0 flex-1 flex-col gap-4 overflow-auto p-4 md:p-6">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="md:col-span-2">
                  <Label htmlFor="chats-search">Поиск</Label>
                  <div className="relative mt-1">
                    <Search className="text-muted-foreground absolute left-2 top-2.5 size-4" />
                    <Input
                      id="chats-search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Название, ID, проект"
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="chats-project">Проект</Label>
                  <select
                    id="chats-project"
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                    className="border-input bg-background mt-1 h-9 w-full rounded-md border px-3 text-sm"
                  >
                    <option value="all">Все проекты</option>
                    <option value="none">Без проекта</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant={showArchived ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowArchived((v) => !v)}
                >
                  {showArchived ? "Скрыть архив" : "Показать архив"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => void load()}>
                  Обновить
                </Button>
              </div>

              {loading ? (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Loader2 className="size-4 animate-spin" /> Загружаю чаты...
                </div>
              ) : (
                <div className="border rounded-lg">
                  <div className="grid grid-cols-12 gap-2 border-b px-3 py-2 text-xs font-medium text-muted-foreground">
                    <div className="col-span-4">Чат</div>
                    <div className="col-span-2">Проект</div>
                    <div className="col-span-2">Сообщений</div>
                    <div className="col-span-2">Обновлён</div>
                    <div className="col-span-2 text-right">Действия</div>
                  </div>

                  {filtered.length === 0 ? (
                    <div className="text-muted-foreground px-3 py-6 text-sm">Чатов по фильтру не найдено.</div>
                  ) : (
                    filtered.map((chat) => {
                      const isBusy = busyChatId === chat.id;
                      const projectName = chat.projectId
                        ? projectNameById.get(chat.projectId) ?? chat.projectId
                        : "—";
                      return (
                        <div
                          key={chat.id}
                          className="grid grid-cols-12 gap-2 border-b px-3 py-2 text-sm last:border-b-0"
                        >
                          <div className="col-span-4 min-w-0">
                            {editingChatId === chat.id ? (
                              <Input
                                autoFocus
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onBlur={() => {
                                  const title = editingTitle.trim();
                                  setEditingChatId(null);
                                  if (title && title !== chat.title) {
                                    void patchChat(chat.id, { title });
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    const title = editingTitle.trim();
                                    setEditingChatId(null);
                                    if (title && title !== chat.title) {
                                      void patchChat(chat.id, { title });
                                    }
                                  }
                                  if (e.key === "Escape") {
                                    setEditingChatId(null);
                                  }
                                }}
                                className="h-8"
                              />
                            ) : (
                              <button
                                className="w-full truncate text-left hover:underline"
                                onClick={() => {
                                  setEditingChatId(chat.id);
                                  setEditingTitle(chat.title);
                                }}
                              >
                                {chat.title}
                              </button>
                            )}
                            <div className="text-muted-foreground truncate text-[11px]">{chat.id}</div>
                          </div>
                          <div className="col-span-2 truncate">{projectName}</div>
                          <div className="col-span-2">{chat.messageCount}</div>
                          <div className="col-span-2 text-xs text-muted-foreground">
                            {new Date(chat.updatedAt).toLocaleString()}
                          </div>
                          <div className="col-span-2 flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              disabled={isBusy}
                              onClick={() => void patchChat(chat.id, { isPinned: !chat.isPinned })}
                              title={chat.isPinned ? "Открепить" : "Закрепить"}
                            >
                              {chat.isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              disabled={isBusy}
                              onClick={() => void patchChat(chat.id, { isArchived: !chat.isArchived })}
                              title={chat.isArchived ? "Вернуть из архива" : "В архив"}
                            >
                              {chat.isArchived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              disabled={isBusy}
                              onClick={() => void deleteChat(chat.id)}
                              title="Удалить"
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
