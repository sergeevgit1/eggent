"use client"

import { MessageSquarePlus, SidebarIcon } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import { useI18n } from "@/components/i18n-provider"
import { SystemNavigationSheet } from "@/components/system-navigation-sheet"
import { useAppStore } from "@/store/app-store"

export function SiteHeader({ title }: { title?: string }) {
  const { toggleSidebar } = useSidebar()
  const { t } = useI18n()
  const pathname = usePathname()
  const router = useRouter()
  const { chats, activeChatId, setActiveChatId } = useAppStore()

  const mappedTitle = (() => {
    if (!title) return "Eggent"
    const map: Record<string, string> = {
      Chat: t("nav.chats", "Chats"),
      Projects: t("nav.projects", "Projects"),
      "Memory Dashboard": t("nav.memory", "Memory"),
      Skills: t("nav.skills", "Skills"),
      MCP: t("nav.mcp", "MCP"),
      "Cron Jobs": t("nav.cron", "Cron Jobs"),
      Settings: t("nav.settings", "Settings"),
      API: t("nav.api", "API"),
      Messengers: t("nav.messengers", "Messengers"),
    }
    return map[title] || title
  })()

  const activeChatTitle = (() => {
    const current = chats.find((chat) => chat.id === activeChatId)
    if (!current) return t("chat.new", "Новый чат")
    return current.title || t("chat.new", "Новый чат")
  })()

  const centerTitle = pathname === "/dashboard" ? activeChatTitle : mappedTitle

  const handleNewChat = () => {
    setActiveChatId(null)
    if (pathname !== "/dashboard") {
      router.push("/dashboard")
    } else {
      const params = new URLSearchParams(window.location.search)
      if (params.has("chatId")) {
        params.delete("chatId")
        router.replace(`/dashboard${params.toString() ? `?${params}` : ""}`)
      }
    }
  }

  const handleOpenActiveChat = () => {
    if (activeChatId) {
      const params = new URLSearchParams({ chatId: activeChatId })
      router.push(`/dashboard?${params}`)
    } else {
      router.push("/dashboard")
    }
  }

  return (
    <header className="bg-background sticky top-0 z-50 flex w-full items-center">
      <div className="relative flex h-(--header-height) w-full items-center gap-2 px-4">
        <Button
          className="h-8 w-8"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
        >
          <SidebarIcon />
        </Button>

        <h1 className="pointer-events-none absolute left-1/2 max-w-[50%] -translate-x-1/2 truncate text-center text-sm font-medium">
          {centerTitle}
        </h1>

        <div className="ml-auto flex items-center gap-1">
          <Button
            className="h-8 w-8"
            variant="ghost"
            size="icon"
            onClick={handleNewChat}
            aria-label={t("chat.new", "Новый чат")}
            title={t("chat.new", "Новый чат")}
          >
            <MessageSquarePlus className="size-4" />
          </Button>
          <SystemNavigationSheet mode="header" />
        </div>
      </div>
    </header>
  )
}
