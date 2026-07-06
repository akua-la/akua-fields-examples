// ---------------------------------------------------------------------------
// Definición dinámica de ejemplos.
//
// Hay dos fuentes que se combinan en runtime:
//
//   1. EXAMPLES (este archivo) — metadata curada: título, descripción, tags,
//      orden. Agregá una entrada acá cuando quieras controlar cómo se muestra
//      un ejemplo.
//
//   2. Auto-discovery — la página consulta la API de GitHub
//      (contents de `examples/` en el repo) y cualquier .html que NO esté en
//      EXAMPLES se agrega solo, con metadata derivada del nombre de archivo.
//
// Resultado: subir un nuevo ejemplo al repo lo hace aparecer acá sin tocar
// esta app. Si además querés copy lindo, sumás la entrada curada.
// ---------------------------------------------------------------------------

export const SITE = {
  /** Repo que contiene los ejemplos (carpeta examples/). */
  repo: "akua-la/akua-fields-examples",
  branch: "main",
  /** Deploy live de los ejemplos — de acá salen los iframes de preview. */
  demoBase: "https://akua-fields-examples-akua-la.vercel.app",
  /** Servicio de Akua Fields (SDK + iframe de campos). */
  sfBase: "https://akua-fields-akua-la.vercel.app",
  docsLabel: "Portal de docs · Campos embebidos",
  testCard: { pan: "4111 1111 1111 1111", exp: "12/30", cvv: "123" },
};

export interface ExampleDef {
  /** Nombre de archivo sin .html dentro de examples/ del repo. */
  slug: string;
  title: string;
  emoji: string;
  description: string;
  tags: string[];
  /** true si vino del auto-discovery y no tiene metadata curada. */
  discovered?: boolean;
  /** Código fuente cacheado en build time (null → se baja on-demand). */
  source?: string | null;
}

export const EXAMPLES: ExampleDef[] = [
  {
    slug: "store",
    title: "Tienda con marca",
    emoji: "🛍️",
    description:
      "Checkout completo y brandeable. Solo la tarjeta vive en el iframe de Akua — el resto es 100% tuyo.",
    tags: ["checkout completo", "branding propio"],
  },
  {
    slug: "minimal",
    title: "Checkout mínimo",
    emoji: "⚡",
    description:
      "Lo más chico que cobra: montar los campos, un botón, sf.pay(). ~30 líneas.",
    tags: ["~30 líneas", "punto de partida"],
  },
];

// --- helpers ---------------------------------------------------------------

export function exampleDemoUrl(slug: string, query = ""): string {
  return `${SITE.demoBase}/examples/${slug}.html${query}`;
}

export function exampleSourceUrl(slug: string): string {
  return `https://github.com/${SITE.repo}/blob/${SITE.branch}/examples/${slug}.html`;
}

export function exampleRawUrl(slug: string): string {
  return `https://raw.githubusercontent.com/${SITE.repo}/${SITE.branch}/examples/${slug}.html`;
}

function slugToTitle(slug: string): string {
  const words = slug.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Descubre ejemplos nuevos en el repo (archivos .html en examples/ que no
 * están en EXAMPLES) y los devuelve al final de la lista curada.
 * Si la API de GitHub falla (rate limit, offline) devuelve solo los curados.
 *
 * Corre en dos momentos:
 *  - build time (server component) → la lista queda cacheada en el HTML
 *  - runtime (cliente) → detecta ejemplos subidos después del último deploy
 */
export async function loadExamples(): Promise<ExampleDef[]> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${SITE.repo}/contents/examples?ref=${SITE.branch}`,
      {
        headers: { Accept: "application/vnd.github+json" },
        // Data Cache de Next: en `next build` el fetch se hace UNA vez y el
        // resultado queda estático en el export.
        cache: "force-cache",
      },
    );
    if (!res.ok) return EXAMPLES;
    const files: { name: string; type: string }[] = await res.json();
    const known = new Set(EXAMPLES.map((e) => e.slug));
    const discovered: ExampleDef[] = files
      .filter((f) => f.type === "file" && f.name.endsWith(".html"))
      .map((f) => f.name.replace(/\.html$/, ""))
      .filter((slug) => !known.has(slug))
      .map((slug) => ({
        slug,
        title: slugToTitle(slug),
        emoji: "🧩",
        description: "Ejemplo nuevo del repo.",
        tags: ["nuevo"],
        discovered: true,
      }));
    return [...EXAMPLES, ...discovered];
  } catch {
    return EXAMPLES;
  }
}

/** Baja el código fuente de un ejemplo (cacheado en build si corre en build). */
export async function fetchExampleSource(slug: string): Promise<string | null> {
  try {
    const res = await fetch(exampleRawUrl(slug), { cache: "force-cache" });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

/**
 * Versión de build time: lista completa + código fuente de cada ejemplo,
 * todo embebido estáticamente en la página exportada. El cliente solo vuelve
 * a la red para ejemplos publicados después del último build.
 */
export async function loadExamplesWithSources(): Promise<ExampleDef[]> {
  const examples = await loadExamples();
  return Promise.all(
    examples.map(async (ex) => ({
      ...ex,
      source: await fetchExampleSource(ex.slug),
    })),
  );
}
