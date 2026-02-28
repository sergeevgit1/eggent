import { NextRequest } from "next/server";
import { getAllChats, getChat, deleteChat, updateChat } from "@/lib/storage/chat-store";

export async function GET(req: NextRequest) {
  const chatId = req.nextUrl.searchParams.get("id");

  if (chatId) {
    const chat = await getChat(chatId);
    if (!chat) {
      return Response.json({ error: "Chat not found" }, { status: 404 });
    }
    return Response.json(chat);
  }

  const projectId = req.nextUrl.searchParams.get("projectId");
  let chats = await getAllChats();

  // Filter by project: "none" means global chats (no project),
  // a project ID filters to that project's chats
  if (projectId === "none") {
    chats = chats.filter((c) => !c.projectId);
  } else if (projectId) {
    chats = chats.filter((c) => c.projectId === projectId);
  }

  return Response.json(chats);
}

export async function PATCH(req: NextRequest) {
  const chatId = req.nextUrl.searchParams.get("id");
  if (!chatId) {
    return Response.json({ error: "Chat ID required" }, { status: 400 });
  }

  let payload: { title?: string; isPinned?: boolean; isArchived?: boolean };
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = typeof payload.title === "string" ? payload.title.trim() : undefined;
  const isPinned = typeof payload.isPinned === "boolean" ? payload.isPinned : undefined;
  const isArchived = typeof payload.isArchived === "boolean" ? payload.isArchived : undefined;

  if (title !== undefined && title.length === 0) {
    return Response.json({ error: "Title cannot be empty" }, { status: 400 });
  }

  if (title === undefined && isPinned === undefined && isArchived === undefined) {
    return Response.json({ error: "No updates provided" }, { status: 400 });
  }

  const updated = await updateChat(chatId, {
    title,
    isPinned,
    isArchived,
  });
  if (!updated) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  return Response.json(updated);
}

export async function DELETE(req: NextRequest) {
  const chatId = req.nextUrl.searchParams.get("id");
  if (!chatId) {
    return Response.json({ error: "Chat ID required" }, { status: 400 });
  }

  const deleted = await deleteChat(chatId);
  if (!deleted) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}
