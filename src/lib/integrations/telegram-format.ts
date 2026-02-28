const TELEGRAM_TEXT_LIMIT = 4096;
const TELEGRAM_CHUNK_LIMIT = 3500;

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeTelegramText(input: string): string {
  return (input || "")
    .trim()
    .replace(/\r\n?/g, "\n")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitByLimit(source: string, maxLen: number): string[] {
  const text = source.trim();
  if (!text) return [];
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  let rest = text;

  while (rest.length > maxLen) {
    let cut = rest.lastIndexOf("\n\n", maxLen);
    if (cut < Math.floor(maxLen * 0.45)) cut = rest.lastIndexOf("\n", maxLen);
    if (cut < Math.floor(maxLen * 0.45)) cut = rest.lastIndexOf(". ", maxLen);
    if (cut < Math.floor(maxLen * 0.45)) cut = rest.lastIndexOf(" ", maxLen);
    if (cut <= 0) cut = maxLen;

    const part = rest.slice(0, cut).trim();
    if (part) chunks.push(part);
    rest = rest.slice(cut).trim();
  }

  if (rest) chunks.push(rest);
  return chunks;
}

export function splitTelegramText(input: string, chunkLimit = TELEGRAM_CHUNK_LIMIT): string[] {
  const normalized = normalizeTelegramText(input);
  if (!normalized) return ["Пустой ответ от агента."];
  return splitByLimit(normalized, Math.min(chunkLimit, TELEGRAM_TEXT_LIMIT));
}

export function toTelegramPlainText(input: string): string {
  const normalized = normalizeTelegramText(input);
  if (!normalized) return "Пустой ответ от агента.";
  if (normalized.length > TELEGRAM_TEXT_LIMIT) {
    return `${normalized.slice(0, TELEGRAM_TEXT_LIMIT - 1)}…`;
  }
  return normalized;
}

export function toTelegramHtml(input: string): string {
  let source = normalizeTelegramText(input);
  if (!source) return "Пустой ответ от агента.";

  const codeBlocks: string[] = [];
  source = source.replace(/```([\s\S]*?)```/g, (_m, code) => {
    const idx = codeBlocks.push(`<pre><code>${escapeHtml(String(code).trim())}</code></pre>`) - 1;
    return `@@CODEBLOCK_${idx}@@`;
  });

  let text = escapeHtml(source);

  text = text.replace(/^#{1,6}\s+(.+)$/gm, "<b>$1</b>");
  text = text.replace(/^&gt;\s?(.*)$/gm, "<blockquote>$1</blockquote>");
  text = text.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  text = text.replace(/__(.+?)__/g, "<b>$1</b>");
  text = text.replace(/(^|\W)\*(?!\s)([^*\n]+?)\*(?!\w)/g, "$1<i>$2</i>");
  text = text.replace(/(^|\W)_(?!\s)([^_\n]+?)_(?!\w)/g, "$1<i>$2</i>");
  text = text.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  text = text.replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
  text = text.replace(/^\s*[-*]\s+(.+)$/gm, "• $1");
  text = text.replace(/^\s*\d+\.\s+(.+)$/gm, "• $1");

  text = text.replace(/@@CODEBLOCK_(\d+)@@/g, (_m, n) => codeBlocks[Number(n)] || "");
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  if (text.length > TELEGRAM_TEXT_LIMIT) {
    text = `${text.slice(0, TELEGRAM_TEXT_LIMIT - 1)}…`;
  }
  return text;
}
