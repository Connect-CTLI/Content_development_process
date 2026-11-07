// PDD Course Design Hub: builds simple Word documents (.docx) in the browser for snippets and developer packs.
const WordDocLogo = { bytes: null };
const WordDoc = (() => {
  const x = s => String(s == null ? "" : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const hex = c => String(c || "").replace("#", "").toUpperCase();
  function run(text, o = {}) {
    const pr = (o.mono ? '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>' : "") + (o.bold ? "<w:b/>" : "") + (o.italic ? "<w:i/>" : "") + (o.color ? `<w:color w:val="${hex(o.color)}"/>` : "") + (o.size ? `<w:sz w:val="${o.size * 2}"/><w:szCs w:val="${o.size * 2}"/>` : "");
    return String(text).split("\n").map((t, i) => (i ? "<w:r><w:br/></w:r>" : "") + `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ""}<w:t xml:space="preserve">${x(t)}</w:t></w:r>`).join("");
  }
  // the Western Cape Government logo, top left in the page header (set by the page: WordDoc.logo = Uint8Array of a PNG)
  const LOGO_CX = 1872000, LOGO_CY = Math.round(1872000 * 639 / 2317);
  const headerXml = () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:p><w:pPr><w:spacing w:after="120"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${LOGO_CX}" cy="${LOGO_CY}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="1001" name="Western Cape Government logo" descr="Western Cape Government: Education"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="wcg_logo.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${LOGO_CX}" cy="${LOGO_CY}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p></w:hdr>`;
  class Doc {
    constructor() { this.body = []; }
    h(level, text) { this.body.push(`<w:p><w:pPr><w:pStyle w:val="Heading${level}"/></w:pPr>${run(text)}</w:p>`); return this; }
    p(text, o = {}) {
      const ppr = (o.style ? `<w:pStyle w:val="${o.style}"/>` : "") + (o.shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${hex(o.shade)}"/>` : "") + (o.after != null ? `<w:spacing w:after="${o.after}"/>` : "");
      const runs = Array.isArray(text) ? text.map(([t, ro]) => run(t, ro || {})).join("") : run(text, o);
      this.body.push(`<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ""}${runs}</w:p>`); return this;
    }
    bullet(text, o = {}) { return this.p(text, { ...o, style: "ListBullet" }); }
    label(label, value) { return this.p([[label + ": ", { bold: true }], [value || "—", {}]], { after: 40 }); }
    lines(text) {
      String(text || "").split("\n").forEach(l => { const t = l.trim(); if (!t) return; if (/^[•\-–]\s*/.test(t)) this.bullet(t.replace(/^[•\-–]\s*/, "")); else this.p(t); });
      return this;
    }
    table(head, rows, widths) {
      const total = 9600; const n = (head || rows[0] || [""]).length; const w = widths || Array.from({ length: n }, () => Math.floor(total / n));
      const cell = (t, i, isHead) => `<w:tc><w:tcPr><w:tcW w:w="${w[i]}" w:type="dxa"/>${isHead ? '<w:shd w:val="clear" w:color="auto" w:fill="001489"/>' : ""}</w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr>${run(t, isHead ? { bold: true, color: "FFFFFF", size: 9 } : { size: 9 })}</w:p></w:tc>`;
      const tr = (r, isHead) => `<w:tr>${isHead ? '<w:trPr><w:tblHeader/></w:trPr>' : ""}${r.map((t, i) => cell(t, i, isHead)).join("")}</w:tr>`;
      const b = '<w:top w:val="single" w:sz="4" w:color="A6BBC8"/><w:left w:val="single" w:sz="4" w:color="A6BBC8"/><w:bottom w:val="single" w:sz="4" w:color="A6BBC8"/><w:right w:val="single" w:sz="4" w:color="A6BBC8"/><w:insideH w:val="single" w:sz="4" w:color="A6BBC8"/><w:insideV w:val="single" w:sz="4" w:color="A6BBC8"/>';
      this.body.push(`<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/><w:tblBorders>${b}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${w.map(v => `<w:gridCol w:w="${v}"/>`).join("")}</w:tblGrid>${head ? tr(head, true) : ""}${rows.map(r => tr(r)).join("")}</w:tbl>`);
      this.body.push("<w:p/>"); return this;
    }
    pageBreak() { this.body.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>'); return this; }
    async blob(title) {
      const z = new JSZip(); const NF = { createFolders: false }; const logo = WordDocLogo.bytes;
      z.file("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' + (logo ? '<Default Extension="png" ContentType="image/png"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' : "") + '</Types>', NF);
      z.file("_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>', NF);
      z.file("docProps/core.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${x(title || "")}</dc:title><dc:creator>PDD Course Design Hub</dc:creator></cp:coreProperties>`, NF);
      z.file("word/_rels/document.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>' + (logo ? '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>' : "") + '</Relationships>', NF);
      if (logo) {
        z.file("word/header1.xml", headerXml(), NF); z.file("word/media/wcg_logo.png", logo, NF);
        z.file("word/_rels/header1.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/wcg_logo.png"/></Relationships>', NF);
      }
      const font = '<w:rFonts w:ascii="Century Gothic" w:hAnsi="Century Gothic" w:eastAsia="Century Gothic" w:cs="Century Gothic"/>';
      const hs = (n, size, color, before) => `<w:style w:type="paragraph" w:styleId="Heading${n}"><w:name w:val="heading ${n}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="${before}" w:after="120"/><w:outlineLvl w:val="${n - 1}"/></w:pPr><w:rPr><w:b/><w:color w:val="${color}"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr></w:style>`;
      z.file("word/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr>${font}<w:color w:val="14204A"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="en-ZA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>${hs(1, 32, "001489", 0)}${hs(2, 26, "007DBA", 280)}${hs(3, 22, "001489", 200)}<w:style w:type="paragraph" w:styleId="ListBullet"><w:name w:val="List Bullet"/><w:basedOn w:val="Normal"/><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr><w:spacing w:after="60"/><w:ind w:left="360" w:hanging="360"/></w:pPr></w:style><w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>`, NF);
      z.file("word/numbering.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="360" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>', NF);
      z.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${this.body.join("")}<w:sectPr>${logo ? '<w:headerReference w:type="default" r:id="rId3"/>' : ""}<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`, NF);
      return z.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", compression: "DEFLATE" });
    }
  }
  return { Doc };
})();
if (typeof module !== "undefined") module.exports = WordDoc;
