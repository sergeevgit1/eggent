import { NextRequest } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getWorkDir } from "@/lib/storage/project-store";
import { getSettings } from "@/lib/storage/settings-store";
import { executeCode } from "@/lib/tools/code-execution";

function resolveSafePath(projectId: string, relPath: string): { fullPath: string; workDir: string } {
  const workDir = getWorkDir(projectId);
  const fullPath = path.resolve(path.join(workDir, relPath));
  const resolvedWorkDir = path.resolve(workDir);

  if (!(fullPath === resolvedWorkDir || fullPath.startsWith(resolvedWorkDir + path.sep))) {
    throw new Error("Invalid file path");
  }

  return { fullPath, workDir: resolvedWorkDir };
}

function detectRuntime(filePath: string): "python" | "nodejs" | "terminal" | null {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".py") return "python";
  if (ext === ".js" || ext === ".mjs" || ext === ".cjs") return "nodejs";
  if (ext === ".sh") return "terminal";
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const projectId = typeof body.project === "string" ? body.project : "";
    const relPath = typeof body.path === "string" ? body.path : "";

    if (!projectId || !relPath) {
      return Response.json({ error: "Project ID and file path required" }, { status: 400 });
    }

    const { fullPath, workDir } = resolveSafePath(projectId, relPath);
    const stat = await fs.stat(fullPath);
    if (!stat.isFile()) {
      return Response.json({ error: "Path is not a file" }, { status: 400 });
    }

    const runtime = detectRuntime(fullPath);
    if (!runtime) {
      return Response.json({ error: "Этот тип файла пока нельзя запускать из UI (.py, .js, .sh)." }, { status: 400 });
    }

    const settings = await getSettings();
    const relativeForExec = path.relative(workDir, fullPath).replace(/\\/g, "/");

    const command =
      runtime === "python"
        ? `python3 ${JSON.stringify(relativeForExec)}`
        : runtime === "nodejs"
        ? `node ${JSON.stringify(relativeForExec)}`
        : `bash ${JSON.stringify(relativeForExec)}`;

    const output = await executeCode("terminal", command, 0, settings.codeExecution, workDir);

    return Response.json({ success: true, runtime, output });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run file";
    const status = message === "Invalid file path" ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}
