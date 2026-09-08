import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  analyzeText,
  APA_FONTS,
  DEFAULT_OPTIONS,
  type ApaOptions,
} from "./lib/apa";
import { paginate } from "./lib/paginate";
import { exportToDocx, slugify } from "./lib/docxExport";
import { exportToHtml } from "./lib/htmlExport";
import { SAMPLE_DOC } from "./lib/sample";
import Preview from "./components/Preview";
import Report from "./components/Report";
import Checklist from "./components/Checklist";

/* ---------- iconos ---------- */
const Ic = {
  upload: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m17 8-5-5-5 5" />
      <path d="M12 3v12" />
    </svg>
  ),
  download: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  ),
  doc: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z" />
      <path d="M13 3v6h6" />
    </svg>
  ),
  print: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9V3h12v6" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 14h12v7H6z" />
    </svg>
  ),
  code: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16 18 6-6-6-6" />
      <path d="m8 6-6 6 6 6" />
    </svg>
  ),
  eraser: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
      <path d="M22 21H7" />
      <path d="m5 11 9 9" />
    </svg>
  ),
  flask: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2v7.5L4.5 19a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L14 9.5V2" />
      <path d="M8.5 2h7" />
      <path d="M7 16h10" />
    </svg>
  ),
};

/* ---------- controles reutilizables ---------- */
function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="group flex w-full items-center justify-between gap-3 text-left"
    >
      <span className="text-sm font-medium text-snow">{label}</span>
      <span
        className={`relative w-10 shrink-0 rounded-full border transition-colors duration-300 ${
          on ? "border-gold/60 bg-gold/80" : "border-line bg-panel-2"
        }`}
        style={{ height: 22 }}
      >
        <span
          className={`absolute top-[2px] h-4 w-4 rounded-full transition-all duration-300 ${
            on ? "left-[21px] bg-ink" : "left-[3px] bg-faint group-hover:bg-mist"
          }`}
        />
      </span>
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-md border border-line bg-ink px-3 py-2 text-sm text-snow placeholder:text-faint outline-none transition-all duration-200 focus:border-gold/70 focus:ring-2 focus:ring-gold/20"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; t: string }[];
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">{label}</span>
      <div className="relative mt-1.5">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-md border border-line bg-ink px-3 py-2 pr-9 text-sm text-snow outline-none transition-all duration-200 focus:border-gold/70 focus:ring-2 focus:ring-gold/20"
        >
          {options.map((o) => (
            <option key={o.v} value={o.v} className="bg-ink">
              {o.t}
            </option>
          ))}
        </select>
        <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-faint" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </label>
  );
}

/* ================================================================ */

