import type { Analysis, ApaOptions, Run } from "./apa";
import { downloadBlob, slugify } from "./docxExport";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function runsHtml(runs: Run[]): string {
  return runs
    .map((r) => {
      let s = esc(r.t);
      if (r.i) s = `<em>${s}</em>`;
      if (r.b) s = `<strong>${s}</strong>`;
      return s;
    })
    .join("");
}

/** Genera un archivo .html con el documento ya formateado en APA 7. */
export function exportToHtml(analysis: Analysis, opts: ApaOptions): void {
  const cm = (n: number) => `${String(n).replace(".", ",")} cm`;
  const body: string[] = [];

  if (opts.titlePage) {
    const title = esc((opts.docTitle.trim() || analysis.detectedTitle || "Documento sin título").trim());
    body.push(`<section class="page cover">`);
    body.push(`<div class="cover-inner">`);
    body.push(`<p class="title">${title}</p><p class="blank"></p>`);
    for (const l of [opts.author, opts.affiliation, opts.course, opts.instructor, opts.dueDate]) {
      if (l.trim()) body.push(`<p class="center">${esc(l.trim())}</p>`);
    }
    body.push(`</div></section>`);
  }

  body.push(`<section class="page">`);
  for (const b of analysis.blocks) {
    const inner = runsHtml(b.runs);
    switch (b.type) {
      case "title":
        body.push(`<p class="title">${inner}</p>`);
        break;
      case "h1":
        body.push(`<h1>${inner}</h1>`);
        break;
      case "h2":
        body.push(`<h2>${inner}</h2>`);
        break;
      case "h3":
        body.push(`<h3>${inner}</h3>`);
        break;
      case "h4":
      case "h5":
        body.push(`<p class="inline-h">${inner}.</p>`);
        break;
      case "refHeading":
        body.push(`<h1>${inner}</h1>`);
        break;
      case "abstract":
        body.push(`<p class="no-indent">${inner}</p>`);
        break;
      case "quote":
        body.push(`<p class="quote">${inner}</p>`);
        break;
      case "reference":
        body.push(`<p class="ref">${inner}</p>`);
        break;
      case "list":
        body.push(`<p class="list">${b.ordered ? `${b.n ?? 1}. ` : "• "}${inner}</p>`);
        break;
      case "toc":
        body.push(`<p class="toc">${inner}</p>`);
        break;
      case "annex":
        body.push(`<p>${inner}</p>`);
        break;
      default:
        body.push(`<p>${inner}</p>`);
    }
  }
  body.push(`</section>`);

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${esc(opts.docTitle || analysis.detectedTitle || "Documento APA 7")}</title>
<style>
  @page { size: letter; margin: ${cm(opts.marginCm)}; }
  html { background: #444; }
  body { margin: 0; font-family: "${opts.fontFamily}", "Times New Roman", serif; font-size: ${opts.fontPt}pt; color: #1b1b1b; }
  .page { background: #fdfcf7; max-width: 21.59cm; min-height: 27.94cm; margin: 2rem auto; padding: ${cm(opts.marginCm)}; line-height: ${opts.spacing}; box-shadow: 0 6px 30px rgba(0,0,0,.4); }
  p { margin: 0; text-align: left; text-indent: ${cm(opts.indentCm)}; }
  .no-indent, .title, h1, h2, h3 { text-indent: 0; }
  h1 { text-align: center; font-weight: bold; font-size: ${opts.fontPt}pt; margin: 0; }
  h2 { font-weight: bold; font-size: ${opts.fontPt}pt; margin: 0; }
  h3 { font-weight: bold; font-style: italic; font-size: ${opts.fontPt}pt; margin: 0; }
  .title { text-align: center; font-weight: bold; }
  .inline-h { font-weight: bold; }
  .quote { text-indent: 0; margin-left: ${cm(opts.indentCm)}; }
  .ref { text-indent: -${cm(opts.indentCm)}; padding-left: ${cm(opts.indentCm)}; }
  .list { text-indent: -${cm(opts.indentCm)}; padding-left: ${cm(opts.indentCm)}; }
  .toc { text-indent: 0; font-size: 0.95em; }
  .cover { display: flex; }
  .cover-inner { margin: auto; text-align: center; }
  .center { text-align: center; text-indent: 0; }
  .blank { height: ${opts.fontPt * 2}pt; }
  @media print { html { background: #fff; } .page { box-shadow: none; margin: 0; } }
</style>
</head>
<body>
${body.join("\n")}
<p style="text-align:center;color:#999;font-size:9pt;text-indent:0">Formateado con NORMA⁷ · APA 7ª edición</p>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  downloadBlob(blob, slugify(opts.docTitle || analysis.detectedTitle || "documento") + "-APA7.html");
}
