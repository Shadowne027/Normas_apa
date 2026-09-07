import type { ReportItem, Stats } from "../lib/apa";

const CheckIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const PenIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

const WarnIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

function StatChip({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      key={value}
      className={`chip-pop flex flex-col items-start rounded-lg border px-3.5 py-2.5 ${
        accent ? "border-gold/30 bg-gold/[0.07]" : "border-line-soft bg-panel"
      }`}
    >
      <span className={`font-display text-2xl font-bold leading-none ${accent ? "text-gold" : "text-snow"}`}>
        {value.toLocaleString("es")}
      </span>
      <span className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-faint">{label}</span>
    </div>
  );
}

interface ReportProps {
  report: ReportItem[];
  stats: Stats;
  pageCount: number;
  hasContent: boolean;
}

export default function Report({ report, stats, pageCount, hasContent }: ReportProps) {
  const rules = report.filter((r) => r.kind === "rule");
  const fixes = report.filter((r) => r.kind === "fix");
  const warns = report.filter((r) => r.kind === "warn");

  return (
    <section aria-label="Informe de análisis" className="rounded-xl border border-line-soft bg-ink-2/80 p-6 backdrop-blur-sm sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-snow">
          Informe de aplicación <span className="text-gold">APA 7</span>
        </h2>
        <span className="rounded-full border border-line px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-mist">
          Análisis en vivo
        </span>
      </div>

      {hasContent ? (
        <>
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            <StatChip label="Palabras" value={stats.words} accent />
            <StatChip label="Párrafos" value={stats.paragraphs} />
            <StatChip label="Encabezados" value={stats.headings} />
            <StatChip label="Referencias" value={stats.references} />
            <StatChip label="Citas" value={stats.citations} />
            <StatChip label="Páginas" value={pageCount} />
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em] text-mint">
                <span className="text-mint">{CheckIcon}</span> Normas aplicadas
              </h3>
              <ul className="mt-3 space-y-2.5">
                {rules.map((r, i) => (
                  <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-mist">
                    <span className="mt-1 shrink-0 text-mint">{CheckIcon}</span>
                    {r.text}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em] text-gold">
                  <span className="text-gold">{PenIcon}</span> Correcciones hechas a tu texto
                </h3>
                {fixes.length > 0 ? (
                  <ul className="mt-3 space-y-2.5">
                    {fixes.map((r, i) => (
                      <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-mist">
                        <span className="mt-1 shrink-0 text-gold">{PenIcon}</span>
                        {r.text}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm italic text-faint">Tu texto no necesitó correcciones mayores. Bien ahí.</p>
                )}
              </div>
              {warns.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em] text-pen">
                    <span className="text-pen">{WarnIcon}</span> Revisa esto
                  </h3>
                  <ul className="mt-3 space-y-2.5">
                    {warns.map((r, i) => (
                      <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-mist">
                        <span className="mt-1 shrink-0 text-pen">{WarnIcon}</span>
                        {r.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <p className="mt-5 text-sm leading-relaxed text-faint">
          Cuando agregues tu documento verás aquí cuántas palabras tiene, qué normas se aplicaron y qué correcciones hizo NORMA⁷
          sobre tu texto original.
        </p>
      )}
    </section>
  );
}
