"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Clock3,
  History,
  Loader2,
  Play,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";

type CronSchedule =
  | { kind: "at"; at: string }
  | { kind: "every"; everyMs: number; anchorMs?: number }
  | { kind: "cron"; expr: string; tz?: string };

type CronRunStatus = "ok" | "error" | "skipped";

type CronJob = {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  deleteAfterRun?: boolean;
  schedule: CronSchedule;
  payload: {
    kind: "agentTurn";
    message: string;
    telegramChatId?: string;
    timeoutSeconds?: number;
  };
  state: {
    nextRunAtMs?: number;
    runningAtMs?: number;
    lastRunAtMs?: number;
    lastStatus?: CronRunStatus;
    lastError?: string;
    lastDurationMs?: number;
  };
};

type CronStatus = {
  projectId: string;
  jobs: number;
  nextWakeAtMs: number | null;
};

type CronRunLogEntry = {
  ts: number;
  status: CronRunStatus;
  error?: string;
  summary?: string;
  runAtMs?: number;
  durationMs?: number;
  nextRunAtMs?: number;
};

type CronFormState = {
  name: string;
  description: string;
  enabled: boolean;
  deleteAfterRun: boolean;
  scheduleKind: "every" | "at" | "cron";
  scheduleAt: string;
  everyAmount: string;
  everyUnit: "minutes" | "hours" | "days";
  cronExpr: string;
  cronTz: string;
  message: string;
  telegramChatId: string;
  timeoutSeconds: string;
};

const DEFAULT_FORM: CronFormState = {
  name: "",
  description: "",
  enabled: true,
  deleteAfterRun: true,
  scheduleKind: "every",
  scheduleAt: "",
  everyAmount: "30",
  everyUnit: "minutes",
  cronExpr: "0 9 * * 1-5",
  cronTz: "",
  message: "",
  telegramChatId: "",
  timeoutSeconds: "",
};

function formatDateTime(ms: number | null | undefined, t: (k: string, f?: string) => string): string {
  if (typeof ms !== "number" || !Number.isFinite(ms)) {
    return t("cron.na", "n/a");
  }
  return new Date(ms).toLocaleString();
}

function formatDuration(ms: number | undefined, t: (k: string, f?: string) => string): string {
  if (typeof ms !== "number" || !Number.isFinite(ms)) {
    return t("cron.na", "n/a");
  }
  if (ms < 1_000) {
    return `${ms}ms`;
  }
  return `${(ms / 1_000).toFixed(1)}s`;
}

function scheduleSummary(schedule: CronSchedule, t: (k: string, f?: string) => string): string {
  if (schedule.kind === "at") {
    return `${t("cron.at", "At")} ${schedule.at}`;
  }
  if (schedule.kind === "every") {
    return `${t("cron.every", "Every")} ${schedule.everyMs}ms`;
  }
  return schedule.tz ? `Cron ${schedule.expr} (${schedule.tz})` : `Cron ${schedule.expr}`;
}

async function readErrorMessage(res: Response, t: (k: string, f?: string) => string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown };
    if (typeof body.error === "string" && body.error.trim()) {
      return body.error;
    }
  } catch {
    // no-op
  }
  return `${t("cron.requestFailed", "Request failed")} (${res.status})`;
}

interface CronSectionProps {
  projectId: string;
}