export default function App() {
  const [text, setText] = useState("");
  const [opts, setOpts] = useState<ApaOptions>(DEFAULT_OPTIONS);
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [reading, setReading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "err" } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const firstRun = useRef(true);
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = useCallback((msg: string, tone: "ok" | "err" = "ok") => {
    setToast({ msg, tone });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3800);
  }, []);

  /* análisis en vivo */
  const analysis = useMemo(() => analyzeText(text, opts), [text, opts]);
  const pages = useMemo(() => paginate(analysis.blocks, opts), [analysis, opts]);
  const hasContent = analysis.blocks.length > 0;

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (!text) return;
    setAnalyzing(true);
    const t = window.setTimeout(() => setAnalyzing(false), 650);
    return () => window.clearTimeout(t);
  }, [text, opts.spacing, opts.fontPt, opts.fontFamily, opts.marginCm, opts.indentCm]);

  /* carga de archivos */
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const file = Array.from(files)[0];
      if (!file) return;
      setReading(true);
      try {
        if (/\.docx$/i.test(file.name)) {
          const mammoth = await import("mammoth");
          const buf = await file.arrayBuffer();
          const res = await mammoth.extractRawText({ arrayBuffer: buf });
          setText(res.value.trim());
        } else if (/\.pdf$/i.test(file.name)) {
          const pdfjsLib = await import("pdfjs-dist");
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
          const buf = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
          const textParts: string[] = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map((item: any) => item.str).join(" ");
            textParts.push(pageText);
          }
          setText(textParts.join("\n\n").trim());
        } else if (/\.(txt|md|markdown|text)$/i.test(file.name)) {
          setText((await file.text()).trim());
        } else {
          showToast("Formato no compatible. Usa .txt, .md, .pdf o .docx", "err");
          setReading(false);
          return;
        }
        setFileName(file.name);
        showToast(`«${file.name}» cargado y analizado`);
      } catch {
        showToast("No se pudo leer el archivo. Verifica que sea un documento válido.", "err");
      }
      setReading(false);
    },
    [showToast]
  );

  /* exportaciones */
  const onExportDocx = async () => {
    if (!hasContent) return;
    setExporting(true);
    try {
      await exportToDocx(analysis, opts);
      showToast("Tu .docx con APA 7 está listo en descargas");
    } catch {
      showToast("Ocurrió un error al generar el .docx", "err");
    }
    setExporting(false);
  };

  const set = <K extends keyof ApaOptions>(key: K, value: ApaOptions[K]) =>
    setOpts((o) => ({ ...o, [key]: value }));

  const onFontChange = (family: string) => {
    const rec = APA_FONTS.find((f) => f.family === family);
    setOpts((o) => ({ ...o, fontFamily: family, fontPt: rec ? rec.pt : o.fontPt }));
  };

  const pageCount = pages.length + (opts.titlePage && hasContent ? 1 : 0);

  return (
    <div className="relative min-h-screen overflow-x-clip">
      {/* fondo ambiental */}
      <div className="ambient no-print" aria-hidden>
        <span className="glyph" style={{ top: "-4rem", left: "-2rem", fontSize: "26rem" }}>¶</span>
        <span className="glyph g2" style={{ top: "34%", right: "-6rem", fontSize: "30rem" }}>§</span>
        <span className="glyph g3" style={{ bottom: "-8rem", left: "12%", fontSize: "22rem" }}>&amp;</span>
        <span className="glyph g2" style={{ top: "8%", left: "58%", fontSize: "12rem" }}>Aa</span>
      </div>

      {/* encabezado */}
      <header className="no-print sticky top-0 z-40 border-b border-line-soft bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center justify-between gap-4 px-5 sm:px-8">
          <a href="#" className="group flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-gold/40 bg-gold/10 font-display text-xl font-extrabold text-gold transition-transform duration-300 group-hover:-rotate-6">
              ¶
            </span>
            <span className="font-display text-xl font-extrabold tracking-tight text-snow">
              NORMA<span className="text-gold">⁷</span>
            </span>
            <span className="hidden rounded-full border border-line px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-mist md:inline">
              APA 7ª edición · 2020
            </span>
          </a>
          <div className="flex items-center gap-3">
            <a href="#normas" className="hidden text-sm font-medium text-mist transition-colors hover:text-gold sm:block">
              ¿Qué aplica?
            </a>
            <span className="rounded-md border border-line-soft bg-panel px-3 py-1.5 text-xs font-semibold text-mist">
              <span className="text-gold">{analysis.stats.words.toLocaleString("es")}</span> palabras en formato
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* intro característica: el documento mismo */}
        <section className="no-print mx-auto w-full max-w-[1500px] px-5 pb-10 pt-12 sm:px-8 sm:pt-16">
          <div className="grid items-end gap-10 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <p className="flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-[0.24em] text-mist">
                <span className="inline-block h-[2px] w-8 bg-pen" />
                Formateador académico · todo en tu navegador
              </p>
              <h1 className="font-display mt-5 text-[2.6rem] font-extrabold leading-[1.04] tracking-tight text-snow sm:text-6xl">
                Tu borrador entra.{" "}
                <span className="pen-underline text-snow">
                  APA 7
                  <svg viewBox="0 0 220 14" preserveAspectRatio="none">
                    <path d="M3 10 C 60 3, 150 3, 217 8" />
                  </svg>
                </span>{" "}
                sale.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-mist">
                Pega tu documento o súbelo: NORMA⁷ lo analiza, corrige sangrías, interlineado, márgenes,
                encabezados, citas y referencias, y te entrega un <strong className="font-semibold text-snow">.docx impecable</strong>{" "}
                listo para entregar.
              </p>
            </div>
            <div className="rounded-xl border border-line-soft bg-panel/80 p-6 backdrop-blur-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-faint">Así funciona</p>
              <ol className="mt-4 space-y-4">
                {[
                  ["Pega, escribe o sube", "Acepta .txt, .md y .docx, o usa el documento de ejemplo."],
                  ["NORMA⁷ aplica las normas", "Cada regla APA 7 se aplica y se reporta al instante."],
                  ["Descarga tu .docx", "Sangrías, portada y numeración incluidas en el archivo final."],
                ].map(([t, d], i) => (
                  <li key={i} className="group flex gap-4">
                    <span className="font-display flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold/40 text-sm font-extrabold text-gold transition-all duration-300 group-hover:bg-gold group-hover:text-ink">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-snow">{t}</p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-mist">{d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* mesa de trabajo */}
        <section className="mx-auto w-full max-w-[1500px] px-5 pb-16 sm:px-8">
          <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
            {/* columna izquierda: entrada + opciones */}
            <div className="no-print space-y-6 xl:sticky xl:top-24 xl:self-start xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto xl:pr-2">
              {/* documento */}
              <div className="rounded-xl border border-line-soft bg-panel/90 p-6 backdrop-blur-sm transition-colors duration-300 focus-within:border-gold/40">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-display text-lg font-bold text-snow">
                    <span className="mr-2 text-gold">01</span>Tu documento
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setText(SAMPLE_DOC);
                        setFileName("ensayo-ejemplo.txt");
                        showToast("Documento de ejemplo cargado: mira cómo se transforma");
                      }}
                      className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[12px] font-semibold text-mist transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/50 hover:text-gold active:translate-y-0"
                    >
                      {Ic.flask} Ejemplo
                    </button>
                    <button
                      onClick={() => {
                        setText("");
                        setFileName("");
                      }}
                      disabled={!text}
                      className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[12px] font-semibold text-mist transition-all duration-200 hover:-translate-y-0.5 hover:border-pen/60 hover:text-pen active:translate-y-0 disabled:pointer-events-none disabled:opacity-40"
                    >
                      {Ic.eraser} Limpiar
                    </button>
                  </div>
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    handleFiles(e.dataTransfer.files);
                  }}
                  onClick={() => fileRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
                  className={`mt-4 flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3.5 transition-all duration-300 ${
                    dragOver
                      ? "scale-[1.015] border-gold bg-gold/10"
                      : "border-line bg-ink/60 hover:border-gold/50 hover:bg-ink"
                  }`}
                >
                  <span className={`transition-colors ${dragOver ? "text-gold" : "text-faint"}`}>{Ic.upload}</span>
                  <span className="text-sm text-mist">
                    {reading ? (
                      <span className="font-semibold text-gold">Leyendo archivo…</span>
                    ) : fileName ? (
                      <>
                        <span className="font-semibold text-snow">{fileName}</span> cargado — suelta otro para reemplazarlo
                      </>
                    ) : (
                      <>
                        Arrastra un archivo o <span className="font-semibold text-gold">haz clic para subir</span>
                        <span className="block text-[12px] text-faint">.txt · .md · .pdf · .docx</span>
                      </>
                    )}
                  </span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".txt,.md,.markdown,.text,.docx,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.length) handleFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </div>

                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={"Pega aquí tu trabajo tal como está:\ncon errores, MAYÚSCULAS, espacios de más… NORMA⁷ se encarga del resto.\n\nConsejo: marca los encabezados con # como en Markdown para una detección perfecta."}
                  spellCheck={false}
                  className="mt-3 h-64 w-full resize-y rounded-lg border border-line bg-ink px-4 py-3.5 text-[13.5px] leading-relaxed text-snow outline-none transition-all duration-200 placeholder:text-faint focus:border-gold/70 focus:ring-2 focus:ring-gold/15"
                />
                <div className="mt-2 flex items-center justify-between text-[12px] text-faint">
                  <span>{text.length.toLocaleString("es")} caracteres</span>
                  <span className={analyzing ? "font-semibold text-gold" : ""}>
                    {analyzing ? "Analizando…" : hasContent ? "Análisis al día ✓" : "Esperando documento"}
                  </span>
                </div>
              </div>

              {/* normas y portada */}
              <div className="rounded-xl border border-line-soft bg-panel/90 p-6 backdrop-blur-sm">
                <h2 className="font-display text-lg font-bold text-snow">
                  <span className="mr-2 text-gold">02</span>Normas y portada
                </h2>
                <div className="mt-4 grid grid-cols-2 gap-3.5">
                  <div className="col-span-2">
                    <Select
                      label="Fuente (autorizadas APA 7)"
                      value={opts.fontFamily}
                      onChange={onFontChange}
                      options={APA_FONTS.map((f) => ({ v: f.family, t: `${f.family} · ${f.pt} pt` }))}
                    />
                  </div>
                  <Select
                    label="Interlineado"
                    value={String(opts.spacing)}
                    onChange={(v) => set("spacing", Number(v) === 1.5 ? 1.5 : 2)}
                    options={[
                      { v: "2", t: "Doble (2,0) — norma" },
                      { v: "1.5", t: "1,5 — si te lo piden" },
                    ]}
                  />
                  <Select
                    label="Márgenes"
                    value={String(opts.marginCm)}
                    onChange={(v) => set("marginCm", Number(v))}
                    options={[
                      { v: "2.54", t: "2,54 cm — norma" },
                      { v: "3", t: "3 cm" },
                      { v: "2", t: "2 cm" },
                    ]}
                  />
                </div>

                <div className="mt-5 space-y-4 border-t border-line-soft pt-5">
                  <Toggle on={opts.pageNumbers} onChange={(v) => set("pageNumbers", v)} label="Número de página arriba a la derecha" />
                  <Field
                    label="Encabezado corto (opcional, trabajos profesionales)"
                    value={opts.runningHead}
                    onChange={(v) => set("runningHead", v)}
                    placeholder="p. ej. SUEÑO Y RENDIMIENTO"
                  />
                </div>

                <div className="mt-5 border-t border-line-soft pt-5">
                  <Toggle on={opts.titlePage} onChange={(v) => set("titlePage", v)} label="Portada estilo estudiante" />
                  {opts.titlePage && (
                    <div className="mt-4 grid grid-cols-2 gap-3.5">
                      <div className="col-span-2">
                        <Field label="Título del trabajo" value={opts.docTitle} onChange={(v) => set("docTitle", v)} placeholder="El sueño y el rendimiento académico…" />
                      </div>
                      <Field label="Tu nombre" value={opts.author} onChange={(v) => set("author", v)} placeholder="Ana M. Rodríguez" />
                      <Field label="Facultad y universidad" value={opts.affiliation} onChange={(v) => set("affiliation", v)} placeholder="Psicología, U. Nacional" />
                      <Field label="Curso" value={opts.course} onChange={(v) => set("course", v)} placeholder="PSI-201: Metodología" />
                      <Field label="Docente" value={opts.instructor} onChange={(v) => set("instructor", v)} placeholder="Dr. Luis Herrera" />
                      <div className="col-span-2">
                        <Field label="Fecha de entrega" value={opts.dueDate} onChange={(v) => set("dueDate", v)} placeholder="16 de marzo de 2026" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* columna derecha: resultado */}
            <div className="min-w-0 space-y-6">
              <div className="no-print flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line-soft bg-panel/90 px-6 py-4 backdrop-blur-sm">
                <div>
                  <h2 className="font-display text-lg font-bold text-snow">
                    <span className="mr-2 text-gold">03</span>Resultado en vivo
                  </h2>
                  <p className="text-[13px] text-mist">
                    {hasContent ? (
                      <>
                        <span className="font-semibold text-mint">Listo para exportar</span> · {slugify(opts.docTitle || analysis.detectedTitle || "documento")}-APA7.docx
                      </>
                    ) : (
                      "La vista previa aparecerá aquí"
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={onExportDocx}
                    disabled={!hasContent || exporting}
                    className="group flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-bold text-ink shadow-[0_8px_24px_-8px_rgba(233,180,76,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-gold-hi hover:shadow-[0_14px_30px_-8px_rgba(233,180,76,0.7)] active:translate-y-0 disabled:pointer-events-none disabled:opacity-40"
                  >
                    <span className={`transition-transform duration-300 ${exporting ? "animate-bounce" : "group-hover:translate-y-0.5"}`}>{Ic.download}</span>
                    {exporting ? "Generando…" : "Descargar .docx"}
                  </button>
                  <button
                    onClick={() => {
                      exportToHtml(analysis, opts);
                      showToast("HTML formateado descargado");
                    }}
                    disabled={!hasContent}
                    className="flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-mist transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/50 hover:text-gold active:translate-y-0 disabled:pointer-events-none disabled:opacity-40"
                  >
                    {Ic.code} HTML
                  </button>
                  <button
                    onClick={() => window.print()}
                    disabled={!hasContent}
                    className="flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-mist transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/50 hover:text-gold active:translate-y-0 disabled:pointer-events-none disabled:opacity-40"
                  >
                    {Ic.print} Imprimir
                  </button>
                </div>
              </div>

              {/* vista previa */}
              <div id="print-root" className="rounded-xl border border-line-soft bg-ink-2/60 p-4 py-10 backdrop-blur-sm sm:p-8">
                <Preview pages={pages} opts={opts} hasContent={hasContent} analyzing={analyzing} />
              </div>

              <div className="no-print">
                <Report report={analysis.report} stats={analysis.stats} pageCount={pageCount} hasContent={hasContent} />
              </div>
            </div>
          </div>
        </section>

        <div className="no-print">
          <Checklist />
        </div>
      </main>

      {/* pie */}
      <footer className="no-print relative z-10 border-t border-line-soft">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col items-start justify-between gap-3 px-5 py-8 text-[13px] text-faint sm:flex-row sm:items-center sm:px-8">
          <p>
            <span className="font-display font-bold text-mist">NORMA⁷</span> — hecho para estudiantes que entregan a tiempo.
          </p>
          <p>
            Basado en el <em>Publication Manual</em>, 7ª ed. (2020) · Todo ocurre en tu navegador: tu documento no se sube a ningún servidor.
          </p>
        </div>
      </footer>

      {/* toast */}
      {toast && (
        <div
          className={`toast-in no-print fixed bottom-6 right-6 z-50 flex max-w-sm items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold shadow-2xl backdrop-blur-md ${
            toast.tone === "ok" ? "border-gold/50 bg-panel text-snow" : "border-pen/60 bg-panel text-pen"
          }`}
          role="status"
        >
          <span className={toast.tone === "ok" ? "text-gold" : "text-pen"}>
            {toast.tone === "ok" ? Ic.doc : Ic.eraser}
          </span>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
