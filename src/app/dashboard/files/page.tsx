"use client";

import { useEffect, useMemo, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Project } from "@/lib/types";
import { Download, FileCode, FileText, Folder, Loader2, Play, Save, Trash2 } from "lucide-react";

interface FileEntry {
  name: string;
  type: "file" | "directory";
  size: number;
}

function joinPath(base: string, next: string): string {
  if (!base) return next;
  return `${base}/${next}`;
}

export default function FilesManagementPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>("none");
  const [path, setPath] = useState<string>("");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [binary, setBinary] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);
  const [runOutput, setRunOutput] = useState("");
  const [error, setError] = useState("");

  const fullSelectedPath = useMemo(
    () => (selectedFile ? joinPath(path, selectedFile) : null),
    [path, selectedFile]
  );

  const canRun = useMemo(() => {
    if (!selectedFile) return false;
    const lower = selectedFile.toLowerCase();
    return lower.endsWith(".py") || lower.endsWith(".js") || lower.endsWith(".mjs") || lower.endsWith(".cjs") || lower.endsWith(".sh");
  }, [selectedFile]);

  const loadProjects = async () => {
    const res = await fetch("/api/projects");
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    setProjects(list);
    if (projectId !== "none" && !list.some((p) => p.id === projectId)) {
      setProjectId("none");
    }
  };

  const loadEntries = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ project: projectId, path });
      const res = await fetch(`/api/files?${params.toString()}`);
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      setEntries([]);
      setError("Не удалось загрузить список файлов.");
    } finally {
      setLoading(false);
    }
  };

  const openFile = async (fileName: string) => {
    const targetPath = joinPath(path, fileName);
    setSelectedFile(fileName);
    setFileBusy(true);
    setError("");
    setRunOutput("");
    try {
      const params = new URLSearchParams({ project: projectId, path: targetPath });
      const res = await fetch(`/api/files/content?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Ошибка чтения файла");
      setBinary(Boolean(data.binary));
      setContent(data.content || "");
    } catch (e) {
      setBinary(false);
      setContent("");
      setError(e instanceof Error ? e.message : "Ошибка чтения файла");
    } finally {
      setFileBusy(false);
    }
  };

  const saveFile = async () => {
    if (!fullSelectedPath || binary) return;
    setFileBusy(true);
    setError("");
    try {
      const res = await fetch("/api/files/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: projectId, path: fullSelectedPath, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Ошибка сохранения");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setFileBusy(false);
    }
  };

  const runFile = async () => {
    if (!fullSelectedPath || !canRun) return;
    setFileBusy(true);
    setError("");
    setRunOutput("");
    try {
      const res = await fetch("/api/files/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: projectId, path: fullSelectedPath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Ошибка запуска");
      setRunOutput(String(data.output || "(no output)"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка запуска");
    } finally {
      setFileBusy(false);
    }
  };

  const deleteEntry = async (entry: FileEntry) => {
    const targetPath = joinPath(path, entry.name);
    const ok = window.confirm(`Удалить ${entry.type === "directory" ? "папку" : "файл"} "${entry.name}"?`);
    if (!ok) return;

    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ project: projectId, path: targetPath });
      const res = await fetch(`/api/files?${params.toString()}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Ошибка удаления");
      if (selectedFile === entry.name) {
        setSelectedFile(null);
        setContent("");
        setRunOutput("");
      }
      await loadEntries();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка удаления");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  useEffect(() => {
    setSelectedFile(null);
    setContent("");
    setRunOutput("");
    void loadEntries();
  }, [projectId, path]);

  const goUp = () => {
    if (!path) return;
    const parts = path.split("/").filter(Boolean);
    parts.pop();
    setPath(parts.join("/"));
  };

  return (
    <div className="h-svh overflow-hidden [--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex h-full min-h-0">
        <AppSidebar />
        <SidebarInset className="min-h-0 overflow-hidden">
          <SiteHeader title="Управление файлами" />
          <div className="flex h-[calc(100svh-var(--header-height))] min-h-0 flex-1 gap-4 overflow-hidden p-4 md:p-6">
            <div className="flex w-[48%] min-w-0 flex-col gap-3 overflow-hidden rounded-lg border p-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label htmlFor="file-project">Проект</Label>
                  <select
                    id="file-project"
                    className="border-input bg-background mt-1 h-9 w-full rounded-md border px-3 text-sm"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                  >
                    <option value="none">Global (none)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="file-path">Папка</Label>
                  <Input
                    id="file-path"
                    value={path}
                    onChange={(e) => setPath(e.target.value.replace(/^\/+/, ""))}
                    placeholder="tasks/xxx"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={goUp} disabled={!path}>Вверх</Button>
                <Button size="sm" variant="outline" onClick={() => void loadEntries()}>Обновить</Button>
                <span className="text-muted-foreground text-xs truncate">/{path || ""}</span>
              </div>

              {loading ? (
                <div className="text-muted-foreground flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" /> Загрузка...</div>
              ) : (
                <div className="min-h-0 flex-1 overflow-auto rounded border">
                  {entries.length === 0 ? (
                    <div className="text-muted-foreground px-3 py-4 text-sm">Папка пуста</div>
                  ) : (
                    entries.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2 border-b px-2 py-1.5 text-sm last:border-b-0">
                        <button
                          className="flex min-w-0 flex-1 items-center gap-2 text-left hover:underline"
                          onClick={() => {
                            if (entry.type === "directory") {
                              setPath(joinPath(path, entry.name));
                              return;
                            }
                            void openFile(entry.name);
                          }}
                        >
                          {entry.type === "directory" ? <Folder className="size-4 text-blue-500" /> : <FileText className="size-4" />}
                          <span className="truncate">{entry.name}</span>
                        </button>

                        {entry.type === "file" && (
                          <a
                            href={`/api/files/download?${new URLSearchParams({ project: projectId, path: joinPath(path, entry.name) }).toString()}`}
                            download={entry.name}
                            className="text-muted-foreground hover:text-foreground"
                            title="Скачать"
                          >
                            <Download className="size-4" />
                          </a>
                        )}

                        <button
                          className="text-destructive hover:opacity-80"
                          onClick={() => void deleteEntry(entry)}
                          title="Удалить"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-hidden rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-sm font-medium">
                  {fullSelectedPath ? `/${fullSelectedPath}` : "Файл не выбран"}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={saveFile} disabled={!selectedFile || binary || fileBusy}>
                    <Save className="size-4 mr-1" /> Сохранить
                  </Button>
                  <Button size="sm" variant="outline" onClick={runFile} disabled={!selectedFile || !canRun || fileBusy}>
                    <Play className="size-4 mr-1" /> Run
                  </Button>
                </div>
              </div>

              {error && <div className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>}

              {!selectedFile ? (
                <div className="text-muted-foreground text-sm">Выбери файл слева для просмотра и редактирования.</div>
              ) : binary ? (
                <div className="text-muted-foreground text-sm">Бинарный файл. Доступно только скачивание.</div>
              ) : (
                <textarea
                  className="border-input bg-background min-h-0 flex-1 resize-none rounded-md border p-3 font-mono text-xs"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              )}

              {runOutput && (
                <div className="min-h-[120px] max-h-[260px] overflow-auto rounded border bg-muted/20 p-2">
                  <div className="mb-1 flex items-center gap-2 text-xs font-medium"><FileCode className="size-3.5" /> Output</div>
                  <pre className="text-xs whitespace-pre-wrap">{runOutput}</pre>
                </div>
              )}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
