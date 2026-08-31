import type { Analysis, ApaOptions, Block, Run } from "./apa";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function slugify(s: string): string {
  const out = s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return out || "documento";
}

function toRuns(runs: Run[], extra?: { bold?: boolean; italic?: boolean }) {
  // se importan en caliente para no engordar el bundle inicial
  return runs.map((r) => ({
    text: r.t,
    italics: r.i || extra?.italic || undefined,
    bold: r.b || extra?.bold || undefined,
  }));
}

/** Genera el .docx con formato APA 7 aplicado. */
export async function exportToDocx(analysis: Analysis, opts: ApaOptions): Promise<void> {
  const docx = await import("docx");
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Header,
    AlignmentType,
    PageNumber,
    LineRuleType,
    TabStopType,
    PageBreak,
  } = docx;

  const marginTwip = Math.round(opts.marginCm * 567); // 1 cm ≈ 567 twips
  const indentTwip = Math.round(opts.indentCm * 567);
  const line = opts.spacing === 2 ? 480 : 360; // en 240avos de línea
  const spacing = { line, lineRule: LineRuleType.AUTO as typeof LineRuleType.AUTO, before: 0, after: 0 };

  const mk = (
    runs: Run[],
    o: {
      align?: (typeof AlignmentType)[keyof typeof AlignmentType];
      bold?: boolean;
      italic?: boolean;
      firstLine?: boolean;
      left?: boolean;
      hanging?: boolean;
      pageBreakBefore?: boolean;
    } = {}
  ) =>
    new Paragraph({
      alignment: o.align,
      pageBreakBefore: o.pageBreakBefore,
      indent: o.hanging
        ? { left: indentTwip, hanging: indentTwip }
        : o.left
          ? { left: indentTwip }
          : o.firstLine
            ? { firstLine: indentTwip }
            : undefined,
      spacing,
      children: toRuns(runs, { bold: o.bold, italic: o.italic }).map(
        (r) => new TextRun({ text: r.text, italics: r.italics, bold: r.bold })
      ),
    });

  const children: InstanceType<typeof Paragraph>[] = [];

  /* portada estilo estudiante */
  if (opts.titlePage) {
    const coverTitle = (opts.docTitle.trim() || analysis.detectedTitle || "Documento sin título").trim();
    for (let i = 0; i < 4; i++) children.push(new Paragraph({ spacing, children: [] }));
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing,
        children: [new TextRun({ text: coverTitle, bold: true })],
      })
    );
    children.push(new Paragraph({ spacing, children: [] }));
    const lines = [opts.author, opts.affiliation, opts.course, opts.instructor, opts.dueDate].filter((l) => l.trim());
    for (const l of lines) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing,
          children: [new TextRun({ text: l.trim() })],
        })
      );
    }
    children.push(new Paragraph({ spacing, children: [new PageBreak()] }));
  }

  /* cuerpo del documento */
  for (const b of analysis.blocks) {
    switch (b.type) {
      case "title":
        children.push(mk(b.runs, { align: AlignmentType.CENTER, bold: true }));
        break;
      case "h1":
        children.push(mk(b.runs, { align: AlignmentType.CENTER, bold: true }));
        break;
      case "h2":
        children.push(mk(b.runs, { bold: true }));
        break;
      case "h3":
        children.push(mk(b.runs, { bold: true, italic: true }));
        break;
      case "h4":
        children.push(mk(b.runs, { bold: true, firstLine: true }));
        break;
      case "h5":
        children.push(mk(b.runs, { bold: true, italic: true, firstLine: true }));
        break;
      case "refHeading":
        children.push(mk([{ t: "Referencias" }], { align: AlignmentType.CENTER, bold: true }));
        break;
      case "abstract":
        children.push(mk(b.runs));
        break;
      case "quote":
        children.push(mk(b.runs, { left: true }));
        break;
      case "reference":
        children.push(mk(b.runs, { hanging: true }));
        break;
      case "list":
        children.push(
          mk(
            [{ t: b.ordered ? `${b.n ?? 1}. ` : "• " }, ...b.runs],
            { hanging: true }
          )
        );
        break;
      default:
        children.push(mk(b.runs, { firstLine: !b.cont }));
    }
  }

  const headerChildren = () => {
    const rightTab = 12240 - marginTwip * 2;
    const runs: InstanceType<typeof TextRun>[] = [];
    if (opts.runningHead.trim()) runs.push(new TextRun({ text: opts.runningHead.trim().toUpperCase().slice(0, 50) }));
    runs.push(new TextRun({ children: [opts.runningHead.trim() ? "\t" : "", PageNumber.CURRENT] }));
    return [
      new Paragraph({
        alignment: opts.runningHead.trim() ? AlignmentType.LEFT : AlignmentType.RIGHT,
        tabStops: opts.runningHead.trim() ? [{ type: TabStopType.RIGHT, position: rightTab }] : undefined,
        children: runs,
      }),
    ];
  };

  const doc = new Document({
    creator: "NORMA⁷",
    title: opts.docTitle || analysis.detectedTitle || "Documento APA 7",
    description: "Documento formateado según normas APA 7ª edición",
    styles: {
      default: {
        document: {
          run: { font: opts.fontFamily, size: opts.fontPt * 2 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: marginTwip, right: marginTwip, bottom: marginTwip, left: marginTwip },
            size: { width: 12240, height: 15840 },
          },
        },
        headers: opts.pageNumbers ? { default: new Header({ children: headerChildren() }) } : undefined,
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const name = slugify(opts.docTitle || analysis.detectedTitle || "documento") + "-APA7.docx";
  downloadBlob(blob, name);
}
