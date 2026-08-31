import type { ApaOptions, Block } from "./apa";
import { plainText } from "./apa";

export interface Page {
  number: number;
  blocks: Block[];
  cover?: boolean;
}

/** Métricas aproximadas de una página tamaño carta (8.5 × 11 in) a 96 dpi. */
export function pageMetrics(opts: ApaOptions) {
  const marginIn = opts.marginCm / 2.54;
  const pageWPx = 8.5 * 96; // 816
  const pageHPx = 11 * 96; // 1056
  const contentWPx = (8.5 - marginIn * 2) * 96;
  const contentHPx = (11 - marginIn * 2) * 96;
  const fontPx = opts.fontPt * (96 / 72);
  const charW = fontPx * 0.47; // ancho medio de carácter en Times
  const charsPerLine = Math.max(20, Math.floor(contentWPx / charW));
  const lineH = fontPx * 1.15 * opts.spacing;
  const linesPerPage = Math.max(8, Math.floor(contentHPx / lineH));
  return { pageWPx, pageHPx, contentWPx, contentHPx, fontPx, charsPerLine, lineH, linesPerPage, marginPx: marginIn * 96 };
}

function blockLines(block: Block, cpl: number): number {
  const text = plainText(block.runs);
  let lines = Math.max(1, Math.ceil(text.length / cpl));
  if (block.type === "h1" || block.type === "h2" || block.type === "h3" || block.type === "refHeading") lines += 1;
  if (block.type === "h4" || block.type === "h5") lines = 1;
  if (block.type === "title") lines += 2;
  return lines;
}

/** Distribuye los bloques en páginas, partiendo párrafos largos si hace falta. */
export function paginate(blocks: Block[], opts: ApaOptions): Page[] {
  const m = pageMetrics(opts);
  const pages: Page[] = [];
  let current: Block[] = [];
  let used = 0;

  const flush = () => {
    if (current.length > 0 || pages.length === 0) {
      pages.push({ number: pages.length + 1, blocks: current });
      current = [];
      used = 0;
    }
  };

  for (const block of blocks) {
    let need = blockLines(block, m.charsPerLine);

    if (need > m.linesPerPage) {
      // partir el texto del bloque en fragmentos del tamaño de una página
      const full = plainText(block.runs);
      let start = 0;
      let firstChunk = true;
      while (start < full.length) {
        const capacity = m.linesPerPage - (used > 0 ? used : 0) - 1;
        const take = Math.max(m.charsPerLine, capacity * m.charsPerLine);
        let cut = Math.min(start + take, full.length);
        if (cut < full.length) {
          const space = full.lastIndexOf(" ", cut);
          if (space > start) cut = space + 1;
        }
        const chunkText = full.slice(start, cut);
        const fits = Math.ceil(chunkText.length / m.charsPerLine);
        if (used + fits > m.linesPerPage && used > 0) {
          flush();
        }
        current.push({
          type: block.type === "quote" ? "quote" : "paragraph",
          runs: [{ t: chunkText }],
          cont: !firstChunk,
        });
        used += Math.ceil(chunkText.length / m.charsPerLine);
        start = cut;
        firstChunk = false;
      }
      continue;
    }

    if (used + need > m.linesPerPage && used > 0) {
      flush();
    }
    current.push(block);
    used += need;
  }

  if (current.length > 0) pages.push({ number: pages.length + 1, blocks: current });
  if (pages.length === 0) pages.push({ number: 1, blocks: [] });

  // renumerar teniendo en cuenta la portada
  const offset = opts.titlePage ? 1 : 0;
  return pages.map((p, i) => ({ ...p, number: i + 1 + offset }));
}
