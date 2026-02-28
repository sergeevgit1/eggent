"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  File,
  Download,
  Play,
  Save,
} from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { useBackgroundSync } from "@/hooks/use-background-sync";
import { useI18n } from "@/components/i18n-provider";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface FileEntry {
  name: string;
  type: "file" | "directory";
  size: number;
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx":
    case "js":
    case "jsx":
    case "py":
    case "sh":
    case "json":
    case "yaml":
    case "yml":
      return FileCode;
    case "md":
    case "txt":
    case "csv":
      return FileText;
    default:
      return File;
  }
}

interface TreeNodeProps {
  projectId: string;
  name: string;
  relativePath: string;
  type: "file" | "directory";
  depth: number;
  refreshToken: number;
  t: (key: string, fallback?: string) => string;
  onFileOpen: (filePath: string, fileName: string) => void;
}

function TreeNode({
  projectId,
  name,
  relativePath,
  type,
  depth,
  refreshToken,
  t,
  onFileOpen,
}: TreeNodeProps) {
  const { currentPath, setCurrentPath } = useAppStore();
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const downloadHref = useMemo(() => {
    if (type !== "file") return "";
    const params = new URLSearchParams({
      project: projectId,
      path: relativePath,
    });
    return `/api/files/download?${params.toString()}`;
  }, [projectId, relativePath, type]);

  const isActive = type === "directory" && currentPath === relativePath;

  useEffect(() => {
    if (
      type === "directory" &&
      currentPath.startsWith(relativePath + "/") &&
      !expanded
    ) {
      setExpanded(true);
    }
  }, [currentPath, relativePath, type, expanded]);

  const loadChildren = useCallback(async (force = false, showLoader = true) => {
    if (!force && children !== null) return;
    if (showLoader) setLoading(true);
    try {
      const params = new URLSearchParams({
        project: projectId,
        path: relativePath,
      });
      const res = await fetch(`/api/files?${params}`);
      const data = await res.json();
      if (Array.isArray(data)) setChildren(data);
    } catch {
      setChildren((prev) => (prev === null ? [] : prev));
    }
    if (showLoader) setLoading(false);
  }, [projectId, relativePath, children]);

  useEffect(() => {
    if (type !== "directory" || !expanded || children !== null) return;
    void loadChildren(false, true);
  }, [type, expanded, children, loadChildren]);

  useEffect(() => {
    if (type !== "directory" || !expanded) return;
    void loadChildren(true, false);
  }, [refreshToken, type, expanded, loadChildren]);

  const handleClick = () => {
    if (type === "directory") {
      const willExpand = !expanded;
      setExpanded(willExpand);
      if (willExpand) void loadChildren(true, true);
      setCurrentPath(relativePath);
      return;
    }
    onFileOpen(relativePath, name);
  };

  const Icon = type === "directory" ? (expanded ? FolderOpen : Folder) : getFileIcon(name);

  return (
    <div className="group/tree-node relative">
      <button
        onClick={handleClick}
        className={cn(
          "flex items-center gap-1 w-full text-left text-xs py-1 px-1 rounded-sm hover:bg-accent/50 transition-colors",
          type === "file" && "pr-7",
          isActive && "bg-accent text-accent-foreground font-medium"
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {type === "directory" ? (
          expanded ? (
            <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="size-3 shrink-0" />
        )}
        <Icon
          className={cn(
            "size-3.5 shrink-0",
            type === "directory" ? "text-blue-500" : "text-muted-foreground"
          )}
        />
        <span className="truncate">{name}</span>
      </button>

      {type === "file" && (
        <a
          href={downloadHref}
          download={name}
          className="absolute right-1 top-1/2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition hover:bg-accent hover:text-foreground group-hover/tree-node:opacity-100"
          title={`${t("files.download", "Download")} ${name}`}
          aria-label={`${t("files.download", "Download")} ${name}`}
        >
          <Download className="size-3.5" />
        </a>
      )}

      {type === "directory" && expanded && (
        <div>
          {loading && (
            <span className="text-[10px] text-muted-foreground block" style={{ paddingLeft: `${(depth + 1) * 12 + 4}px` }}>
              {t("common.loading", "Loading...")}
            </span>
          )}
          {children?.map((child) => (
            <TreeNode
              key={child.name}
              projectId={projectId}
              name={child.name}
              relativePath={relativePath ? `${relativePath}/${child.name}` : child.name}
              type={child.type}
              depth={depth + 1}
              refreshToken={refreshToken}
              t={t}
              onFileOpen={onFileOpen}
            />
          ))}
          {children?.length === 0 && !loading && (
            <span className="text-[10px] text-muted-foreground block py-0.5" style={{ paddingLeft: `${(depth + 1) * 12 + 4}px` }}>
              {t("files.empty", "Empty")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface FileTreeProps {
  projectId: string;
}

export function FileTree({ projectId }: FileTreeProps) {
  const { t } = useI18n();
  const { currentPath, setCurrentPath } = useAppStore();
  const [rootEntries, setRootEntries] = useState<FileEntry[] | null>(null);
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ path: string; name: string } | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [isBinary, setIsBinary] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [runOutput, setRunOutput] = useState("");
  const [fileError, setFileError] = useState("");

  const refreshToken = useBackgroundSync({
    topics: ["files", "projects", "global"],
    projectId: projectId === "none" ? null : projectId,
  });

  const fetchFileContent = useCallback(async (filePath: string) => {
    setLoadingFile(true);
    setFileError("");
    setRunOutput("");
    try {
      const params = new URLSearchParams({ project: projectId, path: filePath });
      const res = await fetch(`/api/files/content?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Не удалось прочитать файл");
      setIsBinary(Boolean(data.binary));
      setFileContent(data.content || "");
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Ошибка чтения файла");
      setIsBinary(false);
      setFileContent("");
    } finally {
      setLoadingFile(false);
    }
  }, [projectId]);

  const handleOpenFile = useCallback((filePath: string, fileName: string) => {
    setSelectedFile({ path: filePath, name: fileName });
    void fetchFileContent(filePath);
  }, [fetchFileContent]);

  const saveFile = useCallback(async () => {
    if (!selectedFile || isBinary) return;
    setSaving(true);
    setFileError("");
    try {
      const res = await fetch("/api/files/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: projectId, path: selectedFile.path, content: fileContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Не удалось сохранить файл");
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }, [selectedFile, isBinary, projectId, fileContent]);

  const runFile = useCallback(async () => {
    if (!selectedFile) return;
    setRunning(true);
    setFileError("");
    try {
      const res = await fetch("/api/files/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: projectId, path: selectedFile.path }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Не удалось выполнить файл");
      setRunOutput(String(data.output || "(no output)"));
    } catch (error) {
      setRunOutput("");
      setFileError(error instanceof Error ? error.message : "Ошибка запуска");
    } finally {
      setRunning(false);
    }
  }, [selectedFile, projectId]);

  useEffect(() => {
    setRootEntries(null);
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ project: projectId, path: "" });
    fetch(`/api/files?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data)) setRootEntries(data);
      })
      .catch(() => {
        if (!cancelled) setRootEntries((prev) => (prev === null ? [] : prev));
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, refreshToken]);

  const rootVisible = useMemo(() => {
    if (!rootEntries) return rootEntries;
    if (!onlyUnassigned) return rootEntries;
    return rootEntries.filter((entry) => entry.name !== "tasks");
  }, [rootEntries, onlyUnassigned]);

  const unassignedCount = useMemo(() => {
    if (!rootEntries) return 0;
    return rootEntries.filter((entry) => entry.name !== "tasks" && entry.name !== ".meta").length;
  }, [rootEntries]);

  const downloadHref = useMemo(() => {
    if (!selectedFile) return "";
    const params = new URLSearchParams({ project: projectId, path: selectedFile.path });
    return `/api/files/download?${params.toString()}`;
  }, [selectedFile, projectId]);

  return (
    <div className="text-xs">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <button
          type="button"
          onClick={() => setOnlyUnassigned((v) => !v)}
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] border",
            onlyUnassigned ? "border-amber-500/60 text-amber-300" : "border-border text-muted-foreground"
          )}
        >
          {onlyUnassigned ? "Показаны без задачи" : "Фильтр: без задачи"}
        </button>
        <span className="text-[10px] text-muted-foreground">Без привязки: {unassignedCount}</span>
      </div>

      <button
        onClick={() => setCurrentPath("")}
        className={cn(
          "flex items-center gap-1 w-full text-left text-xs py-1 px-1 rounded-sm hover:bg-accent/50 transition-colors",
          currentPath === "" && "bg-accent text-accent-foreground font-medium"
        )}
      >
        <FolderOpen className="size-3.5 shrink-0 text-blue-500" />
        <span className="truncate font-medium">/</span>
      </button>

      {rootVisible === null ? (
        <span className="text-[10px] text-muted-foreground block pl-4 py-1">{t("common.loading", "Loading...")}</span>
      ) : rootVisible.length === 0 ? (
        <span className="text-[10px] text-muted-foreground block pl-4 py-1">{t("files.noFiles", "No files")}</span>
      ) : (
        rootVisible.map((entry) => (
          <TreeNode
            key={entry.name}
            projectId={projectId}
            name={entry.name}
            relativePath={entry.name}
            type={entry.type}
            depth={1}
            refreshToken={refreshToken}
            t={t}
            onFileOpen={handleOpenFile}
          />
        ))
      )}

      <Sheet open={Boolean(selectedFile)} onOpenChange={(open) => !open && setSelectedFile(null)}>
        <SheetContent side="right" className="w-[95vw] sm:max-w-2xl p-0">
          <SheetHeader className="border-b">
            <SheetTitle className="truncate text-sm">{selectedFile?.name || "Файл"}</SheetTitle>
            {selectedFile && <p className="text-xs text-muted-foreground break-all">{selectedFile.path}</p>}
          </SheetHeader>

          <div className="p-4 space-y-3 h-[calc(100dvh-110px)] overflow-y-auto">
            <div className="flex flex-wrap gap-2">
              <a href={downloadHref} download={selectedFile?.name || "file"} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-accent">
                <Download className="size-3.5" /> Скачать
              </a>
              {!isBinary && (
                <button onClick={() => void saveFile()} disabled={saving || loadingFile} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-accent disabled:opacity-60">
                  <Save className="size-3.5" /> {saving ? "Сохранение..." : "Сохранить"}
                </button>
              )}
              <button onClick={() => void runFile()} disabled={running || loadingFile} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-accent disabled:opacity-60">
                <Play className="size-3.5" /> {running ? "Запуск..." : "Запустить"}
              </button>
            </div>

            {fileError && <div className="rounded border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-300">{fileError}</div>}

            {loadingFile ? (
              <div className="text-xs text-muted-foreground">Загрузка файла...</div>
            ) : isBinary ? (
              <div className="rounded border p-3 text-xs text-muted-foreground">
                Бинарный файл. Просмотр/редактирование недоступны, но можно скачать.
              </div>
            ) : (
              <textarea
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                className="h-[48dvh] w-full rounded border bg-background p-2 font-mono text-xs"
                spellCheck={false}
              />
            )}

            {runOutput && (
              <div>
                <p className="mb-1 text-xs font-medium">Output</p>
                <pre className="max-h-[30dvh] overflow-auto rounded border bg-muted/30 p-2 text-[11px] whitespace-pre-wrap">{runOutput}</pre>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
