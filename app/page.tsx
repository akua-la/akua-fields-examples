import Image from "next/image";
import ExamplesShowcase from "@/components/ExamplesShowcase";
import { SITE, loadExamplesWithSources } from "@/lib/examples";

const REPO_URL = `https://github.com/${SITE.repo}`;

export default async function Home() {
  // Corre en `next build`: lista de ejemplos + código fuente quedan
  // cacheados estáticamente en el export (Data Cache de Next).
  const examples = await loadExamplesWithSources();

  return (
    <>
      <header className="nav">
        <a className="wordmark" href="https://akua.la" target="_blank" rel="noreferrer">
          <Image src="/akua_logo.svg" alt="Akua" width={131} height={30} priority />
        </a>
        <div className="nav-links">
          <a href="#ejemplos">Ejemplos</a>
          <a href="https://docs.akua.la" target="_blank" rel="noreferrer">
            Docs
          </a>
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="eyebrow">Akua Fields</div>
          <h1>Ejemplos de integración</h1>
          <p className="lede">
            Campos de tarjeta embebidos en tu propio checkout. Tu página nunca
            ve el PAN — tu comercio queda en <strong>SAQ A</strong>. Miralos en
            acción y copiá el código.
          </p>
          <div className="btn-row">
            <a className="btn primary" href="#ejemplos">
              Ver ejemplos
            </a>
            <a className="btn ghost" href={REPO_URL} target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
        </section>

        <div className="sandbox-strip" id="ejemplos">
          <div className="inner">
            <span>
              🧪 Sandbox · <code>{SITE.testCard.pan}</code> · venc{" "}
              <code>{SITE.testCard.exp}</code> · CVV <code>{SITE.testCard.cvv}</code>
            </span>
            <span>No se cobra dinero real</span>
          </div>
        </div>

        <ExamplesShowcase initialExamples={examples} />

        <section className="flow" id="como-funciona">
          <div className="inner">
            <h3>Cómo funciona</h3>
            El SDK monta <code>#akua-card</code> (iframe seguro de Akua) en tu
            layout y tu botón llama <code>sf.pay()</code>. El JWT lo mintea tu
            backend — pasalo con <code>?token=&lt;jwt&gt;</code> y se reenvía a
            todos los ejemplos.
          </div>
        </section>
      </main>

      <footer className="foot">
        <span>
          Ejemplos cargados desde{" "}
          <a href={`${REPO_URL}/tree/${SITE.branch}/examples`} target="_blank" rel="noreferrer">
            {SITE.repo}/examples
          </a>{" "}
          — subí un .html y aparece solo.
        </span>
        <span>
          <a href="https://docs.akua.la" target="_blank" rel="noreferrer">
            Docs
          </a>{" "}
          ·{" "}
          <a href={SITE.demoBase} target="_blank" rel="noreferrer">
            Demo live
          </a>
        </span>
      </footer>
    </>
  );
}