export function CronSection({ projectId }: CronSectionProps) {
  const { t } = useI18n();
  const [form, setForm] = useState<CronFormState>(DEFAULT_FORM);
  const [status, setStatus] = useState<CronStatus | null>(null);
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [runs, setRuns] = useState<CronRunLogEntry[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [runsLoading, setRunsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedJob = useMemo(
    () => (selectedJobId ? jobs.find((job) => job.id === selectedJobId) ?? null : null),
    [jobs, selectedJobId]
  );

  const loadStatusAndJobs = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [statusRes, jobsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/cron/status`),
        fetch(`/api/projects/${projectId}/cron?includeDisabled=true`),
      ]);

      if (!statusRes.ok) {
        throw new Error(await readErrorMessage(statusRes, t));
      }
      if (!jobsRes.ok) {
        throw new Error(await readErrorMessage(jobsRes, t));
      }

      const statusData = (await statusRes.json()) as CronStatus;
      const jobsData = (await jobsRes.json()) as { jobs?: CronJob[] };
      const nextJobs = Array.isArray(jobsData.jobs) ? jobsData.jobs : [];

      setStatus(statusData);
      setJobs(nextJobs);

      // Keep selectedJobId/runs even when a one-shot job disappears from active jobs
      // after successful run (deleteAfterRun=true). Run history is persisted separately.
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  async function loadRuns(jobId: string) {
    setError(null);
    setRunsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/cron/${jobId}/runs?limit=100`);
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, t));
      }
      const data = (await res.json()) as { entries?: CronRunLogEntry[] };
      const entries = Array.isArray(data.entries) ? data.entries : [];
      setSelectedJobId(jobId);
      setRuns([...entries].sort((a, b) => b.ts - a.ts));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunsLoading(false);
    }
  }

  useEffect(() => {
    void loadStatusAndJobs();
  }, [loadStatusAndJobs]);

  async function createJob() {
    setError(null);
    setBusy(true);
    try {
      const name = form.name.trim();
      if (!name) {
        throw new Error(t("cron.errors.jobNameRequired", "Job name is required."));
      }
      const message = form.message.trim();
      if (!message) {
        throw new Error(t("cron.errors.agentMessageRequired", "Agent message is required."));
      }

      let schedule: CronSchedule;
      if (form.scheduleKind === "at") {
        const atMs = Date.parse(form.scheduleAt);
        if (!Number.isFinite(atMs)) {
          throw new Error(t("cron.errors.invalidAt", "Invalid date/time for 'At' schedule."));
        }
        schedule = { kind: "at", at: new Date(atMs).toISOString() };
      } else if (form.scheduleKind === "every") {
        const amount = Number(form.everyAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error(t("cron.errors.intervalPositive", "Interval amount must be a positive number."));
        }
        const multiplier =
          form.everyUnit === "minutes"
            ? 60_000
            : form.everyUnit === "hours"
              ? 3_600_000
              : 86_400_000;
        schedule = { kind: "every", everyMs: Math.floor(amount * multiplier) };
      } else {
        const expr = form.cronExpr.trim();
        if (!expr) {
          throw new Error(t("cron.errors.cronRequired", "Cron expression is required."));
        }
        schedule = {
          kind: "cron",
          expr,
          tz: form.cronTz.trim() || undefined,
        };
      }

      const timeoutValue = Number(form.timeoutSeconds);
      const timeoutSeconds =
        Number.isFinite(timeoutValue) && timeoutValue > 0 ? Math.floor(timeoutValue) : undefined;

      const res = await fetch(`/api/projects/${projectId}/cron`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: form.description.trim() || undefined,
          enabled: form.enabled,
          deleteAfterRun: form.deleteAfterRun,
          schedule,
          payload: {
            kind: "agentTurn",
            message,
            telegramChatId: form.telegramChatId.trim() || undefined,
            timeoutSeconds,
          },
        }),
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, t));
      }

      setForm((prev) => ({
        ...prev,
        name: "",
        description: "",
        message: "",
        telegramChatId: "",
        timeoutSeconds: "",
      }));
      await loadStatusAndJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleJob(job: CronJob, enabled: boolean) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/cron/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, t));
      }
      await loadStatusAndJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function runNow(job: CronJob) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/cron/${job.id}/run`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, t));
      }
      await Promise.all([loadStatusAndJobs(), loadRuns(job.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function removeJob(job: CronJob) {
    const confirmed = confirm(`${t("cron.confirm.deleteJob", "Delete cron job")} "${job.name}"?`);
    if (!confirmed) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/cron/${job.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, t));
      }
      if (selectedJobId === job.id) {
        setSelectedJobId(null);
        setRuns([]);
      }
      await loadStatusAndJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <CalendarClock className="size-5 text-primary" />
          {t("cron.title", "Cron Jobs")}
        </h3>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => void loadStatusAndJobs()}
          disabled={loading || busy}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {t("cron.refresh", "Refresh")}
        </Button>
      </div>

      {error && (
        <div className="text-sm border border-destructive/30 bg-destructive/10 text-destructive rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="border rounded-lg bg-card p-4 space-y-3">
          <p className="text-sm font-medium">{t("cron.schedulerStatus", "Scheduler Status")}</p>
          <div className="text-sm text-muted-foreground">
            <p>{t("cron.project", "Project")}: {status?.projectId ?? projectId}</p>
            <p>{t("cron.jobs", "Jobs")}: {status?.jobs ?? (loading ? "…" : 0)}</p>
            <p>{t("cron.nextWake", "Next wake")}: {formatDateTime(status?.nextWakeAtMs ?? null, t)}</p>
          </div>
        </div>

        <div className="border rounded-lg bg-card p-4 space-y-3 lg:col-span-2">
          <p className="text-sm font-medium">{t("cron.createJob", "Create Job")}</p>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cron-name">{t("cron.name", "Name")}</Label>
              <Input
                id="cron-name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t("cron.name", "Name")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cron-description">{t("cron.description", "Description")}</Label>
              <Input
                id="cron-description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder={t("common.optional", "Optional")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cron-schedule-kind">{t("cron.schedule", "Schedule")}</Label>
              <select
                id="cron-schedule-kind"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.scheduleKind}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    scheduleKind: e.target.value as CronFormState["scheduleKind"],
                  }))
                }
              >
                <option value="every">{t("cron.everyLabel", "Every")}</option>
                <option value="at">{t("cron.at", "At")}</option>
                <option value="cron">Cron</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cron-timeout">{t("cron.timeoutSeconds", "Timeout (seconds)")}</Label>
              <Input
                id="cron-timeout"
                value={form.timeoutSeconds}
                onChange={(e) => setForm((prev) => ({ ...prev, timeoutSeconds: e.target.value }))}
                placeholder={t("common.optional", "Optional")}
              />
            </div>
          </div>

          {form.scheduleKind === "at" && (
            <div className="space-y-2">
              <Label htmlFor="cron-at">{t("cron.runAt", "Run At")}</Label>
              <Input
                id="cron-at"
                type="datetime-local"
                value={form.scheduleAt}
                onChange={(e) => setForm((prev) => ({ ...prev, scheduleAt: e.target.value }))}
              />
            </div>
          )}

          {form.scheduleKind === "every" && (
            <div className="grid gap-3 md:grid-cols-[1fr_180px]">
              <div className="space-y-2">
                <Label htmlFor="cron-every-amount">{t("cron.everyLabel", "Every")}</Label>
                <Input
                  id="cron-every-amount"
                  value={form.everyAmount}
                  onChange={(e) => setForm((prev) => ({ ...prev, everyAmount: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cron-every-unit">{t("cron.unit", "Unit")}</Label>
                <select
                  id="cron-every-unit"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={form.everyUnit}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      everyUnit: e.target.value as CronFormState["everyUnit"],
                    }))
                  }
                >
                  <option value="minutes">{t("cron.minutes", "Minutes")}</option>
                  <option value="hours">{t("cron.hours", "Hours")}</option>
                  <option value="days">{t("cron.days", "Days")}</option>
                </select>
              </div>
            </div>
          )}

          {form.scheduleKind === "cron" && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cron-expr">{t("cron.cronExpr", "Cron Expression")}</Label>
                <Input
                  id="cron-expr"
                  value={form.cronExpr}
                  onChange={(e) => setForm((prev) => ({ ...prev, cronExpr: e.target.value }))}
                  placeholder="0 9 * * 1-5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cron-tz">{t("cron.timeZone", "Time Zone")}</Label>
                <Input
                  id="cron-tz"
                  value={form.cronTz}
                  onChange={(e) => setForm((prev) => ({ ...prev, cronTz: e.target.value }))}
                  placeholder={`${t("common.optional", "Optional")}, e.g. UTC`}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cron-message">{t("cron.agentMessage", "Agent Message")}</Label>
            <textarea
              id="cron-message"
              value={form.message}
              onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
              placeholder={t("cron.agentMessagePlaceholder", "What should the agent do on each run?")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[88px] resize-y"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cron-telegram-chat-id">{t("cron.telegramChatId", "Telegram Chat ID (optional)")}</Label>
            <Input
              id="cron-telegram-chat-id"
              value={form.telegramChatId}
              onChange={(e) => setForm((prev) => ({ ...prev, telegramChatId: e.target.value }))}
              placeholder="e.g. 123456789"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.checked }))}
              />
              {t("cron.enabled", "Enabled")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.deleteAfterRun}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, deleteAfterRun: e.target.checked }))
                }
              />
              {t("cron.deleteAfterOneShot", "Delete after one-shot run")}
            </label>
          </div>

          <Button onClick={() => void createJob()} disabled={busy} className="gap-2">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <CalendarClock className="size-4" />}
            {t("cron.createJob", "Create Job")}
          </Button>
        </div>
      </div>

      <div className="border rounded-lg bg-card">
        <div className="px-4 py-3 border-b">
          <p className="text-sm font-medium">{t("cron.jobs", "Jobs")}</p>
        </div>
        {loading ? (
          <div className="p-8 text-muted-foreground text-sm flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            {t("cron.loadingJobs", "Loading jobs...")}
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            {t("cron.empty", "No cron jobs yet.")}
          </div>
        ) : (
          <div className="divide-y">
            {jobs.map((job) => (
              <div key={job.id} className="p-4 space-y-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{job.name}</p>
                    {job.description && (
                      <p className="text-sm text-muted-foreground">{job.description}</p>
                    )}
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>{t("cron.schedule", "Schedule")}: {scheduleSummary(job.schedule, t)}</p>
                      <p>{t("cron.nextRun", "Next run")}: {formatDateTime(job.state.nextRunAtMs, t)}</p>
                      <p>{t("cron.lastRun", "Last run")}: {formatDateTime(job.state.lastRunAtMs, t)}</p>
                      <p>{t("cron.lastDuration", "Last duration")}: {formatDuration(job.state.lastDurationMs, t)}</p>
                      {job.state.lastStatus && <p>{t("cron.lastStatus", "Last status")}: {job.state.lastStatus}</p>}
                      {job.state.lastError && (
                        <p className="text-destructive">{t("cron.errorLabel", "Error")}: {job.state.lastError}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void toggleJob(job, !job.enabled)}
                      disabled={busy}
                    >
                      {job.enabled ? t("cron.disable", "Disable") : t("cron.enable", "Enable")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void runNow(job)}
                      disabled={busy}
                      className="gap-1"
                    >
                      <Play className="size-3.5" />
                      {t("cron.runNow", "Run now")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void loadRuns(job.id)}
                      disabled={busy}
                      className="gap-1"
                    >
                      <History className="size-3.5" />
                      {t("cron.runs", "Runs")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void removeJob(job)}
                      disabled={busy}
                      className="text-muted-foreground hover:text-destructive"
                      title={t("cron.deleteJobTitle", "Delete job")}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border rounded-lg bg-card">
        <div className="px-4 py-3 border-b">
          <p className="text-sm font-medium flex items-center gap-2">
            <Clock3 className="size-4 text-primary" />
            {t("cron.runHistory", "Run History")}{" "}
            {selectedJob
              ? `${t("cron.runHistoryFor", "for")} "${selectedJob.name}"`
              : selectedJobId
                ? `(job ${selectedJobId})`
                : ""}
          </p>
        </div>
        {selectedJobId === null ? (
          <div className="p-4 text-sm text-muted-foreground">
            {t("cron.selectRunsHint", "Select a job and click \"Runs\" to inspect history.")}
          </div>
        ) : !selectedJob ? (
          runsLoading ? (
            <div className="p-8 text-muted-foreground text-sm flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              {t("cron.loadingRunHistory", "Loading run history...")}
            </div>
          ) : runs.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              {t("cron.jobNotActiveNoRuns", "Job is no longer in active list (likely one-shot auto-delete). No runs found yet.")}
            </div>
          ) : (
            <div className="divide-y">
              {runs.map((entry, idx) => (
                <div key={`${entry.ts}-${idx}`} className="p-4 text-sm space-y-1">
                  <p>
                    <span className="font-medium">{entry.status.toUpperCase()}</span>{" "}
                    {t("cron.atLabel", "at")} {formatDateTime(entry.runAtMs ?? entry.ts, t)}
                  </p>
                  <p className="text-muted-foreground">
                    {t("cron.duration", "Duration")}: {formatDuration(entry.durationMs, t)} | {t("cron.nextRun", "Next run")}:{" "}
                    {formatDateTime(entry.nextRunAtMs, t)}
                  </p>
                  {entry.summary && <p>{entry.summary}</p>}
                  {entry.error && <p className="text-destructive">{entry.error}</p>}
                </div>
              ))}
            </div>
          )
        ) : runsLoading ? (
          <div className="p-8 text-muted-foreground text-sm flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            {t("cron.loadingRunHistory", "Loading run history...")}
          </div>
        ) : runs.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">{t("cron.noRunsYet", "No run history yet.")}</div>
        ) : (
          <div className="divide-y">
            {runs.map((entry, idx) => (
              <div key={`${entry.ts}-${idx}`} className="p-4 text-sm space-y-1">
                <p>
                  <span className="font-medium">{entry.status.toUpperCase()}</span>{" "}
                  at {formatDateTime(entry.runAtMs ?? entry.ts, t)}
                </p>
                <p className="text-muted-foreground">
                  {t("cron.duration", "Duration")}: {formatDuration(entry.durationMs, t)} | {t("cron.nextRun", "Next run")}:{" "}
                  {formatDateTime(entry.nextRunAtMs, t)}
                </p>
                {entry.summary && <p>{entry.summary}</p>}
                {entry.error && <p className="text-destructive">{entry.error}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
