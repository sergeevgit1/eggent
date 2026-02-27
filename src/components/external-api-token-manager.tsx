"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import { copyTextToClipboard } from "@/lib/utils";

type TokenSource = "env" | "stored" | "none";

interface TokenStatusResponse {
  configured: boolean;
  source: TokenSource;
  maskedToken: string | null;
  updatedAt: string | null;
  error?: string;
}

interface TokenRotateResponse {
  success: boolean;
  token: string;
  maskedToken: string;
  source: "stored";
  error?: string;
}

export function ExternalApiTokenManager() {
  const { t } = useI18n();
  const [status, setStatus] = useState<TokenStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadStatus = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/external/token", { cache: "no-store" });
      const data = (await res.json()) as TokenStatusResponse;
      if (!res.ok) {
        throw new Error(data.error || t("apiToken.errors.load", "Failed to load token status"));
      }
      setStatus(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("apiToken.errors.load", "Failed to load token status"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const rotateToken = useCallback(async () => {
    setError(null);
    setRotating(true);
    setCopied(false);
    try {
      const res = await fetch("/api/external/token", { method: "POST" });
      const data = (await res.json()) as TokenRotateResponse;
      if (!res.ok) {
        throw new Error(data.error || t("apiToken.errors.rotate", "Failed to rotate token"));
      }
      setFreshToken(data.token);
      await loadStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("apiToken.errors.rotate", "Failed to rotate token"));
    } finally {
      setRotating(false);
    }
  }, [loadStatus]);

  const copyToken = useCallback(async () => {
    if (!freshToken) return;
    setError(null);
    try {
      const copiedOk = await copyTextToClipboard(freshToken);
      if (!copiedOk) {
        throw new Error("copy-failed");
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError(t("apiToken.errors.copy", "Failed to copy token"));
    }
  }, [freshToken]);

  const updatedLabel = useMemo(() => {
    if (!status?.updatedAt) return null;
    const date = new Date(status.updatedAt);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString();
  }, [status?.updatedAt]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t("apiToken.intro", "Create a token for Authorization: Bearer ... and rotate it when needed.")}
      </p>

      {status?.source === "env" && (
        <p className="text-xs text-amber-600">
          {t("apiToken.envDetected", "Env token detected. Generate to create and use an app-managed token.")}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t("apiToken.loading", "Loading token status...")}
        </div>
      ) : (
        <div className="space-y-1 text-sm">
          <div>
            {t("apiToken.status", "Status")}: {" "}
            <span className="font-medium">
              {status?.configured ? t("apiToken.configured", "configured") : t("apiToken.notConfigured", "not configured")}
            </span>
          </div>
          {status?.maskedToken && (
            <div>
              {t("apiToken.currentToken", "Current token")}: {" "}
              <span className="font-mono text-xs">{status.maskedToken}</span>
            </div>
          )}
          {updatedLabel && (
            <div className="text-muted-foreground">{t("apiToken.updated", "Updated")}: {updatedLabel}</div>
          )}
        </div>
      )}

      <Button onClick={rotateToken} disabled={rotating || loading}>
        {rotating ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {t("apiToken.processing", "Processing...")}
          </>
        ) : (
          <>
            <RefreshCw className="size-4" />
            {status?.configured ? t("apiToken.regenerate", "Regenerate Token") : t("apiToken.generate", "Generate Token")}
          </>
        )}
      </Button>

      {freshToken && (
        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">
            {t("apiToken.newTokenShownOnce", "New token (shown once):")}
          </p>
          <code className="block break-all rounded bg-background p-2 text-xs">
            {freshToken}
          </code>
          <Button variant="outline" size="sm" onClick={copyToken}>
            {copied ? (
              <>
                <Check className="size-4" />
                {t("apiToken.copied", "Copied")}
              </>
            ) : (
              <>
                <Copy className="size-4" />
                {t("apiToken.copy", "Copy token")}
              </>
            )}
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
