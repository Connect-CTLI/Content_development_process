// PDD Course Design Hub: reads and writes the Resource Creation Sheet (.xlsx) in the browser.
// It edits the workbook's own XML, so styles, dropdowns, formulas and tabs stay exactly as they are.
const XL_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const XL_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

function colNum(col) { let n = 0; for (const ch of col) n = n * 26 + ch.charCodeAt(0) - 64; return n; }
function colName(n) { let s = ""; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
function splitRef(ref) { const m = /^([A-Z]+)(\d+)$/.exec(ref); return { col: m[1], row: +m[2] }; }
function dateSerial(iso) { const [y, m, d] = iso.split("-").map(Number); return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000); }
function serialDate(n) { const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000); return d.toISOString().slice(0, 10); }
const xmlSafe = s => String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "");

class Sheet {
  constructor(wb, name, path, doc) { this.wb = wb; this.name = name; this.path = path; this.doc = doc; this.dirty = false;
    this.data = doc.getElementsByTagNameNS(XL_NS, "sheetData")[0]; this.rows = new Map();
    for (let r = this.data.firstChild; r; r = r.nextSibling) if (r.nodeType === 1 && r.localName === "row") this.rows.set(+r.getAttribute("r"), r); }
  cellEl(ref, create) {
    const { col, row } = splitRef(ref);
    let rowEl = this.rows.get(row);
    if (!rowEl) {
      if (!create) return null;
      rowEl = this.doc.createElementNS(XL_NS, "row"); rowEl.setAttribute("r", row);
      let after = null; for (const [n, el] of this.rows) if (n > row && (!after || n < +after.getAttribute("r"))) after = el;
      this.data.insertBefore(rowEl, after); this.rows.set(row, rowEl);
    }
    let before = null;
    for (let c = rowEl.firstChild; c; c = c.nextSibling) {
      if (c.nodeType !== 1 || c.localName !== "c") continue;
      const r = c.getAttribute("r"); if (r === ref) return c;
      if (!before && colNum(splitRef(r).col) > colNum(col)) before = c;
    }
    if (!create) return null;
    const c = this.doc.createElementNS(XL_NS, "c"); c.setAttribute("r", ref);
    const above = this.cellEl(col + (row - 1), false); if (above && above.getAttribute("s")) c.setAttribute("s", above.getAttribute("s"));
    rowEl.insertBefore(c, before); return c;
  }
  get(ref) {
    const c = this.cellEl(ref, false); if (!c) return "";
    const t = c.getAttribute("t"); const v = c.getElementsByTagNameNS(XL_NS, "v")[0];
    if (t === "inlineStr") return Array.from(c.getElementsByTagNameNS(XL_NS, "t")).map(x => x.textContent).join("");
    if (!v) return "";
    if (t === "s") return this.wb.strings[+v.textContent] || "";
    if (t === "str" || t === "e" || t === "b") return v.textContent;
    return v.textContent === "" ? "" : Number(v.textContent);
  }
  text(ref) { const v = this.get(ref); return v === "" || v == null ? "" : String(v).trim(); }
  clearKids(c) { while (c.firstChild) c.removeChild(c.firstChild); }
  set(ref, val, opts) {
    const c = this.cellEl(ref, true); this.dirty = true;
    if (c.getElementsByTagNameNS(XL_NS, "f").length) return this.setCached(ref, val);
    this.clearKids(c);
    if (val === "" || val == null) { c.removeAttribute("t"); return; }
    if (typeof val === "number" || (opts && opts.date)) {
      c.removeAttribute("t"); const v = this.doc.createElementNS(XL_NS, "v");
      v.textContent = String(opts && opts.date ? dateSerial(val) : val); c.appendChild(v); return;
    }
    c.setAttribute("t", "inlineStr");
    const is = this.doc.createElementNS(XL_NS, "is"); const t = this.doc.createElementNS(XL_NS, "t");
    t.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve");
    t.textContent = xmlSafe(val).slice(0, 32000); is.appendChild(t); c.appendChild(is);
  }
  // write the value a formula shows, so the file reads correctly before it is recalculated
  setCached(ref, val) {
    const c = this.cellEl(ref, false); if (!c) return;
    const f = c.getElementsByTagNameNS(XL_NS, "f")[0]; if (!f) return;
    Array.from(c.childNodes).forEach(n => { if (n !== f) c.removeChild(n); });
    const v = this.doc.createElementNS(XL_NS, "v"); v.textContent = xmlSafe(val); c.appendChild(v);
    if (typeof val === "number") c.removeAttribute("t"); else c.setAttribute("t", "str");
    this.dirty = true;
  }
  rowEmpty(row, cols) { return cols.every(col => this.text(col + row) === ""); }
  lastUsedRow() { let m = 0; for (const n of this.rows.keys()) m = Math.max(m, n); return m; }
}

