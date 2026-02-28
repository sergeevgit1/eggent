"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Brain,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  FileText,
  MoreHorizontal,
} from "lucide-react";
import { CodeBlock } from "./code-block";
import { MermaidBlock } from "./mermaid-block";
import { ToolOutput } from "./tool-output";
import { useI18n } from "@/components/i18n-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { copyTextToClipboard } from "@/lib/utils";
import type { UIMessage } from "ai";

interface MessageBubbleProps {
  message: UIMessage;
}

type UiPartLike = {
  type?: string;
  text?: string;
  url?: string;
  mediaType?: string;
  filename?: string;
  name?: string;
};

const BOX_DRAWING_RE = /[\u2500-\u257F\u2580-\u259F\u25A0-\u25FF]/;

function sanitizeAssistantText(input: string): string {
  if (!input) return "";
  let text = input;

  // Remove leaked tool-call XML-ish wrappers that can appear in model text output.
  text = text.replace(/<tool_call>response<arg_key>message<\/arg_key><arg_value>/gi, "");
  text = text.replace(/<arg_key>[\s\S]*?<\/arg_key>/gi, "");
  text = text.replace(/<\/arg_value>\s*<\/tool_call>/gi, "");
  text = text.replace(/<\/?(tool_call|arg_key|arg_value|response)\b[^>]*>/gi, "");
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return text;
}

function looksLikeUnicodeDiagram(text: string): boolean {
  if (!text) return false;
  const lines = text.split("\n");
  const diagramLines = lines.filter((line) => BOX_DRAWING_RE.test(line));
  return diagramLines.length >= 2;
}

