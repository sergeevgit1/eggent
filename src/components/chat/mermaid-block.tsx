"use client";

import { useEffect, useId, useMemo, useState } from "react";
import mermaid from "mermaid";

interface MermaidBlockProps {
  code: string;
}

let initialized = false;

function initMermaid() {
  if (initialized) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "default",
    suppressErrorRendering: false,
  });
  initialized = true;
}

export function MermaidBlock({ code }: MermaidBlockProps) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");
  const rawId = useId();
  const diagramId = useMemo(() => `mermaid-${rawId.replace(/[:]/g, "")}-${Math.random().toString(36).slice(2, 8)}`,[rawId]);

  useEffect(() => {
    let mounted = true;

    const render = async () => {
      try {
        initMermaid();
        setError("");
        const { svg: renderedSvg } = await mermaid.render(diagramId, code);
        if (!mounted) return;
        setSvg(renderedSvg);
      } catch (e) {
        if (!mounted) return;
        const msg = e instanceof Error ? e.message : "Failed to render mermaid diagram";
        setError(msg);
        setSvg("");
      }
    };

    void render();
    return () => {
      mounted = false;
    };
  }, [code, diagramId]);

  if (error) {
    return (
      <div className="my-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
        Mermaid render error: {error}
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-3 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
        Rendering diagram...
      </div>
    );
  }

  return (
    <div className="my-3 rounded-lg border bg-card p-3 overflow-x-auto">
      <div className="min-w-[320px] [&>svg]:h-auto [&>svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}
