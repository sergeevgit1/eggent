import { NextRequest } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getWorkDir } from "@/lib/storage/project-store";
import { publishUiSyncEvent } from "@/lib/realtime/event-bus";

const MAX_TEXT_BYTES = 512 * 1024;

function resolveSafePath(projectId: string, relPath: string): { fullPath: string; workDir: string } {
  const workDir = getWorkDir(projectId);
  const fullPath = path.resolve(path.join(workDir, relPath));
  const resolvedWorkDir = path.resolve(workDir);

  if (!(fullPath === resolvedWorkDir || fullPath.startsWith(resolvedWorkDir + path.sep))) {
    throw new Error("Invalid file path");
  }

  return { fullPath, workDir: resolvedWorkDir };
}

function isBinaryBuffer(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8000));
  for (const byte of sample) {
    if (byte === 0) return true;
  }
  return false;
}

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("project");
  const relPath = req.nextUrl.searchParams.get("path");

  if (!projectId || !relPath) {
    return Response.json({ error: "Project ID and file path required" }, { status: 400 });
  }

  try {
    const { fullPath } = resolveSafePath(projectId, relPath);
    const stat = await fs.stat(fullPath);
    if (!stat.isFile()) {
      return Response.json({ error: "Path is not a file" }, { status: 400 });
    }

    const buffer = await fs.readFile(fullPath);
    const binary = isBinaryBuffer(buffer);

    if (binary) {
      return Response.json({ binary: true, content: "", bytes: stat.size });
    }

    const limited = buffer.subarray(0, MAX_TEXT_BYTES);
    return Response.json({
      binary: false,
      content: limited.toString("utf-8"),
      bytes: stat.size,
      truncated: buffer.length > MAX_TEXT_BYTES,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read file";
    const status = message === "Invalid file path" ? 403 : 404;
    return Response.json({ error: message }, { status });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const projectId = typeof body.project === "string" ? body.project : "";
    const relPath = typeof body.path === "string" ? body.path : "";
    const content = typeof body.content === "string" ? body.content : "";

    if (!projectId || !relPath) {
      return Response.json({ error: "Project ID and file path required" }, { status: 400 });
    }

    const { fullPath } = resolveSafePath(projectId, relPath);
    const stat = await fs.stat(fullPath);
    if (!stat.isFile()) {
      return Response.json({ error: "Path is not a file" }, { status: 400 });
    }

    await fs.writeFile(fullPath, content, "utf-8");
    publishUiSyncEvent({
      topic: "files",
      projectId: projectId === "none" ? null : projectId,
      reason: "file_updated",
    });

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save file";
    const status = message === "Invalid file path" ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}