class Workbook {
  static async load(buf) {
    const wb = new Workbook(); wb.zip = await JSZip.loadAsync(buf); wb.sheets = {}; wb.parser = new DOMParser();
    const read = async p => { const f = wb.zip.file(p); return f ? wb.parser.parseFromString(await f.async("string"), "application/xml") : null; };
    wb.book = await read("xl/workbook.xml");
    if (!wb.book) throw new Error("not a workbook");
    const rels = await read("xl/_rels/workbook.xml.rels"); wb.relsDoc = rels; const target = {};
    Array.from(rels.getElementsByTagName("Relationship")).forEach(r => { target[r.getAttribute("Id")] = r.getAttribute("Target"); });
    wb.sheetList = Array.from(wb.book.getElementsByTagNameNS(XL_NS, "sheet")).map(s => {
      let t = target[s.getAttributeNS(XL_REL, "id") || s.getAttribute("r:id")] || "";
      t = t.startsWith("/") ? t.slice(1) : "xl/" + t; return { name: s.getAttribute("name"), path: t };
    });
    wb.strings = [];
    const ss = await read("xl/sharedStrings.xml");
    if (ss) wb.strings = Array.from(ss.getElementsByTagNameNS(XL_NS, "si")).map(si => {
      const out = []; const walk = n => { for (let k = n.firstChild; k; k = k.nextSibling) { if (k.nodeType !== 1) continue; if (k.localName === "rPh") continue; if (k.localName === "t") out.push(k.textContent); else walk(k); } };
      walk(si); return out.join("");
    });
    wb.read = read; return wb;
  }
  names() { return this.sheetList.map(s => s.name); }
  has(name) { return this.sheetList.some(s => s.name === name); }
  async sheet(name) {
    if (this.sheets[name]) return this.sheets[name];
    const info = this.sheetList.find(s => s.name === name); if (!info) return null;
    const doc = await this.read(info.path);
    return (this.sheets[name] = new Sheet(this, name, info.path, doc));
  }
  // adds a simple sheet at the end of the workbook (used when an older T06 has no Snippets tab)
  async addSheet(name, headers, widths) {
    const n = this.sheetList.length + 1; let i = n; while (this.zip.file(`xl/worksheets/sheet${i}.xml`)) i++;
    const path = `xl/worksheets/sheet${i}.xml`;
    const styles = await this.read("xl/styles.xml");
    const xfIndex = this.addStyles(styles);
    this.zip.file("xl/styles.xml", new XMLSerializer().serializeToString(styles), { createFolders: false });
    const cols = widths.map((w, k) => `<col min="${k + 1}" max="${k + 1}" width="${w}" customWidth="1"/>`).join("");
    const head = headers.map((h, k) => `<c r="${colName(k + 1)}4" s="${xfIndex.head}" t="inlineStr"><is><t>${h.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</t></is></c>`).join("");
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${XL_NS}" xmlns:r="${XL_REL}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData><row r="2"><c r="A2" s="${xfIndex.title}" t="inlineStr"><is><t>${name}</t></is></c></row><row r="4">${head}</row></sheetData><pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/></worksheet>`;
    this.zip.file(path, xml, { createFolders: false });
    const rid = "rIdCds" + i; const rel = this.relsDoc.createElementNS("http://schemas.openxmlformats.org/package/2006/relationships", "Relationship");
    rel.setAttribute("Id", rid); rel.setAttribute("Type", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"); rel.setAttribute("Target", `worksheets/sheet${i}.xml`);
    this.relsDoc.documentElement.appendChild(rel);
    const sheetsEl = this.book.getElementsByTagNameNS(XL_NS, "sheets")[0];
    const ids = Array.from(sheetsEl.getElementsByTagNameNS(XL_NS, "sheet")).map(s => +s.getAttribute("sheetId"));
    const s = this.book.createElementNS(XL_NS, "sheet"); s.setAttribute("name", name); s.setAttribute("sheetId", Math.max(...ids) + 1);
    s.setAttributeNS(XL_REL, "r:id", rid); sheetsEl.appendChild(s);
    const ct = await this.read("[Content_Types].xml"); const o = ct.createElementNS("http://schemas.openxmlformats.org/package/2006/content-types", "Override");
    o.setAttribute("PartName", "/" + path); o.setAttribute("ContentType", "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml");
    ct.documentElement.appendChild(o); this.zip.file("[Content_Types].xml", new XMLSerializer().serializeToString(ct), { createFolders: false });
    this.sheetList.push({ name, path }); this.bookDirty = true;
    const sh = await this.sheet(name); sh.dirty = true; sh.bodyStyle = xfIndex.body; return sh;
  }
  addStyles(doc) {
    const q = (n) => doc.getElementsByTagNameNS(XL_NS, n)[0];
    const add = (parent, xml) => { const el = this.parser.parseFromString(`<x xmlns="${XL_NS}">${xml}</x>`, "application/xml").documentElement.firstChild; parent.appendChild(doc.importNode(el, true)); const c = parent.getElementsByTagNameNS(XL_NS, el.localName).length; parent.setAttribute("count", c); return c - 1; };
    const fonts = q("fonts"), fills = q("fills"), xfs = q("cellXfs"), borders = q("borders");
    const fWhite = add(fonts, '<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Century Gothic"/></font>');
    const fTitle = add(fonts, '<font><b/><sz val="16"/><color rgb="FF001489"/><name val="Century Gothic"/></font>');
    const fBody = add(fonts, '<font><sz val="9.5"/><color rgb="FF001489"/><name val="Century Gothic"/></font>');
    const navy = add(fills, '<fill><patternFill patternType="solid"><fgColor rgb="FF001489"/><bgColor indexed="64"/></patternFill></fill>');
    const bd = add(borders, '<border><left style="thin"><color rgb="FFA6BBC8"/></left><right style="thin"><color rgb="FFA6BBC8"/></right><top style="thin"><color rgb="FFA6BBC8"/></top><bottom style="thin"><color rgb="FFA6BBC8"/></bottom><diagonal/></border>');
    const head = add(xfs, `<xf numFmtId="0" fontId="${fWhite}" fillId="${navy}" borderId="${bd}" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>`);
    const title = add(xfs, `<xf numFmtId="0" fontId="${fTitle}" fillId="0" borderId="0" applyFont="1"/>`);
    const body = add(xfs, `<xf numFmtId="0" fontId="${fBody}" fillId="0" borderId="${bd}" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>`);
    return { head, title, body };
  }
  async blob() {
    const ser = new XMLSerializer();
    for (const sh of Object.values(this.sheets)) if (sh.dirty) this.zip.file(sh.path, ser.serializeToString(sh.doc), { createFolders: false });
    // ask Excel to recalculate every formula when the file opens
    const calc = this.book.getElementsByTagNameNS(XL_NS, "calcPr")[0];
    if (calc) calc.setAttribute("fullCalcOnLoad", "1");
    else { const c = this.book.createElementNS(XL_NS, "calcPr"); c.setAttribute("fullCalcOnLoad", "1"); this.book.documentElement.appendChild(c); }
    this.zip.file("xl/workbook.xml", ser.serializeToString(this.book), { createFolders: false });
    if (this.bookDirty) this.zip.file("xl/_rels/workbook.xml.rels", ser.serializeToString(this.relsDoc), { createFolders: false });
    return this.zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", compression: "DEFLATE" });
  }
}
if (typeof module !== "undefined") module.exports = { Workbook, colNum, colName, dateSerial, serialDate };
