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
  const { t } = useI18n();

  const items = [
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
          <Button variant="ghost" className="flex flex-col h-auto gap-1 px-2 py-1 text-[11px] text-muted-foreground">
            <Menu className="size-4" />
            <span>{t("common.more", "More")}</span>
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
          <SheetTitle>{t("nav.navigation", "Navigation")}</SheetTitle>
          <SheetDescription>{t("nav.admin", "Eggent admin")}</SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-4 space-y-2 overflow-y-auto">
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
