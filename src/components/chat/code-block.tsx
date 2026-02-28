"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import { copyTextToClipboard } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const copiedOk = await copyTextToClipboard(code);
    if (!copiedOk) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg border bg-[#0b1020] text-slate-100 overflow-hidden my-2 shadow-sm">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 bg-white/5">
        <span className="text-xs text-slate-300 font-mono uppercase tracking-wide">
          {language || t("chat.code", "code")}
        </span>
        <Button
          variant="ghost"
          size="xs"
          onClick={handleCopy}
          className="h-6 gap-1 text-xs text-slate-200 hover:text-white hover:bg-white/10"
        >
          {copied ? (
            <>
              <Check className="size-3" />
              {t("chat.copied", "Copied")}
            </>
          ) : (
            <>
              <Copy className="size-3" />
              {t("chat.copy", "Copy")}
            </>
          )}
        </Button>
      </div>
      <pre className="p-3 overflow-x-auto text-[13px] leading-6">
        <code className={language ? `language-${language}` : ""}>
          {code}
        </code>
      </pre>
    </div>
  );
}
