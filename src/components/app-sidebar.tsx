"use client";

import * as React from "react";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  Bot,
  FolderOpen,
  MessageSquarePlus,
  MessagesSquare,
  MoreHorizontal,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { useBackgroundSync } from "@/hooks/use-background-sync";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/components/i18n-provider";
import { SystemNavigationSheet } from "@/components/system-navigation-sheet";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    chats,
    setChats,
    activeChatId,
    setActiveChatId,
    removeChat,
    projects,
    setProjects,
    activeProjectId,
    setActiveProjectId,
  } = useAppStore();
  const { t } = useI18n();
  const projectsTick = useBackgroundSync({
    topics: ["projects", "global"],
  });
  const chatsTick = useBackgroundSync({
    topics: ["chat", "projects", "global"],
    projectId: activeProjectId ?? null,
  });

  const [editingChatId, setEditingChatId] = React.useState<string | null>(null);
  const [editingTitle, setEditingTitle] = React.useState("");

  const isOnChatPage = pathname === "/dashboard";

  const goToChatIfNeeded = React.useCallback(() => {
    if (!isOnChatPage) router.push("/dashboard");
  }, [isOnChatPage, router]);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProjects(data);
      })
      .catch(() => {});
  }, [setProjects, projectsTick]);

  useEffect(() => {
    if (projects.length === 0) {
      if (activeProjectId !== null) setActiveProjectId(null);
      return;
    }

    const activeExists = activeProjectId
      ? projects.some((project) => project.id === activeProjectId)
      : false;

    if (!activeExists) {
      setActiveProjectId(projects[0].id);
    }
  }, [projects, activeProjectId, setActiveProjectId]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeProjectId) {
      params.set("projectId", activeProjectId);
    } else {
      params.set("projectId", "none");
    }
    fetch(`/api/chat/history?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setChats(data);
      })
      .catch(() => {});
  }, [activeProjectId, setChats, chatsTick]);

  const handleNewChat = () => {
    setActiveChatId(null);
    goToChatIfNeeded();
  };

  const handleChatClick = (chatId: string) => {
    if (editingChatId) return;
    setActiveChatId(chatId);
    goToChatIfNeeded();
  };

  const applyLocalChatUpdate = React.useCallback(
    (id: string, patch: Partial<{ title: string; isPinned: boolean; isArchived: boolean }>) => {
      setChats(
        chats.map((chat) => (chat.id === id ? { ...chat, ...patch } : chat))
      );
    },
    [chats, setChats]
  );

  const patchChat = async (
    id: string,
    patch: Partial<{ title: string; isPinned: boolean; isArchived: boolean }>
  ) => {
    const res = await fetch(`/api/chat/history?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error("chat_patch_failed");
    const updated = await res.json();
    applyLocalChatUpdate(id, {
      title: updated.title,
      isPinned: updated.isPinned,
      isArchived: updated.isArchived,
    });
  };

  const handleProjectClick = (projectId: string) => {
    const params = new URLSearchParams({ projectId });
    fetch(`/api/chat/history?${params}`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setChats(list);
        setActiveProjectId(projectId);
        setActiveChatId(list[0]?.id ?? null);
        goToChatIfNeeded();
      })
      .catch(() => {
        setActiveProjectId(projectId);
        setActiveChatId(null);
        goToChatIfNeeded();
      });
  };

  const handleDeleteChat = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const ok = window.confirm(t("chat.deleteConfirm", "Удалить чат? Это действие нельзя отменить."));
    if (!ok) return;
    await fetch(`/api/chat/history?id=${id}`, { method: "DELETE" });
    removeChat(id);
  };

  const startRename = (id: string, currentTitle: string) => {
    setEditingChatId(id);
    setEditingTitle(currentTitle);
  };

  const submitRename = async (id: string) => {
    const title = editingTitle.trim();
    setEditingChatId(null);
    if (!title) return;
    await patchChat(id, { title });
  };

  const pinnedChats = chats.filter((chat) => !chat.isArchived && chat.isPinned);
  const recentChats = chats.filter((chat) => !chat.isArchived && !chat.isPinned);
  const archivedChats = chats.filter((chat) => chat.isArchived);

  const renderChatRow = (chat: (typeof chats)[number]) => (
    <SidebarMenuItem key={chat.id}>
      <SidebarMenuButton
        isActive={activeChatId === chat.id}
        onClick={() => handleChatClick(chat.id)}
      >
        {editingChatId === chat.id ? (
          <Input
            autoFocus
            value={editingTitle}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setEditingTitle(e.target.value)}
            onBlur={() => submitRename(chat.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename(chat.id);
              if (e.key === "Escape") setEditingChatId(null);
            }}
            className="h-7"
          />
        ) : (
          <span className="truncate">{chat.title}</span>
        )}
      </SidebarMenuButton>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction
            showOnHover
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-3.5" />
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              startRename(chat.id, chat.title);
            }}
          >
            {t("chat.rename", "Переименовать")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async (e) => {
              e.stopPropagation();
              await patchChat(chat.id, { isPinned: !chat.isPinned });
            }}
          >
            {chat.isPinned ? (
              <>
                <PinOff className="size-3.5 mr-2" /> {t("chat.unpin", "Открепить")}
              </>
            ) : (
              <>
                <Pin className="size-3.5 mr-2" /> {t("chat.pin", "Закрепить")}
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async (e) => {
              e.stopPropagation();
              await patchChat(chat.id, { isArchived: !chat.isArchived });
            }}
          >
            {chat.isArchived ? (
              <>
                <ArchiveRestore className="size-3.5 mr-2" /> {t("chat.unarchive", "Вернуть из архива")}
              </>
            ) : (
              <>
                <Archive className="size-3.5 mr-2" /> {t("chat.archive", "В архив")}
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={(e) => handleDeleteChat(chat.id, e as unknown as React.MouseEvent)}
          >
            <Trash2 className="size-3.5 mr-2" /> {t("chat.delete", "Удалить")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );

  return (
    <Sidebar className="h-svh" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Bot className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Eggent</span>
                  <span className="truncate text-xs">Agent Terminal</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-3 pt-2 space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={handleNewChat}
          >
            <MessageSquarePlus className="size-4" />
            {t("chat.new", "New Chat")}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={() => router.push("/dashboard/chats")}
          >
            <MessagesSquare className="size-4" />
            {t("nav.chatsManage", "Управление чатами")}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={() => router.push("/dashboard/files")}
          >
            <FolderOpen className="size-4" />
            {t("nav.filesManage", "Управление файлами")}
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.project", "Project")}</SidebarGroupLabel>
          <SidebarMenu>
            {projects.length === 0 && (
              <SidebarMenuItem>
                <SidebarMenuButton disabled>
                  <span className="text-muted-foreground text-xs">
                    {t("empty.projects", "No projects yet")}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {projects.map((project) => (
              <SidebarMenuItem key={project.id}>
                <SidebarMenuButton
                  isActive={activeProjectId === project.id}
                  onClick={() => handleProjectClick(project.id)}
                >
                  <FolderOpen className="size-4" />
                  <span className="truncate">{project.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>
            <MessagesSquare className="size-3.5 mr-1" />
            {t("nav.chats", "Chats")}
          </SidebarGroupLabel>

          {chats.length === 0 ? (
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton disabled>
                  <span className="text-muted-foreground text-xs">
                    {t("empty.chats", "No chats yet")}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          ) : (
            <div className="space-y-3">
              {pinnedChats.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[11px] text-muted-foreground uppercase tracking-wide">
                    {t("chat.section.pinned", "Закреплённые")}
                  </div>
                  <SidebarMenu>{pinnedChats.map(renderChatRow)}</SidebarMenu>
                </div>
              )}

              {recentChats.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[11px] text-muted-foreground uppercase tracking-wide">
                    {t("chat.section.recent", "Недавние")}
                  </div>
                  <SidebarMenu>{recentChats.map(renderChatRow)}</SidebarMenu>
                </div>
              )}

              {archivedChats.length > 0 && (
                <details className="px-1">
                  <summary className="cursor-pointer px-2 py-1 text-[11px] text-muted-foreground uppercase tracking-wide">
                    {t("chat.section.archive", "Архив")} ({archivedChats.length})
                  </summary>
                  <SidebarMenu>{archivedChats.map(renderChatRow)}</SidebarMenu>
                </details>
              )}
            </div>
          )}
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="p-2">
          <SystemNavigationSheet mode="profile" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
