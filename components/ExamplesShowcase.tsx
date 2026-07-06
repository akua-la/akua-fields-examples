"use client";

import { useEffect, useState } from "react";
import { loadExamples, type ExampleDef } from "@/lib/examples";
import ExampleSection from "./ExampleSection";

export default function ExamplesShowcase({
  initialExamples,
}: {
  initialExamples: ExampleDef[];
}) {
  // La lista (y el código de cada ejemplo) viene cacheada del build.
  // En el cliente solo se buscan ejemplos publicados DESPUÉS del último
  // deploy: se re-consulta la API de GitHub y se agregan los que falten.
  const [examples, setExamples] = useState<ExampleDef[]>(initialExamples);
  // token/userId de la URL de ESTA página se reenvían a todos los demos.
  const [query, setQuery] = useState("");

  useEffect(() => {
    loadExamples().then((latest) => {
      setExamples((current) => {
        const known = new Set(current.map((e) => e.slug));
        const fresh = latest.filter((e) => !known.has(e.slug));
        return fresh.length ? [...current, ...fresh] : current;
      });
    });

    const params = new URLSearchParams(window.location.search);
    const passthrough = new URLSearchParams();
    for (const key of ["token", "userId"]) {
      const v = params.get(key);
      if (v) passthrough.set(key, v);
    }
    const qs = passthrough.toString();
    if (qs) setQuery(`?${qs}`);
  }, []);

  return (
    <>
      <nav className="chip-row" aria-label="Ejemplos">
        {examples.map((ex, i) => (
          <a className="chip" href={`#${ex.slug}`} key={ex.slug}>
            <span className="n">{String(i + 1).padStart(2, "0")}</span>
            {ex.emoji} {ex.title}
          </a>
        ))}
      </nav>

      <div className="examples-wrap">
        {examples.map((ex, i) => (
          <ExampleSection key={ex.slug} example={ex} index={i} query={query} />
        ))}
      </div>
    </>
  );
}
