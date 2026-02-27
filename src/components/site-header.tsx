"use client"

import { SidebarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useSidebar } from "@/components/ui/sidebar"
import { useI18n } from "@/components/i18n-provider"

export function SiteHeader({ title }: { title?: string }) {
  const { toggleSidebar } = useSidebar()
  const { t } = useI18n()

  return (
    <header className="bg-background sticky top-0 z-50 flex w-full items-center border-b">
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4">
        <Button
          className="h-8 w-8"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
        >
          <SidebarIcon />
        </Button>
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-sm font-medium">
          {(() => {
            if (!title) return "Eggent";
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
            };
            return map[title] || title;
          })()}
        </h1>
      </div>
    </header>
  )
}
