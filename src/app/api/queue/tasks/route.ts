import { NextRequest } from "next/server";
import { getTaskRecord, listTaskRecords } from "@/lib/queue/store";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (id) {
    const task = await getTaskRecord(id);
    if (!task) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }
    return Response.json(task);
  }

  const limitRaw = Number(req.nextUrl.searchParams.get("limit") || 100);
  const limit = Number.isFinite(limitRaw) ? limitRaw : 100;
  const tasks = await listTaskRecords(limit);
  return Response.json({ tasks });
}
