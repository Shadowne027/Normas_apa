/* ============================================================
 * NORMA⁷ — motor de análisis y aplicación de normas APA 7ª ed.
 * ============================================================ */

export type BlockType =
  | "title"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "paragraph"
  | "abstract"
  | "quote"
  | "reference"
  | "list"
  | "refHeading"
  | "toc"
  | "annex";

export interface Run {
  t: string;
  i?: boolean;
  b?: boolean;
}

export interface Block {
  type: BlockType;
  runs: Run[];
  cont?: boolean; // continuación de párrafo partido por paginación
  ordered?: boolean;
  n?: number;
}

export type ReportKind = "rule" | "fix" | "warn";

export interface ReportItem {
  kind: ReportKind;
  text: string;
}

export interface Stats {
  words: number;
  paragraphs: number;
  headings: number;
  references: number;
  citations: number;
  quotes: number;
}

export interface Analysis {
  blocks: Block[];
  report: ReportItem[];
  stats: Stats;
  detectedTitle: string;
}

export interface ApaOptions {
  fontFamily: string;
  fontPt: number;
  spacing: 2 | 1.5;
  marginCm: number;
  indentCm: number;
  titlePage: boolean;
  docTitle: string;
  author: string;
  affiliation: string;
  course: string;
  instructor: string;
  dueDate: string;
  pageNumbers: boolean;
  runningHead: string;
}

export const DEFAULT_OPTIONS: ApaOptions = {
  fontFamily: "Times New Roman",
  fontPt: 12,
  spacing: 2,
  marginCm: 2.54,
  indentCm: 1.27,
  titlePage: true,
  docTitle: "",
  author: "",
  affiliation: "",
  course: "",
  instructor: "",
  dueDate: "",
  pageNumbers: true,
  runningHead: "",
};

export const APA_FONTS: { family: string; pt: number }[] = [
  { family: "Times New Roman", pt: 12 },
  { family: "Arial", pt: 11 },
  { family: "Calibri", pt: 11 },
  { family: "Georgia", pt: 11 },
  { family: "Lucida Sans Unicode", pt: 10 },
];

/* ---------------- utilidades de texto ---------------- */

const ACRONYMS = new Set(
  "APA ONU OMS OPS UNAM TIC TDAH DSM CI UE PIB TCC ADN ARN FBI PDF URL DOI ISBN EEG RMN UCI".split(" ")
);

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function isAllCaps(s: string): boolean {
  const letters = s.replace(/[^a-záéíóúüñA-ZÁÉÍÓÚÜÑ]/g, "");
  if (letters.length < 4) return false;
  const up = letters.replace(/[^A-ZÁÉÍÓÚÜÑ]/g, "");
  return up.length / letters.length >= 0.85;
}

/** Convierte MAYÚSCULAS SOSTENIDAS a tipo oración conservando siglas. */
export function fixCaps(s: string): string {
  if (!isAllCaps(s)) return s;
  const words = s.toLowerCase().split(/\s+/);
  const out = words.map((w, idx) => {
    const clean = w.replace(/[^a-z0-9.]/g, "").toUpperCase();
    if (ACRONYMS.has(clean) || /\d/.test(w)) return ACRONYMS.has(clean) ? clean : w;
    const capitalize =
      idx === 0 ||
      /[:.¿¡]$/.test(words[idx - 1] ?? "") ||
      ACRONYMS.has(words[idx - 1]?.replace(/[^a-z0-9.]/g, "").toUpperCase() ?? "");
    return capitalize ? w.charAt(0).toUpperCase() + w.slice(1) : w;
  });
  return out.join(" ");
}

export function plainText(runs: Run[]): string {
  return runs.map((r) => r.t).join("");
}

