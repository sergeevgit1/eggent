"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { TelegramIntegrationManager } from "@/components/telegram-integration-manager";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useI18n } from "@/components/i18n-provider";

export default function MessengersPage() {
  const { t } = useI18n();
  return (
    <div className="h-svh overflow-hidden [--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex h-full min-h-0">
        <AppSidebar />
        <SidebarInset className="min-h-0 overflow-hidden">
          <SiteHeader title="Messengers" />
          <div className="flex min-h-0 flex-1 overflow-auto">
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 max-w-5xl mx-auto w-full">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">{t("messengers.title", "Messenger Integrations")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("messengers.subtitle", "Connect external messengers to the agent. Telegram is available now.")}
                </p>
              </div>

              <section className="rounded-lg border bg-card p-4 space-y-2">
                <h3 className="text-lg font-medium">{t("messengers.telegramCommands", "Telegram Commands")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("messengers.availableCommands", "Available commands in Telegram private chat:")}
                </p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  <li>
                    <span className="font-mono">/start</span> - {t("messengers.cmdStart", "show help and connection status")}
                  </li>
                  <li>
                    <span className="font-mono">/help</span> - {t("messengers.cmdHelp", "show help")}
                  </li>
                  <li>
                    <span className="font-mono">/code &lt;access_code&gt;</span> - {t("messengers.cmdCode", "activate access for your Telegram user_id")}
                  </li>
                  <li>
                    <span className="font-mono">/new</span> - {t("messengers.cmdNew", "start a new conversation and reset context")}
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground">
                  {t("messengers.notes", "Notes: only private chats are supported. Uploaded files are saved into chat files, and you can ask the agent to send a local file back to Telegram.")}
                </p>
              </section>

              <TelegramIntegrationManager />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