function compactReasoning(input: string, mode: "off" | "compact" | "verbose"): string {
  if (mode === "off") return "";
  const normalized = (input || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (mode === "verbose") return normalized;
  if (normalized.length <= 260) return normalized;
  return `${normalized.slice(0, 257)}…`;
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { t, reasoningMode } = useI18n();
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const parts = (message.parts ?? []) as UiPartLike[];

  const rawTextContent = parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text)
    .join("");

  const reasoningRaw = parts
    .filter((p): p is { type: "reasoning"; text: string } => p.type === "reasoning" && typeof p.text === "string")
    .map((p) => p.text)
    .join("\n")
    .trim();

  const reasoningPreview = useMemo(
    () => compactReasoning(reasoningRaw, reasoningMode),
    [reasoningRaw, reasoningMode]
  );

  const textContent = useMemo(
    () => (isUser ? rawTextContent : sanitizeAssistantText(rawTextContent)),
    [isUser, rawTextContent]
  );

  const hasUnicodeDiagram = useMemo(
    () => !isUser && looksLikeUnicodeDiagram(textContent),
    [isUser, textContent]
  );

  const shouldCollapse = !isUser && textContent.length > 3500;

  const toolParts = parts.filter((p) => (p.type || "").startsWith("tool-") || p.type === "dynamic-tool");

  const artifactParts = parts.filter((p) => {
    const type = p.type || "";
    if (type === "file" || type === "image") return true;
    if (type.startsWith("data-") && typeof p.url === "string") return true;
    if (typeof p.url === "string" && /^(https?:|data:|blob:|\/)/.test(p.url)) return true;
    return false;
  });

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copyMessage = async () => {
    const ok = await copyTextToClipboard(textContent || "");
    if (ok) setCopied(true);
  };

  const downloadMessage = () => {
    const blob = new Blob([textContent || ""], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "message.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full min-w-0 space-y-2">
      {toolParts.length > 0 && (
        <div className="w-full max-w-full space-y-2">
          {toolParts.map((part, idx) => {
            if (part.type === "dynamic-tool") {
              const dp = part as {
                type: "dynamic-tool";
                toolName: string;
                toolCallId: string;
                state: string;
                input?: unknown;
                output?: unknown;
              };
              return (
                <ToolOutput
                  key={`tool-${dp.toolCallId}-${idx}`}
                  toolName={dp.toolName}
                  args={typeof dp.input === "object" && dp.input !== null ? (dp.input as Record<string, unknown>) : {}}
                  result={
                    dp.state === "output-available"
                      ? typeof dp.output === "string"
                        ? dp.output
                        : JSON.stringify(dp.output)
                      : dp.state === "output-error"
                        ? t("chat.tool.errorOccurred", "Error occurred")
                        : t("chat.tool.running", "Running...")
                  }
                />
              );
            }

            if ((part.type || "").startsWith("tool-")) {
              const tp = part as {
                type: string;
                toolCallId?: string;
                state?: string;
                input?: unknown;
                output?: unknown;
              };
              const toolName = tp.type.replace("tool-", "");
              return (
                <ToolOutput
                  key={`tool-${tp.toolCallId || idx}-${idx}`}
                  toolName={toolName}
                  args={typeof tp.input === "object" && tp.input !== null ? (tp.input as Record<string, unknown>) : {}}
                  result={
                    tp.state === "output-available"
                      ? typeof tp.output === "string"
                        ? tp.output
                        : JSON.stringify(tp.output)
                      : tp.state === "output-error"
                        ? t("chat.tool.errorOccurred", "Error occurred")
                        : t("chat.tool.running", "Running...")
                  }
                />
              );
            }

            return null;
          })}
        </div>
      )}

      {artifactParts.length > 0 && (
        <div className="w-full max-w-full space-y-2">
          {artifactParts.map((part, idx) => {
            const href = part.url || "";
            const fileName = part.filename || part.name || href.split("/").pop() || `artifact-${idx + 1}`;
            const mediaType = part.mediaType || "file";
            const isImage = mediaType.startsWith("image/") || part.type === "image";

            return (
              <div key={`artifact-${idx}`} className="rounded-lg border bg-card p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <FileText className="size-4" />
                  <span className="truncate">{fileName}</span>
                  <span className="text-muted-foreground ml-auto text-xs">{mediaType}</span>
                </div>

                {isImage && href ? <img src={href} alt={fileName} className="max-h-72 w-auto rounded border" /> : null}

                {href ? (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded border px-2 py-1 hover:bg-muted">
                      <ExternalLink className="size-3.5" /> {t("chat.artifact.open", "Открыть")}
                    </a>
                    <a href={href} download={fileName} className="inline-flex items-center gap-1 rounded border px-2 py-1 hover:bg-muted">
                      <Download className="size-3.5" /> {t("chat.artifact.download", "Скачать")}
                    </a>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {(textContent || reasoningPreview) && (
        <div className={`group flex min-w-0 items-start py-2 ${isUser ? "justify-end" : "justify-start"}`}>
          <div className={`min-w-0 ${isUser ? "max-w-[85%]" : "w-full max-w-full"}`}>
            {!isUser && reasoningPreview ? (
              <div className="mb-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                <div className="mb-1 inline-flex items-center gap-1 font-medium text-primary/80">
                  <Brain className="size-3.5 animate-pulse" />
                  Ход мысли
                </div>
                <p className="leading-5">{reasoningPreview}</p>
              </div>
            ) : null}
            {isUser ? (
              <div className="bg-primary text-primary-foreground rounded-2xl px-3 py-2 text-sm leading-7">
                <p className="whitespace-pre-wrap break-words">{textContent}</p>
              </div>
            ) : hasUnicodeDiagram ? (
              <pre
                className={`max-w-full overflow-x-auto rounded-lg border bg-muted/30 p-3 font-mono text-[12.5px] leading-5 whitespace-pre ${
                  shouldCollapse && !expanded ? "max-h-[420px]" : ""
                }`}
              >
                {textContent}
              </pre>
            ) : (
              <div className="rounded-xl border bg-card/70 px-3 py-2 shadow-sm">
                <div
                  className={`prose prose-sm dark:prose-invert max-w-none overflow-x-hidden text-inherit [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 ${
                    shouldCollapse && !expanded ? "max-h-[420px] overflow-y-hidden relative" : ""
                  }`}
                >
                  <MarkdownContent content={textContent} />
                </div>
                {shouldCollapse && !expanded ? (
                  <div className="pointer-events-none -mt-16 h-16 bg-gradient-to-t from-card/95 to-transparent" />
                ) : null}
              </div>
            )}

            <div className={`mt-1 flex items-center gap-1 ${isUser ? "justify-end" : "justify-start"}`}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-70 transition-opacity hover:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    aria-label={t("chat.actions", "Действия")}
                  >
                    {copied ? <Check className="size-3.5" /> : <MoreHorizontal className="size-3.5" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isUser ? "end" : "start"}>
                  <DropdownMenuItem onClick={copyMessage}>
                    <Copy className="size-3.5 mr-2" />
                    {copied ? t("chat.copied", "Скопировано") : t("chat.copy", "Копировать")}
                  </DropdownMenuItem>
                  {!isUser && shouldCollapse && (
                    <DropdownMenuItem onClick={() => setExpanded((v) => !v)}>
                      {expanded ? <ChevronUp className="size-3.5 mr-2" /> : <ChevronDown className="size-3.5 mr-2" />}
                      {expanded ? t("chat.collapse", "Свернуть") : t("chat.expand", "Развернуть")}
                    </DropdownMenuItem>
                  )}
                  {!isUser && (
                    <DropdownMenuItem onClick={downloadMessage}>
                      <Download className="size-3.5 mr-2" />
                      {t("chat.download", "Скачать .txt")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

function collectText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return collectText((node as { props?: { children?: ReactNode } }).props?.children);
  }
  return "";
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const isInline = !match;
          if (isInline) {
            return (
              <code className="bg-muted rounded px-1.5 py-0.5 text-sm" {...props}>
                {children}
              </code>
            );
          }

          const language = (match?.[1] || "").toLowerCase();
          const code = String(children).replace(/\n$/, "");

          if (language === "mermaid") {
            return <MermaidBlock code={code} />;
          }

          return <CodeBlock code={code} language={language} />;
        },
        table({ children }) {
          return (
            <div className="my-3 max-w-full overflow-x-auto rounded-lg border border-border/70 bg-card/40">
              <table className="min-w-full border-collapse text-sm">{children}</table>
            </div>
          );
        },
        thead({ children }) {
          return <thead className="sticky top-0 z-[1] bg-muted/80 backdrop-blur supports-[backdrop-filter]:bg-muted/60">{children}</thead>;
        },
        tr({ children }) {
          return <tr className="border-b border-border/70 last:border-b-0 even:bg-muted/20">{children}</tr>;
        },
        th({ children }) {
          return <th className="border-r border-border/70 px-3 py-2 text-left text-[12px] font-semibold uppercase tracking-wide text-muted-foreground last:border-r-0">{children}</th>;
        },
        td({ children }) {
          return <td className="border-r border-border/70 px-3 py-2 align-top last:border-r-0">{children}</td>;
        },
        h1({ children }) {
          const text = collectText(children);
          const id = slugifyHeading(text);
          return <h1 id={id} className="mt-4 mb-2 scroll-mt-24 text-xl font-semibold tracking-tight">{children}</h1>;
        },
        h2({ children }) {
          const text = collectText(children);
          const id = slugifyHeading(text);
          return <h2 id={id} className="mt-4 mb-2 scroll-mt-24 text-lg font-semibold tracking-tight">{children}</h2>;
        },
        h3({ children }) {
          const text = collectText(children);
          const id = slugifyHeading(text);
          return <h3 id={id} className="mt-3 mb-1.5 scroll-mt-24 text-base font-semibold">{children}</h3>;
        },
        p({ children }) {
          return <p className="my-2 leading-7 text-[0.95rem]">{children}</p>;
        },
        blockquote({ children }) {
          return <blockquote className="my-3 border-l-2 border-primary/30 pl-3 italic text-muted-foreground">{children}</blockquote>;
        },
        hr() {
          return <hr className="my-4 border-border" />;
        },
        img({ src, alt }) {
          if (!src) return null;
          return (
            <span className="my-3 block overflow-hidden rounded-lg border bg-card">
              <img src={src} alt={alt || "image"} className="max-h-[520px] w-auto max-w-full" loading="lazy" />
            </span>
          );
        },
        a({ href, children }) {
          return (
            <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2 hover:opacity-80">
              {children}
            </a>
          );
        },
        ul({ children, ...props }) {
          return (
            <ul className="my-2 list-disc space-y-1 pl-6" {...props}>
              {children}
            </ul>
          );
        },
        ol({ children, ...props }) {
          return (
            <ol className="my-2 list-decimal space-y-1 pl-6" {...props}>
              {children}
            </ol>
          );
        },
        li({ children, ...props }) {
          return (
            <li className="marker:text-muted-foreground" {...props}>
              {children}
            </li>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
