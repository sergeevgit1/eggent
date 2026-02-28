"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarClock,
  Cable,
  LifeBuoy,
  LogOut,
  MessagesSquare,
  Brain,
  FolderOpen,
  Puzzle,
  Settings2,
  Wrench,
  User,
  Menu,
  ChevronRight,
  Moon,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

type TriggerMode = "header" | "profile" | "mobile-more";

export function SystemNavigationSheet({ mode }: { mode: TriggerMode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale, setLocale, theme, setTheme, reasoningMode, setReasoningMode } = useI18n();

  const items = [
    { href: "/dashboard/chats", label: t("nav.chatsManage", "Управление чатами"), icon: MessagesSquare },
    { href: "/dashboard/files", label: t("nav.filesManage", "Управление файлами"), icon: FolderOpen },
    { href: "/dashboard/projects", label: t("nav.projects", "Projects"), icon: FolderOpen },
    { href: "/dashboard/memory", label: t("nav.memory", "Memory"), icon: Brain },
    { href: "/dashboard/skills", label: t("nav.skills", "Skills"), icon: Puzzle },
    { href: "/dashboard/mcp", label: t("nav.mcp", "MCP"), icon: Wrench },
    { href: "/dashboard/cron", label: t("nav.cron", "Cron Jobs"), icon: CalendarClock },
    { href: "/dashboard/settings", label: t("nav.settings", "Settings"), icon: Settings2 },
    { href: "/dashboard/api", label: t("nav.api", "API"), icon: Cable },
    { href: "/dashboard/messengers", label: t("nav.messengers", "Messengers"), icon: MessagesSquare },
  ];

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {mode === "header" ? (
          <Button variant="outline" size="sm" className="hidden md:inline-flex gap-2">
            <Menu className="size-4" />
            {t("nav.navigation", "Navigation")}
          </Button>
        ) : mode === "mobile-more" ? (
          <Button
            variant="ghost"
            className={cn(
              "flex h-14 w-full flex-col items-center justify-center gap-0.5 rounded-none px-2 text-[11px]",
              "text-muted-foreground"
            )}
          >
            <Menu className="size-4" />
            <span>{t("common.more", "Ещё")}</span>
          </Button>
        ) : (
          <Button variant="ghost" className="w-full justify-start gap-2 md:hidden">
            <User className="size-4" />
            {t("nav.adminUser", "admin")}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{t("nav.navigation", "Навигация")}</SheetTitle>
          <SheetDescription>{t("nav.admin", "Eggent admin")}</SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-4 space-y-2 overflow-y-auto">
          <div className="mb-3 rounded-lg border bg-card p-3 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("settings.appearance", "Appearance")}
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs text-muted-foreground">{t("settings.language", "Language")}</label>
              <select
                aria-label="Language"
                value={locale}
                onChange={(e) => setLocale(e.target.value as "en" | "ru")}
                className="h-9 rounded-md border bg-background px-2 text-sm"
              >
                <option value="en">English</option>
                <option value="ru">Русский</option>
              </select>
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs text-muted-foreground">{t("settings.theme", "Theme")}</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => setTheme("light")}
                >
                  <Sun className="size-3.5" />
                  {t("theme.light", "Light")}
                </Button>
                <Button
                  type="button"
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => setTheme("dark")}
                >
                  <Moon className="size-3.5" />
                  {t("theme.dark", "Dark")}
                </Button>
              </div>
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs text-muted-foreground">{t("settings.reasoning", "Reasoning")}</label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={reasoningMode === "off" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setReasoningMode("off")}
                >
                  {t("settings.reasoning.off", "Off")}
                </Button>
                <Button
                  type="button"
                  variant={reasoningMode === "compact" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setReasoningMode("compact")}
                >
                  {t("settings.reasoning.compact", "Compact")}
                </Button>
                <Button
                  type="button"
                  variant={reasoningMode === "verbose" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setReasoningMode("verbose")}
                >
                  {t("settings.reasoning.verbose", "Verbose")}
                </Button>
              </div>
            </div>
          </div>

          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent",
                  active && "bg-accent font-medium"
                )}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <a
            href="https://github.com/eggent-ai/eggent"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
          >
            <LifeBuoy className="size-4" />
            <span>{t("nav.docs", "Documentation")}</span>
          </a>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent text-left"
          >
            <LogOut className="size-4" />
            <span>{t("nav.logout", "Logout")}</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