export function wordCount(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

/* ---------------- formato en línea (cursivas APA) ---------------- */

/** Marca símbolos estadísticos (p, M, SD, t, F, N, df…) antes del operador. */
function markStatistics(text: string): { text: string; count: number } {
  let count = 0;
  const out = text.replace(
    /(?<=^|[\s(])((?:p|M|SD|DE|dt|t|F|N|n|df|gl|IC|r|r²|R²|Z|χ²)(?:\s*<\s*\.\d+)?)(?=\s*[=<>≤≥(])/g,
    (_m, sym: string) => {
      count++;
      return `\u0001${sym}\u0002`;
    }
  );
  return { text: out, count };
}

/** Convierte **negrita**, *cursiva*, _cursiva_ y marcas estadísticas a runs. */
export function parseInline(text: string): Run[] {
  const runs: Run[] = [];
  const re = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|_[^_\n]+_|\u0001[^\u0002\n]+\u0002)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) runs.push({ t: text.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith("**")) runs.push({ t: tok.slice(2, -2), b: true });
    else runs.push({ t: tok.slice(1, -1), i: true });
    last = m.index + tok.length;
  }
  if (last < text.length) runs.push({ t: text.slice(last) });
  return runs.filter((r) => r.t.length > 0);
}

/* ---------------- referencias ---------------- */

export interface RefResult {
  runs: Run[];
  sortKey: string;
  fixes: string[];
}

export function formatReference(raw: string): RefResult {
  const fixes: string[] = [];
  let text = raw.replace(/\s+/g, " ").trim();

  if (/Recuperado de|Retrieved from/i.test(text)) {
    text = text.replace(/\s*(Recuperado de|Retrieved from)\s*/i, " ");
    fixes.push('Se eliminó "Recuperado de" antes del enlace (APA 7 ya no lo usa).');
  }
  text = text.replace(/\s+\./g, ".").replace(/\.{2,}/g, ".").trim();

  const yearM = /\((\d{4})[a-z]?\)/.exec(text);
  let prefix = "";
  let rest = text;
  if (yearM && yearM.index !== undefined) {
    const cut = yearM.index + yearM[0].length;
    prefix = text.slice(0, cut);
    rest = text.slice(cut).replace(/^\.?\s*/, "");
  }

  // Detectar URL al final
  const urlMatch = /\s+(https?:\/\/[^\s]+)$/.exec(rest);
  let url = "";
  if (urlMatch) {
    url = urlMatch[1];
    rest = rest.slice(0, urlMatch.index);
  }

  // fin del título: primer ". " seguido de mayúscula, dígito o https
  let titleEnd = -1;
  for (let i = 0; i < rest.length - 1; i++) {
    if (rest[i] === "." && rest[i + 1] === " ") {
      const next = rest[i + 2] ?? "";
      if (/[A-ZÁÉÍÓÚÑ0-9H]/.test(next)) {
        titleEnd = i;
        break;
      }
    }
  }

  const runs: Run[] = [];
  if (prefix) runs.push({ t: prefix + (rest ? ". " : "") });

  if (titleEnd === -1) {
    runs.push({ t: rest, i: rest.length > 0 && !!yearM ? true : undefined });
  } else {
    const title = rest.slice(0, titleEnd + 1);
    const after = rest.slice(titleEnd + 2).trim();
    const journalM = /^([^,]+),\s*(\d+)\s*(\(\d+\))?/.exec(after);
    if (journalM) {
      runs.push({ t: title + " " });
      runs.push({
        t: `${journalM[1]}, ${journalM[2]}${journalM[3] ?? ""}`,
        i: true,
      });
      runs.push({ t: after.slice(journalM[0].length) });
      fixes.push("Nombre de la revista y volumen en cursiva.");
    } else {
      runs.push({ t: title, i: true });
      runs.push({ t: ". " + after });
      fixes.push("Título de la obra en cursiva (formato de libro/informe).");
    }
  }

  // Agregar URL si existe
  if (url) {
    runs.push({ t: " " + url });
  }

  const sortKey = stripAccents(text.replace(/^[^a-záéíóúñA-ZÁÉÍÓÚÑ]*/u, "").toLowerCase());
  return { runs: runs.filter((r) => r.t.length > 0), sortKey, fixes };
}

/* ---------------- análisis principal ---------------- */

const LEVEL1_HINTS = new Set([
  "introduccion",
  "marco teorico",
  "antecedentes",
  "metodo",
  "metodologia",
  "materiales y metodo",
  "materiales y metodos",
  "planteamiento del problema",
  "objetivos",
  "justificacion",
  "hipotesis",
  "resultados",
  "discusion",
  "conclusion",
  "conclusiones",
  "referencias",
  "bibliografia",
  "anexos",
  "anexo",
  "apendices",
  "apendice",
  "resumen",
  "abstract",
  "indice",
  "tabla de contenido",
  "introduccion general",
  "discusion general",
]);

function normHeading(s: string): string {
  return stripAccents(
    s
      .replace(/^#+\s*/, "")
      .replace(/^(\d+[\.\)]\s*)?/, "") // quitar numeración inicial
      .replace(/[:.]+$/, "")
      .trim()
      .toLowerCase()
  );
}

interface Counters {
  tabs: number;
  multiSpaces: number;
  parenFixes: number;
  capsFixed: number;
  mdHeadings: number;
  statItalics: number;
  quotesStripped: number;
  biblioRenamed: boolean;
  refFixNotes: string[];
  refsSorted: boolean;
  longParagraphs: number;
  longHeadings: number;
  listItems: number;
  listsOrdered: number;
}

export function analyzeText(rawInput: string, opts: ApaOptions): Analysis {
  const c: Counters = {
    tabs: 0,
    multiSpaces: 0,
    parenFixes: 0,
    capsFixed: 0,
    mdHeadings: 0,
    statItalics: 0,
    quotesStripped: 0,
    biblioRenamed: false,
    refFixNotes: [],
    refsSorted: false,
    longParagraphs: 0,
    longHeadings: 0,
    listItems: 0,
    listsOrdered: 0,
  };

  /* --- 1. normalización --- */
  let text = rawInput.replace(/\r\n?/g, "\n");
  text = text.replace(/\t/g, () => {
    c.tabs++;
    return " ";
  });
  text = text.replace(/ {2,}/g, () => {
    c.multiSpaces++;
    return " ";
  });
  text = text.replace(/[ ]+\n/g, "\n");

  const blocks: Block[] = [];
  let rawBlocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

  /* Si el texto pegado no tiene líneas en blanco (típico al copiar de un PDF),
     tratamos cada línea como un bloque, agrupando listas y citas consecutivas. */
  if (rawBlocks.length === 1 && text.includes("\n") && text.split("\n").length >= 4) {
    const isListItem = (l: string) => /^([-*•◦]|\d+[.)])\s+/.test(l);
    const isQuote = (l: string) => l.startsWith(">");
    const groups: string[] = [];
    let buf: string[] = [];
    for (const raw of text.split("\n")) {
      const t = raw.trim();
      if (!t) continue;
      if (buf.length > 0) {
        const head = buf[0];
        const sameKind = (isListItem(head) && isListItem(t)) || (isQuote(head) && isQuote(t));
        if (sameKind) {
          buf.push(t);
          continue;
        }
        groups.push(buf.join("\n"));
        buf = [];
      }
      if (isListItem(t) || isQuote(t)) buf = [t];
      else groups.push(t);
    }
    if (buf.length > 0) groups.push(buf.join("\n"));
    rawBlocks = groups;
  }

  /* --- 2. clasificación por bloques --- */
  const state: { mode: "body" | "abstract" | "refs" | "toc" | "annex" } = { mode: "body" };
  const refEntries: string[] = [];
  const warnings: string[] = [];
  let detectedTitle = "";
  const headingLevels: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  const pushHeading = (line: string, level: number) => {
    const clean = line.replace(/^#+\s*/, "").replace(/[:.]+$/, "").trim();
    let out = clean;
    if (isAllCaps(clean)) {
      out = fixCaps(clean);
      c.capsFixed++;
    }
    if (wordCount(out) > 14) c.longHeadings++;
    headingLevels[Math.min(level, 5)]++;
    blocks.push({ type: `h${Math.min(level, 5)}` as BlockType, runs: [{ t: out, b: true }] });
    return out;
  };

  const makeParagraph = (body: string, type: BlockType = "paragraph"): Block => {
    const cs = fixCitationSpacing(body);
    c.parenFixes += cs.count;
    const stat = markStatistics(cs.text);
    c.statItalics += stat.count;
    return { type, runs: parseInline(stat.text) };
  };

  for (const rawBlock of rawBlocks) {
    const lines = rawBlock.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    const single = lines.length === 1 ? lines[0] : null;

    /* bloque de cita (> por línea) */
    if (lines.every((l) => l.startsWith(">"))) {
      state.mode = "body";
      let quote = lines.map((l) => l.replace(/^>\s?/, "")).join(" ");
      const wc = wordCount(quote);
      if (wc >= 40 && /^["""«]/.test(quote) && /[""»]$/.test(quote)) {
        quote = quote.slice(1, -1).trim();
        c.quotesStripped++;
      }
      if (wc < 40)
        warnings.push(
          `Cita en bloque de ${wc} palabras: APA pide bloque solo para citas de 40+ palabras; las más cortas van entre comillas dentro del párrafo.`
        );
      const stat = markStatistics(quote);
      c.statItalics += stat.count;
      blocks.push({ type: "quote", runs: parseInline(stat.text) });
      continue;
    }

    /* lista */
    if (lines.every((l) => /^([-*•◦]|\d+[.)])\s+/.test(l))) {
      state.mode = "body";
      let n = 0;
      for (const l of lines) {
        n++;
        const ordered = /^\d+[.)]\s+/.test(l);
        if (ordered) c.listsOrdered++;
        c.listItems++;
        const numMatch = /^(\d+)[.)]\s+/.exec(l);
        const content = l.replace(/^([-*•◦]|\d+[.)])\s+/, "");
        const stat = markStatistics(content);
        c.statItalics += stat.count;
        blocks.push({ type: "list", runs: parseInline(stat.text), ordered, n: numMatch ? parseInt(numMatch[1], 10) : n });
      }
      continue;
    }

    /* encabezado markdown */
    if (single && /^#{1,5}\s+\S/.test(single)) {
      c.mdHeadings++;
      const level = (single.match(/^#+/) ?? ["#"])[0].length;
      const out = pushHeading(single, level);
      handleHeadingSideEffects(out);
      continue;
    }

    /* encabezado por heurística: línea única, corta, sin puntuación final */
    if (
      single &&
      wordCount(single) <= 14 &&
      !/[.;,]$/.test(single) &&
      !/^(https?:|www\.)/i.test(single) &&
      !/^[(\"""«]/.test(single)
    ) {
      // Detectar si es un capítulo numerado
      const chapterMatch = /^(Cap[ií]tulo\s+\d+|\d+[\.\)]\s+[A-ZÁÉÍÓÚÑ])/.test(single);
      const hint = normHeading(single);
      const isKnown = LEVEL1_HINTS.has(hint);
      const looksHeading = isKnown || isAllCaps(single) || chapterMatch;
      
      if (looksHeading || (wordCount(single) <= 5 && !/^\d/.test(single))) {
        const level = isKnown ? 1 : (chapterMatch ? 1 : 2);
        const out = pushHeading(single, level);
        handleHeadingSideEffects(out);
        continue;
      }
    }

    /* contenido según modo */
    if (state.mode === "refs") {
      refEntries.push(rawBlock.replace(/\n/g, " "));
      continue;
    }

    if (state.mode === "toc") {
      blocks.push({ type: "toc", runs: [{ t: rawBlock.replace(/\n/g, " ") }] });
      continue;
    }

    if (state.mode === "annex") {
      blocks.push({ type: "annex", runs: [{ t: rawBlock.replace(/\n/g, " ") }] });
      continue;
    }

    const joined = lines.join(" ");
    if (state.mode === "abstract") {
      blocks.push(makeParagraph(joined, "abstract"));
      continue;
    }

    if (wordCount(joined) > 250) c.longParagraphs++;
    blocks.push(makeParagraph(joined));

    function handleHeadingSideEffects(out: string) {
      const h = stripAccents(out.toLowerCase().replace(/^(\d+[\.\)]\s*)?/, ""));
      if (h === "referencias" || h === "bibliografia" || h === "bibliografia general") {
        if (h !== "referencias") c.biblioRenamed = true;
        state.mode = "refs";
        blocks.pop();
        blocks.push({ type: "refHeading", runs: [{ t: "Referencias", b: true }] });
      } else if (h === "resumen" || h === "abstract") {
        state.mode = "abstract";
      } else if (h === "indice" || h === "tabla de contenido") {
        state.mode = "toc";
      } else if (h === "anexos" || h === "anexo" || h === "apendices" || h === "apendice") {
        state.mode = "annex";
      } else {
        state.mode = "body";
      }
    }
  }

  /* --- título del documento --- */
  const first = blocks[0];
  if (first && (first.type === "h1" || first.type === "h2")) {
    const lvl = first.type === "h1" ? 1 : 2;
    headingLevels[lvl] = Math.max(0, headingLevels[lvl] - 1);
    first.type = "title";
    detectedTitle = plainText(first.runs);
  } else if (first && first.type === "paragraph") {
    const t = plainText(first.runs);
    const firstLine = t.split(". ")[0];
    if (wordCount(t) <= 18 && !/[.;,]$/.test(t)) {
      blocks.shift();
      const fixed = isAllCaps(firstLine) ? fixCaps(firstLine) : firstLine;
      if (fixed !== firstLine) c.capsFixed++;
      blocks.unshift({ type: "title", runs: [{ t: fixed, b: true }] });
      detectedTitle = fixed;
    }
  }
  if (!detectedTitle && opts.docTitle) detectedTitle = opts.docTitle;

  /* --- referencias: formato, cursivas y orden alfabético --- */
  let refCount = 0;
  if (refEntries.length > 0) {
    const formatted = refEntries.map((e) => formatReference(e));
    const keys = formatted.map((f) => f.sortKey);
    const sortedIdx = formatted
      .map((_, i) => i)
      .sort((a, b) => keys[a].localeCompare(keys[b], "es", { sensitivity: "base" }));
    c.refsSorted = sortedIdx.some((v, i) => v !== i);
    for (const idx of sortedIdx) {
      const f = formatted[idx];
      if (f.fixes.length && c.refFixNotes.length < 3) c.refFixNotes.push(f.fixes[0]);
      blocks.push({ type: "reference", runs: f.runs });
      refCount++;
    }
  }

  /* --- citas en el texto --- */
  const fullPlain = blocks.map((b) => plainText(b.runs)).join(" ");
  const citationMatches = fullPlain.match(/\([^()]*\d{4}[a-z]?[^()]*\)/g) ?? [];
  const citations = citationMatches.length;

  /* --- coherencia citas ↔ referencias --- */
  if (citations > 0 && refCount === 0)
    warnings.push(
      `Detectamos ${citations} cita(s) en el texto pero no hay sección de Referencias: APA exige listar toda fuente citada.`
    );
  if (citations === 0 && refCount > 0)
    warnings.push("Hay Referencias pero ninguna cita en el texto: verifica que estés citando todas las fuentes.");
  if (refCount === 0 && wordCount(fullPlain) > 200)
    warnings.push("No se detectó una sección de Referencias. Todo trabajo APA la requiere al final.");
  if (wordCount(fullPlain) > 0 && wordCount(fullPlain) < 60)
    warnings.push("El documento es muy corto: asegúrate de haber pegado el texto completo.");

  /* --- informe --- */
  const report: ReportItem[] = [];
  const fmtCm = (n: number) => String(n).replace(".", ",");

  report.push({ kind: "rule", text: `Márgenes de ${fmtCm(opts.marginCm)} cm en los cuatro lados de la página.` });
  report.push({ kind: "rule", text: `Fuente ${opts.fontFamily} de ${opts.fontPt} pt, permitida por APA 7.` });
  report.push({
    kind: "rule",
    text: `Interlineado ${opts.spacing === 2 ? "doble (2,0)" : "de 1,5"} en todo el documento, sin espacios extra entre párrafos.`,
  });
  report.push({ kind: "rule", text: `Sangría de primera línea de ${fmtCm(opts.indentCm)} cm en cada párrafo.` });
  report.push({ kind: "rule", text: "Alineación a la izquierda, sin justificar (APA 7).", });
  report.push({ kind: "rule", text: "Sangría francesa de 1,27 cm en la lista de referencias.", });
  if (opts.pageNumbers)
    report.push({ kind: "rule", text: "Número de página en la esquina superior derecha desde la portada.", });
  if (opts.titlePage)
    report.push({ kind: "rule", text: "Portada estilo estudiante: título en negrita, autor, afiliación, curso, docente y fecha, centrados.", });

  const paraCount = blocks.filter((b) => b.type === "paragraph").length;
  if (paraCount > 0)
    report.push({ kind: "fix", text: `${paraCount} párrafo${paraCount === 1 ? "" : "s"} con sangría de primera línea aplicada.` });
  if (Object.values(headingLevels).reduce((a, b) => a + b, 0) > 0) {
    const parts = [1, 2, 3, 4, 5]
      .filter((l) => headingLevels[l] > 0)
      .map((l) => `${headingLevels[l]} de Nivel ${l}`);
    report.push({ kind: "fix", text: `Encabezados clasificados y con formato: ${parts.join(", ")}.` });
  }
  if (c.capsFixed > 0)
    report.push({ kind: "fix", text: `${c.capsFixed} título${c.capsFixed === 1 ? "" : "s"} en MAYÚSCULAS sostenidas convertido${c.capsFixed === 1 ? "" : "s"} a tipo oración (APA no usa mayúsculas sostenidas).` });
  if (detectedTitle) report.push({ kind: "fix", text: "Título del documento centrado y en negrita al inicio del texto.", });
  if (c.mdHeadings > 0) report.push({ kind: "fix", text: `${c.mdHeadings} encabezado${c.mdHeadings === 1 ? "" : "s"} Markdown (#) convertido${c.mdHeadings === 1 ? "" : "s"} a niveles APA.` });
  if (c.biblioRenamed) report.push({ kind: "fix", text: 'Sección "Bibliografía" renombrada a "Referencias", el término de APA 7.', });
  if (refCount > 0) {
    report.push({ kind: "fix", text: `${refCount} referencia${refCount === 1 ? "" : "s"} con sangría francesa y cursivas en título o revista.` });
    if (c.refsSorted) report.push({ kind: "fix", text: "Referencias reordenadas alfabéticamente (A → Z).", });
    for (const note of c.refFixNotes.slice(0, 2)) report.push({ kind: "fix", text: note });
  }
  if (c.multiSpaces > 0)
    report.push({ kind: "fix", text: `${c.multiSpaces} secuencia${c.multiSpaces === 1 ? "" : "s"} de espacios dobles reducida${c.multiSpaces === 1 ? "" : "s"} a uno (APA 7: un espacio tras la puntuación).` });
  if (c.tabs > 0) report.push({ kind: "fix", text: `${c.tabs} tabulacione${c.tabs === 1 ? "s reemplazada" : "s reemplazadas"} por sangrías reales.` });
  if (c.parenFixes > 0) report.push({ kind: "fix", text: `${c.parenFixes} espacio${c.parenFixes === 1 ? "" : "s"} corregido${c.parenFixes === 1 ? "" : "s"} en citas parentéticas.` });
  if (c.statItalics > 0)
    report.push({ kind: "fix", text: `${c.statItalics} símbolo${c.statItalics === 1 ? "" : "s"} estadístico${c.statItalics === 1 ? "" : "s"} (p, M, SD, t, F…) en cursiva, como pide APA.` });
  if (c.quotesStripped > 0)
    report.push({ kind: "fix", text: "Cita de 40+ palabras convertida en bloque con sangría propia y sin comillas.", });
  if (c.listItems > 0)
    report.push({ kind: "fix", text: `${c.listItems} elemento${c.listItems === 1 ? "" : "s"} de lista con sangría francesa${c.listsOrdered > 0 ? " (numerada)" : " (con viñetas)"}.` });
  if (blocks.some((b) => b.type === "abstract"))
    report.push({ kind: "fix", text: "Párrafo del Resumen sin sangría, como indica APA 7.", });

  if (c.longParagraphs > 0)
    report.push({ kind: "warn", text: `${c.longParagraphs} párrafo${c.longParagraphs === 1 ? "" : "s"} de más de 250 palabras: APA sugiere un párrafo por idea.` });
  if (c.longHeadings > 0)
    report.push({ kind: "warn", text: `${c.longHeadings} encabezado${c.longHeadings === 1 ? "" : "s"} de más de 14 palabras: conviene hacerlo${c.longHeadings === 1 ? "lo" : "s"} más conciso${c.longHeadings === 1 ? "" : "s"}.` });
  for (const w of warnings) report.push({ kind: "warn", text: w });

  const stats: Stats = {
    words: wordCount(fullPlain),
    paragraphs: paraCount,
    headings: blocks.filter((b) => /^h[1-5]$/.test(b.type) || b.type === "refHeading" || b.type === "title").length,
    references: refCount,
    citations,
    quotes: blocks.filter((b) => b.type === "quote").length,
  };

  return { blocks, report, stats, detectedTitle };
}

/* ---------------- espacios en citas parentéticas ---------------- */
export function fixCitationSpacing(text: string): { text: string; count: number } {
  let count = 0;
  // espacio faltante antes del paréntesis de una cita: "García(2020)" → "García (2020)"
  let out = text.replace(/(\w)\((?=[A-ZÁÉÍÓÚÑ])/g, (_m, w: string) => {
    count++;
    return `${w} (`;
  });
  // espacios de más justo antes o dentro del paréntesis
  out = out.replace(/(\w) {2,}\(/g, (_m, w: string) => {
    count++;
    return `${w} (`;
  });
  out = out.replace(/\(\s{2,}/g, () => {
    count++;
    return "(";
  });
  out = out.replace(/\s{2,}\)/g, () => {
    count++;
    return ")";
  });
  return { text: out, count };
}
