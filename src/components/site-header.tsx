"use client"

import { Moon, SidebarIcon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useSidebar } from "@/components/ui/sidebar"
import { useI18n } from "@/components/i18n-provider"
import { SystemNavigationSheet } from "@/components/system-navigation-sheet"

export function SiteHeader({ title }: { title?: string }) {
  const { toggleSidebar } = useSidebar()
  const { locale, setLocale, theme, setTheme, t } = useI18n()

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
        <div className="ml-auto flex items-center gap-2">
          <SystemNavigationSheet mode="header" />
          <select
            aria-label="Language"
            value={locale}
            onChange={(e) => setLocale(e.target.value as "en" | "ru")}
            className="h-8 rounded-md border bg-background px-2 text-xs"
          >
            <option value="en">English</option>
            <option value="ru">Русский</option>
          </select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative h-8 w-8 overflow-hidden"
          >
            <Sun
              className={`absolute size-4 transition-all duration-300 ${
                theme === "dark" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
              }`}
            />
            <Moon
              className={`absolute size-4 transition-all duration-300 ${
                theme === "dark" ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
              }`}
            />
          </Button>
        </div>
      </div>
    </header>
  )
}
