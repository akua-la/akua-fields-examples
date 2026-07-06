"use client";

import { useEffect, useState } from "react";
import {
  type ExampleDef,
  exampleDemoUrl,
  exampleSourceUrl,
  fetchExampleSource,
} from "@/lib/examples";

type Tab = "preview" | "code";

export default function ExampleSection({
  example,
  index,
  query,
}: {
  example: ExampleDef;
  index: number;
  query: string;
}) {
  const [tab, setTab] = useState<Tab>("preview");
  // El código normalmente viene cacheado del build; solo los ejemplos
  // descubiertos después del último deploy lo bajan on-demand.
  const [source, setSource] = useState<string | null>(example.source ?? null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (tab !== "code" || source !== null) return;
    let cancelled = false;
    fetchExampleSource(example.slug).then((text) => {
      if (cancelled) return;
      setSource(
        text ??
          `// No se pudo cargar el código.\n// Miralo directo en GitHub:\n// ${exampleSourceUrl(example.slug)}\n`,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [tab, source, example.slug]);

  function copy() {
    if (!source) return;
    navigator.clipboard.writeText(source).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  const demoUrl = exampleDemoUrl(example.slug, query);

  return (
    <section className="example-card" id={example.slug}>
      <div className="example-head">
        <span className="example-num">Ejemplo {index + 1}</span>
        <h2>
          {example.emoji} {example.title}
        </h2>
        <p>{example.description}</p>
        {example.tags.length > 0 && (
          <div className="tag-row">
            {example.tags.map((t) => (
              <span className="tag" key={t}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="tab-bar">
        <button
          className={`tab ${tab === "preview" ? "active" : ""}`}
          onClick={() => setTab("preview")}
        >
          Vista previa
        </button>
        <button
          className={`tab ${tab === "code" ? "active" : ""}`}
          onClick={() => setTab("code")}
        >
          Código
        </button>
        <span className="tab-spacer" />
        <a
          className="mini-link"
          href={demoUrl}
          target="_blank"
          rel="noreferrer"
        >
          Abrir en pestaña nueva ↗
        </a>
        <a
          className="mini-link"
          href={exampleSourceUrl(example.slug)}
          target="_blank"
          rel="noreferrer"
        >
          Ver en GitHub ↗
        </a>
      </div>

      {tab === "preview" ? (
        <>
          <iframe
            className="preview-frame"
            src={demoUrl}
            title={`${example.title} — demo live`}
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
          <div className="preview-note">
            💳 Demo live en sandbox. Token: abrí con{" "}
            <code>?token=&lt;jwt&gt;</code>.
          </div>
        </>
      ) : (
        <div className="code-view">
          <button className="copy-btn" onClick={copy} disabled={!source}>
            {copied ? "✓ Copiado" : "Copiar"}
          </button>
          {source === null ? (
            <div className="code-loading">// cargando código fuente…</div>
          ) : (
            <pre>
              <code>{source}</code>
            </pre>
          )}
        </div>
      )}
    </section>
  );
}
