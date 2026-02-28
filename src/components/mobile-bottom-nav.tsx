"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageSquare, Files } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";
import { SystemNavigationSheet } from "@/components/system-navigation-sheet";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  if (pathname === "/dashboard") {
    return null;
  }

  const items = [
    { href: "/dashboard", label: t("nav.chats", "Чат"), icon: Home },
    { href: "/dashboard/chats", label: t("nav.chatsManage", "Чаты"), icon: MessageSquare },
    { href: "/dashboard/files", label: t("nav.filesManage", "Файлы"), icon: Files },
  ];

  return (
    <>
      <div className="h-[calc(56px+env(safe-area-inset-bottom))] md:hidden" aria-hidden="true" />
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
        <div className="grid grid-cols-4">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("size-4", active && "text-primary")} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}

          <div className="flex h-14 items-center justify-center">
            <SystemNavigationSheet mode="mobile-more" />
          </div>
        </div>
      </div>
    </>
  );
}
