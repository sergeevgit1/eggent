"use client";

import * as React from "react";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Bot,
  FolderOpen,
  MessageSquarePlus,
  MessagesSquare,
  Trash2,
} from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { FileTree } from "@/components/file-tree";
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

  const isOnChatPage = pathname === "/dashboard";

  // Navigate to chat page when not already there (e.g. from settings/projects/memory)
  const goToChatIfNeeded = React.useCallback(() => {
    if (!isOnChatPage) router.push("/dashboard");
  }, [isOnChatPage, router]);

  // Keep projects list in sync with background updates.
  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProjects(data);
      })
      .catch(() => {});
  }, [setProjects, projectsTick]);

  // Keep active project aligned with available projects.
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

  // Keep chat list synced for the active project.
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
    setActiveChatId(chatId);
    goToChatIfNeeded();
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

  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/chat/history?id=${id}`, { method: "DELETE" });
    removeChat(id);
  };

  return (
    <Sidebar
      className="h-svh"
      {...props}
    >
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
        {/* New Chat button */}
        <div className="px-3 pt-2 space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={handleNewChat}
          >
            <MessageSquarePlus className="size-4" />
            {t("chat.new", "New Chat")}
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>

        {/* Project selector */}
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

        {/* File tree */}
        <SidebarGroup>
          <SidebarGroupLabel>
            <FolderOpen className="size-3.5 mr-1" />
            {t("nav.files", "Files")}
          </SidebarGroupLabel>
          <div className="px-2">
            <FileTree projectId={activeProjectId ?? "none"} />
          </div>
        </SidebarGroup>

        {/* Chat history */}
        <SidebarGroup>
          <SidebarGroupLabel>
            <MessagesSquare className="size-3.5 mr-1" />
            {t("nav.chats", "Chats")}
          </SidebarGroupLabel>
          <SidebarMenu>
            {chats.length === 0 && (
              <SidebarMenuItem>
                <SidebarMenuButton disabled>
                  <span className="text-muted-foreground text-xs">
                    {t("empty.chats", "No chats yet")}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {chats.map((chat) => (
              <SidebarMenuItem key={chat.id}>
                <SidebarMenuButton
                  isActive={activeChatId === chat.id}
                  onClick={() => handleChatClick(chat.id)}
                >
                  <span className="truncate">{chat.title}</span>
                </SidebarMenuButton>
                <SidebarMenuAction
                  onClick={(e) => handleDeleteChat(chat.id, e)}
                  className="opacity-0 group-hover/menu-item:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </SidebarMenuAction>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
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
