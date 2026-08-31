import { useEffect, useRef, useState } from "react";
import type { ApaOptions, Block } from "../lib/apa";
import { pageMetrics, type Page } from "../lib/paginate";

interface PreviewProps {
  pages: Page[];
  opts: ApaOptions;
  hasContent: boolean;
  analyzing: boolean;
}

function BlockView({ block, indentPx }: { block: Block; indentPx: number }) {
  const runs = block.runs.map((r, i) => (
    <span key={i} style={{ fontStyle: r.i ? "italic" : undefined, fontWeight: r.b ? 700 : undefined }}>
      {r.t}
    </span>
  ));

  switch (block.type) {
    case "title":
      return <p style={{ textAlign: "center", fontWeight: 700, textIndent: 0 }}>{runs}</p>;
    case "h1":
      return <p style={{ textAlign: "center", fontWeight: 700, textIndent: 0 }}>{runs}</p>;
    case "h2":
      return <p style={{ fontWeight: 700, textIndent: 0 }}>{runs}</p>;
    case "h3":
      return <p style={{ fontWeight: 700, fontStyle: "italic", textIndent: 0 }}>{runs}</p>;
    case "h4":
      return <p style={{ fontWeight: 700, textIndent: indentPx }}>{runs}.</p>;
    case "h5":
      return <p style={{ fontWeight: 700, fontStyle: "italic", textIndent: indentPx }}>{runs}.</p>;
    case "refHeading":
      return <p style={{ textAlign: "center", fontWeight: 700, textIndent: 0 }}>Referencias</p>;
    case "abstract":
      return <p style={{ textIndent: 0 }}>{runs}</p>;
    case "quote":
      return <p style={{ marginLeft: indentPx, textIndent: 0 }}>{runs}</p>;
    case "reference":
      return <p style={{ paddingLeft: indentPx, textIndent: -indentPx }}>{runs}</p>;
    case "list":
      return (
        <p style={{ paddingLeft: indentPx, textIndent: -indentPx }}>
          <span>{block.ordered ? `${block.n ?? 1}. ` : "• "}</span>
          {runs}
        </p>
      );
    default:
      return <p style={{ textIndent: block.cont ? 0 : indentPx }}>{runs}</p>;
  }
}

export default function Preview({ pages, opts, hasContent, analyzing }: PreviewProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const m = pageMetrics(opts);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, (el.clientWidth - 4) / m.pageWPx));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [m.pageWPx]);

  const pageStyle: React.CSSProperties = {
    width: m.pageWPx,
    height: m.pageHPx,
    padding: m.marginPx,
    fontSize: m.fontPx,
    lineHeight: opts.spacing,
    fontFamily: `"${opts.fontFamily}", "Times New Roman", Times, Georgia, serif`,
    overflow: "hidden",
  };

  const coverTitle = (opts.docTitle.trim() || pages.flatMap((p) => p.blocks).find((b) => b.type === "title")?.runs.map((r) => r.t).join("") || "Documento sin título").trim();
  const coverLines = [opts.author, opts.affiliation, opts.course, opts.instructor, opts.dueDate].filter((l) => l.trim());

  return (
    <div ref={wrapRef} className="w-full">
      <div className="print-scale flex flex-col items-center gap-8" style={{ transform: `scale(${scale})`, transformOrigin: "top center", width: m.pageWPx, margin: "0 auto" }}>
        {!hasContent && (
          <div className="apa-page flex flex-col items-center justify-center text-center" style={pageStyle}>
            <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#c9c2ae" strokeWidth="1.4">
              <path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z" />
              <path d="M13 3v6h6" />
              <path d="M9 13h6M9 17h4" strokeLinecap="round" />
            </svg>
            <p className="mt-6 text-[19px] font-bold" style={{ color: "#3c3a31" }}>
              Tu documento aparecerá aquí
            </p>
            <p className="mt-2 max-w-[380px] text-[15px]" style={{ color: "#8b8674", lineHeight: 1.9 }}>
              Pega tu texto en el panel izquierdo o sube un archivo .txt, .md o .docx. La vista previa se actualiza al instante con todas las normas APA aplicadas.
            </p>
            <p className="mt-8 text-[13px] tracking-wide" style={{ color: "#b3ac97" }}>
              ¶ NORMA⁷ · APA 7ª edición
            </p>
          </div>
        )}

        {hasContent &&
          opts.titlePage && (
            <div className={`apa-page ${analyzing ? "analyzing" : ""}`} style={pageStyle}>
              {opts.pageNumbers && (
                <div className="absolute" style={{ top: m.marginPx * 0.4, right: m.marginPx }}>
                  1
                </div>
              )}
              <div className="flex h-full flex-col items-center" style={{ paddingTop: m.contentHPx * 0.24 }}>
                <p className="text-center font-bold" style={{ maxWidth: m.contentWPx }}>
                  {coverTitle}
                </p>
                <p style={{ height: m.fontPx * opts.spacing }} />
                {coverLines.map((l, i) => (
                  <p key={i} className="text-center">
                    {l.trim()}
                  </p>
                ))}
                {coverLines.length === 0 && (
                  <p className="text-center italic" style={{ color: "#a09a86", fontSize: m.fontPx * 0.85 }}>
                    Completa los datos de la portada en el panel «Normas y portada»
                  </p>
                )}
              </div>
            </div>
          )}

        {hasContent &&
          pages.map((page) => (
            <div key={page.number} className={`apa-page ${analyzing ? "analyzing" : ""}`} style={pageStyle}>
              {opts.pageNumbers && (
                <div className="absolute" style={{ top: m.marginPx * 0.4, right: m.marginPx }}>
                  {page.number}
                </div>
              )}
              {page.blocks.map((b, i) => (
                <BlockView key={`${page.number}-${i}`} block={b} indentPx={(opts.indentCm / 2.54) * 96} />
              ))}
            </div>
          ))}
      </div>
      {hasContent && (
        <p className="mt-5 text-center text-xs tracking-wide text-faint">
          {pages.length + (opts.titlePage ? 1 : 0)} página{pages.length + (opts.titlePage ? 1 : 0) === 1 ? "" : "s"} · tamaño carta (21,59 × 27,94 cm) · previsualización aproximada
        </p>
      )}
    </div>
  );
}
