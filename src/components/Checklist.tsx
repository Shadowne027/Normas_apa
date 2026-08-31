import { useEffect, useRef } from "react";

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    el.querySelectorAll(".reveal").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);
  return ref;
}

const RULES = [
  {
    n: "01",
    t: "Márgenes de 2,54 cm",
    d: "Una pulgada exacta en los cuatro lados de cada página, como exige el manual. También puedes usar 3 cm si tu facultad lo prefiere.",
  },
  {
    n: "02",
    t: "Fuentes autorizadas",
    d: "Times New Roman 12, Arial 11, Calibri 11, Georgia 11 o Lucida Sans Unicode 10. Solo las que acepta la 7ª edición.",
  },
  {
    n: "03",
    t: "Interlineado doble",
    d: "Doble espacio en todo el documento, incluidas portada y referencias, sin líneas extra entre párrafos ni después de los títulos.",
  },
  {
    n: "04",
    t: "Sangrías correctas",
    d: "Primera línea de cada párrafo a 1,27 cm. Las referencias usan sangría francesa y las citas de 40+ palabras, sangría de bloque.",
  },
  {
    n: "05",
    t: "Citas bajo control",
    d: "Cursivas en símbolos estadísticos (p, M, SD, t, F), comillas solo para citas cortas y bloque con sangría para las largas.",
  },
  {
    n: "06",
    t: "Portada estudiante",
    d: "Título en negrita centrado a un tercio de la página, seguido de autor, afiliación, curso, docente y fecha. Número de página desde la 1.",
  },
];

const LEVELS = [
  { name: "Nivel 1", style: "text-center font-bold", desc: "Centrado · Negrita · Cada palabra principal en mayúscula" },
  { name: "Nivel 2", style: "font-bold", desc: "Alineado a la izquierda · Negrita" },
  { name: "Nivel 3", style: "font-bold italic", desc: "Alineado a la izquierda · Negrita y cursiva" },
  { name: "Nivel 4", style: "font-bold pl-10", desc: "Con sangría · Negrita · Punto final · El texto sigue en la misma línea" },
  { name: "Nivel 5", style: "font-bold italic pl-10", desc: "Con sangría · Negrita y cursiva · Punto final" },
];

export default function Checklist() {
  const ref = useReveal();

  return (
    <section ref={ref} id="normas" className="relative mx-auto w-full max-w-6xl px-5 pb-24 pt-10 sm:px-8">
      <div className="reveal grid gap-10 lg:grid-cols-[1fr_1.35fr]">
        {/* encabezados APA en vivo */}
        <div className="reveal rounded-xl border border-line-soft bg-panel p-7" style={{ ["--rd" as never]: "80ms" }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold">Referencia rápida</p>
          <h3 className="font-display mt-2 text-2xl font-bold text-snow">Los 5 niveles de encabezado</h3>
          <p className="mt-2 text-sm leading-relaxed text-mist">
            Así se ven los encabezados APA 7 aplicados por NORMA⁷, del nivel 1 (secciones mayores) al 5 (subapartados).
          </p>
          <div className="mt-6 space-y-4 rounded-lg border border-line bg-paper px-6 py-6" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
            {LEVELS.map((l) => (
              <div key={l.name} className="group border-b border-dashed border-[#d8d2bf] pb-3.5 last:border-0 last:pb-0">
                <p className={`${l.style} text-[16px] leading-relaxed text-[#1c1b16] transition-transform duration-300 group-hover:translate-x-1`}>
                  El impacto del descanso en la memoria
                </p>
                <p className="mt-1 font-body text-[11px] uppercase tracking-[0.14em] text-[#9a937c]">
                  {l.name} — {l.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* reglas numeradas */}
        <div>
          <p className="reveal text-[11px] font-bold uppercase tracking-[0.22em] text-pen" style={{ ["--rd" as never]: "40ms" }}>
            La pluma roja no perdona
          </p>
          <h3 className="reveal font-display mt-2 text-3xl font-bold leading-tight text-snow sm:text-4xl" style={{ ["--rd" as never]: "100ms" }}>
            Todo lo que NORMA⁷ aplica por ti
          </h3>
          <div className="mt-7 grid gap-x-10 gap-y-7 sm:grid-cols-2">
            {RULES.map((r, i) => (
              <div key={r.n} className="reveal group flex gap-4" style={{ ["--rd" as never]: `${120 + i * 70}ms` }}>
                <span className="font-display text-3xl font-extrabold leading-none text-line transition-colors duration-300 group-hover:text-gold">
                  {r.n}
                </span>
                <div className="border-b border-line-soft pb-5 transition-colors duration-300 group-hover:border-gold/40">
                  <h4 className="font-body text-[15px] font-bold text-snow">{r.t}</h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-mist">{r.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
