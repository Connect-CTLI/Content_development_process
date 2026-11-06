// Course Draft Sorter: the page. Rules and column positions live in config.js.
(() => {
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const S = CFG.sheet, C = S.rcCols;
const NAME = Object.fromEntries(CFG.types);
const PAL = Object.fromEntries(CFG.palettes.map(([n, p, h]) => [n, { p, h }]));
const TABS = ["Course Description", "Learning Objectives", "Course Structure", "Badging & Certification", "Navigation & Online Learning Tips", "References and additional reading material"];
let model = null, items = [], sheet = null, filled = null, dev = null;

// ---------- set-up fields ----------
$("#pal").innerHTML = '<option value="">Choose a palette</option>' + CFG.palettes.map(([n]) => `<option>${esc(n)}</option>`).join("");
const SETUP = ["ccode", "cname", "pal", "writer", "dces", "due"];
try { const s = JSON.parse(localStorage.getItem("cds-setup") || "{}"); SETUP.forEach(k => { if (s[k]) $("#" + k).value = s[k]; }); } catch (e) {}
SETUP.forEach(k => $("#" + k).addEventListener("input", () => {
  try { localStorage.setItem("cds-setup", JSON.stringify(Object.fromEntries(SETUP.map(x => [x, $("#" + x).value])))); } catch (e) {}
  $("#" + k).classList.remove("missing"); codePreview(); dupCheck(); if (model) render();
}));
function setup() {
  const s = Object.fromEntries(SETUP.map(k => [k, $("#" + k).value.trim()]));
  const code = s.ccode.replace(/\s+/g, ""); const i = code.indexOf("_");
  s.prog = i > 0 ? code.slice(0, i) : code; s.src = i > 0 ? code.slice(i + 1) : "";
  return s;
}
const itemCode = (prog, type, src, el) => `${prog}${type}_${src}.${el}`;
const codeOf = it => { const s = setup(); return itemCode(s.prog || "PROG", it.code, s.src || "Source", it.course ? "CP" : it.ref); };
function codePreview() { const s = setup(); $("#codePreview").textContent = itemCode(s.prog || "LP3", "Text", s.src || "Comp2", "1.2"); }
codePreview();

// ---------- visual examples ----------
function colours() { const p = PAL[$("#pal").value] || { p: "#007DBA", h: "#FFC600" }; return p; }
function gallery() {
  const { p, h } = colours();
  $("#gallery").innerHTML = VISUALS.codes.map(c => `<div class="gal">${VISUALS.svg(c, p, h, "Example of " + (NAME[c] || c))}<b>${esc(c)} · ${esc(NAME[c] || c)}</b><span>${esc(VISUALS.about(c))}</span></div>`).join("");
}
gallery(); $("#pal").addEventListener("change", () => { gallery(); if (model) render(); });

// ---------- loading files ----------
function wireDrop(drop, input, handler) {
  drop.addEventListener("click", () => input.click());
  drop.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
  drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", e => { e.preventDefault(); drop.classList.remove("over"); const f = e.dataTransfer.files[0]; if (f) f.arrayBuffer().then(b => handler(b, f.name)); });
  input.addEventListener("change", () => { const f = input.files[0]; if (f) f.arrayBuffer().then(b => handler(b, f.name)); input.value = ""; });
}
wireDrop($("#dropDoc"), $("#fileDoc"), (b, n) => loadDoc(b, n));
wireDrop($("#dropXls"), $("#fileXls"), (b, n) => loadSheet(b, n));
wireDrop($("#dropDev"), $("#fileDev"), (b, n) => loadDev(b, n));

async function loadDoc(buf, name, isExample) {
  try {
    model = await parseDocx(buf, JSZip, DOMParser); build();
    $("#docName").innerHTML = (isExample ? "Example: " : "✓ ") + esc(name); $("#dropDoc").classList.add("done");
    if (!$("#cname").value && model.title) $("#cname").value = model.title;
    filled = null; setDownloads(); render();
  } catch (e) { console.error(e); $("#docName").textContent = "That file could not be read as a Word document. Save it as .docx and try again."; $("#dropDoc").classList.remove("done"); }
}
async function loadSheet(buf, name) {
  try {
    const wb = await Workbook.load(buf.slice(0));
    if (!wb.has(S.rc)) throw new Error(`There is no "${S.rc}" tab in this workbook.`);
    const rc = await wb.sheet(S.rc); const counts = {};
    for (let r = S.rcFirstRow; r <= Math.max(S.rcLastRow, rc.lastUsedRow()); r++) {
      const k = rc.text(C.programme + r) + "|" + rc.text(C.source + r); if (k !== "|") counts[k] = (counts[k] || 0) + 1;
    }
    const list = async (sheetName, col) => { const d = await wb.sheet(sheetName); if (!d) return []; const out = []; for (let r = 2; r <= 60; r++) { const v = d.text(col + r); if (v) out.push(v); } return out; };
    const progs = await list(S.data, S.dataProgrammes), writers = await list(S.data, S.dataWriters);
    $("#progs").innerHTML = progs.map(p => `<option value="${esc(p)}_">`).join("");
    $("#writers").innerHTML = writers.map(p => `<option value="${esc(p)}">`).join("");
    const bp = await wb.sheet(S.blueprint); const B = S.blueprintCells;
    if (bp) {
      if (!$("#cname").value && bp.text(B.course)) $("#cname").value = bp.text(B.course);
      if (!$("#pal").value && bp.text(B.palette)) { $("#pal").value = bp.text(B.palette); gallery(); }
      if (!$("#dces").value && bp.text(B.dces)) $("#dces").value = bp.text(B.dces);
    }
    const missing = [S.qb, S.snippets, S.projectPlan, S.blueprint].filter(n => !wb.has(n));
    sheet = { buf, name, counts, missing };
    $("#xlsName").textContent = "✓ " + name + (missing.length ? ` (no ${missing.join(", ")} tab${missing.length > 1 ? "s" : ""})` : "");
    $("#dropXls").classList.add("done");
    $("#loadMsg").textContent = missing.includes(S.projectPlan) ? "This is an older T06: the sorter will add a Snippets tab. For the Project Plan tab, use the latest T06 template." : "";
    filled = null; setDownloads(); dupCheck(); if (model) render();
  } catch (e) { console.error(e); $("#xlsName").textContent = "That file could not be read as the Resource Creation Sheet. " + (e.message || ""); $("#dropXls").classList.remove("done"); sheet = null; }
}
$("#sampleBtn").addEventListener("click", sample);
function sample() {
  if (window.SAMPLE_B64) { const bin = atob(window.SAMPLE_B64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return loadDoc(u.buffer, "Example course draft: SMT work planning", true); }
  fetch("examples/sample-course-draft.docx").then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); }).then(b => loadDoc(b, "Example course draft: SMT work planning", true)).catch(() => { $("#loadMsg").textContent = "The example draft is not available here."; });
}
$("#blankBtn").addEventListener("click", () => {
  const go = b => loadSheet(b, "T06_Resource_Creation_Sheet.xlsx");
  if (window.BLANK_T06_B64) { const bin = atob(window.BLANK_T06_B64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return go(u.buffer); }
  fetch("templates/T06_Resource_Creation_Sheet.xlsx").then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); }).then(go).catch(() => { $("#loadMsg").textContent = "The blank template could not be loaded here. Add your own copy of T06 instead."; });
});

// ---------- items ----------
function build() {
  items = intakeRows(model).map((r, i) => {
    const course = r.module === "Course page";
    const it = { id: i, include: true, ref: r.ref, title: r.title, module: r.module, topic: r.topic || (course ? "Course page tabs" : "Module outcomes"),
      text: r.text || "", code: r.code, tool: r.tool, q: r.q || "None", kind: r.kind || (course ? "Course page tab" : "Module outcomes"),
      words: r.words != null ? r.words : (r.text ? r.text.split(/\s+/).length : 0), links: r.links || [],
      flags: r.flags ? r.flags.filter(n => !/^Table: could/.test(n)) : (r.notes ? r.notes.split("\n").filter(Boolean) : []), course };
    if (course) { it.title = r.title; it.text = r.text.split("\n").slice(1).join("\n").trim(); it.words = it.text ? it.text.split(/\s+/).length : 0; }
    return it;
  });
}
function suggestions(it) {
  if (it.course) return [];
  const out = []; const seen = new Set([it.code]);
  CFG.suggestions.forEach(rule => { let ok = false; try { ok = rule.when(it); } catch (e) {} if (ok) rule.suggest.forEach(([c, why]) => { if (!seen.has(c)) { seen.add(c); out.push([c, why]); } }); });
  return out;
}
function render() {
  const live = items.filter(i => i.include);
  const flags = items.reduce((a, i) => a + i.flags.length, 0) + model.modules.reduce((a, x) => a + x.notes.length, 0);
  $("#summary").innerHTML = [["Modules", model.modules.length], ["Rows for Resource Creation", rcItems().length], ["Questions for the Question Bank", live.reduce((a, i) => a + (i.q !== "None" ? questionsFor(i).length : 0), 0)], ["Snippets", live.length], ["Flags to check", flags, "flag"]]
    .map(([l, v, c]) => `<div class="tile ${c || ""}"><b>${v}</b><span>${l}</span></div>`).join("");
  $("#tabs").innerHTML = model.tabs.map(t => `<div class="tabcard"><h4>${esc(t.name)}</h4><p>${esc(t.text.split("\n").slice(1).join("\n") || "Not in the draft")}</p>
    <span class="pill ${t.flag ? (t.text ? "warn" : "bad") : "ok"}">${t.flag ? esc(t.flag) : t.words + " words"}</span></div>`).join("");
  const mods = [...new Set(items.filter(i => !i.course).map(i => i.module))];
  let html = "";
  const ci = items.filter(i => i.course);
  if (ci.length) html += `<details class="mod"><summary>Course page <span class="pill ok">1 row, ${ci.length} tab snippets</span></summary><div class="modbody"><div class="topic">${ci.map(elHtml).join("")}</div></div></details>`;
  html += mods.map((mn, i) => {
    const mo = model.modules.find(x => x.title === mn) || { notes: [] };
    const its = items.filter(x => x.module === mn); const topics = [...new Set(its.map(x => x.topic))];
    return `<details class="mod" ${i === 0 ? "open" : ""}><summary>${esc(mn)} <span class="pill ok">${its.filter(x => x.include).length} resources</span>${mo.notes.length ? `<span class="pill bad">${mo.notes.length} module flag${mo.notes.length > 1 ? "s" : ""}</span>` : ""}</summary>
      <div class="modbody">${mo.notes.length ? `<ul class="notes" style="color:var(--warn-ink)">${mo.notes.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      ${topics.map(t => `<div class="topic"><div class="tt">${esc(t)}</div>${its.filter(x => x.topic === t).map(elHtml).join("")}</div>`).join("")}</div></details>`;
  }).join("");
  $("#mods").innerHTML = html || '<p class="empty">No module headings found. Check that each module title uses Heading 1 and starts with "Module".</p>';
}
function typeSelect(it) { return `<select data-id="${it.id}" class="csel" aria-label="Type for ${esc(it.title)}">${CFG.types.map(([c, n]) => `<option value="${esc(c)}" ${c === it.code ? "selected" : ""}>${esc(c)} · ${esc(n)}</option>`).join("")}</select>`; }
function elHtml(it) {
  const { p, h } = colours(); const sg = suggestions(it);
  return `<div class="el ${it.include ? "" : "off"}">
    <input type="checkbox" class="inc" data-id="${it.id}" ${it.include ? "checked" : ""} aria-label="Include ${esc(it.title)}">
    <span class="code c-${esc(it.code.replace(/[^A-Za-z]/g, ""))}">${esc(it.code)}</span>
    <div style="min-width:0"><div class="t">${esc(it.title)} <span class="k">${esc(it.kind)}${it.q !== "None" ? " · " + esc(it.q) : ""}</span></div>
      <div class="ic">${esc(codeOf(it))}</div>
      ${it.text ? `<div class="x">${esc(it.text)}</div>` : ""}
      ${it.links.length ? `<ul class="notes" style="color:var(--blue)">${it.links.map(l => `<li>${esc((l.label && l.label !== l.url ? l.label + ": " : "") + l.url)}</li>`).join("")}</ul>` : ""}
      ${it.flags.length ? `<ul class="notes">${it.flags.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      ${sg.length ? `<div class="sugg" aria-label="Suggested elements for the developers">${sg.map(([c, why]) => `<div class="sg">${VISUALS.svg(c, p, h, "Example of " + (NAME[c] || c))}<div><b>Suggest ${esc(c)} · ${esc(NAME[c] || c)}</b><span>${esc(why)}</span></div></div>`).join("")}</div>` : ""}</div>
    <div class="side">${it.course ? "" : typeSelect(it)}<span class="w">${it.words || 0} words</span></div></div>`;
}
$("#mods").addEventListener("change", e => {
  const id = +e.target.dataset.id; if (isNaN(id)) return;
  if (e.target.classList.contains("inc")) items[id].include = e.target.checked;
  if (e.target.classList.contains("csel")) items[id].code = e.target.value;
  filled = null; setDownloads(); render();
});

// rows for Resource Creation: the course page is one row; everything else one row each
function rcItems() {
  const live = items.filter(i => i.include); const out = [];
  if (live.some(i => i.course)) out.push({ course: true, code: "ME", ref: "CP", module: "Course page", topic: "Course page tabs", title: "Course page tabs: " + live.filter(i => i.course).map(i => i.title).join(", "), flags: live.filter(i => i.course && i.flags.length).map(i => `${i.title}: ${i.flags.join(", ")}`), links: [], q: "None", kind: "Course page" });
  return out.concat(live.filter(i => !i.course));
}
function questionsFor(it) {
  const lines = it.text.split("\n").map(l => l.replace(/^[•\-–]\s*/, "").trim()).filter(Boolean);
  if (it.q === "Reflection") {
    const qs = lines.filter(l => /\?$/.test(l)); const intro = lines.find(l => !/\?$/.test(l)) || it.title;
    return [{ text: qs.length ? qs.join("\n") : intro, format: "Open text", answer: "—" }];
  }
  const out = []; let cur = null;
  lines.forEach(l => {
    if (/\?$/.test(l)) { cur = { text: l, options: [], format: "Multiple choice", answer: "" }; out.push(cur); }
    else if (cur && /^\(?[a-eA-E][\).:]\s+/.test(l)) cur.options.push(l);
  });
  out.forEach(q => { q.options = q.options.join(" | "); if (!q.options) q.format = "Open text"; });
  return out.length ? out : [{ text: lines.slice(0, 2).join(" ") || it.title, options: "", format: "Multiple choice", answer: "" }];
}

// ---------- same course already in the sheet ----------
function dupCheck() {
  const s = setup(); const n = sheet && s.prog && s.src ? (sheet.counts[s.prog + "|" + s.src] || 0) : 0;
  $("#dupWarn").innerHTML = n ? `<div class="warnbox">The sheet already has ${n} row${n > 1 ? "s" : ""} for ${esc(s.prog)} / ${esc(s.src)}. <label><input type="checkbox" id="replace"> Replace them, with their snippets and questions, when I confirm</label></div>` : "";
}

// ---------- confirm: fill the workbook ----------
$("#confirmBtn").addEventListener("click", confirmFill);
function say(sel, text, bad) { const el = $(sel); el.textContent = text; el.className = "status" + (bad ? " bad" : ""); }
async function confirmFill() {
  const s = setup();
  if (!model) return say("#confirmMsg", "Add a course draft in step 1 first.", true);
  if (!sheet) return say("#confirmMsg", "Add the Resource Creation Sheet in step 1 first (or start from a blank T06).", true);
  if (!s.prog || !s.src) { $("#ccode").classList.add("missing"); $("#ccode").focus(); return say("#confirmMsg", "Fill in the course code as Programme_source, for example LP3_Comp2.", true); }
  const dupes = sheet.counts[s.prog + "|" + s.src] || 0;
  if (dupes && !($("#replace") && $("#replace").checked)) return say("#confirmMsg", "This course code is already in the sheet. Tick Replace, or change the course code.", true);
  say("#confirmMsg", "Filling the sheet…");
  try {
    const wb = await Workbook.load(sheet.buf.slice(0));
    const rc = await wb.sheet(S.rc);
    const lastRc = Math.max(S.rcLastRow, rc.lastUsedRow());
    const valueCols = []; for (let c = 2; c < colNum(C.done); c++) valueCols.push(colName(c));
    const codeRe = new RegExp("^" + s.prog.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[^_]*_" + s.src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\.");
    // 1. Resource Creation
    if (dupes) for (let r = S.rcFirstRow; r <= lastRc; r++) if (rc.text(C.programme + r) === s.prog && rc.text(C.source + r) === s.src) { valueCols.forEach(col => rc.set(col + r, "")); rc.setCached(C.code + r, ""); }
    const rows = rcItems(); const free = [];
    for (let r = S.rcFirstRow; free.length < rows.length; r++) if (rc.rowEmpty(r, [C.programme, C.type, C.source, C.element, C.resource])) free.push(r);
    const preview = [];
    rows.forEach((it, k) => {
      const r = free[k]; const code = itemCode(s.prog, it.code, s.src, it.ref); const sg = suggestions(it);
      const notes = [...it.flags, ...it.links.map(l => (l.label && l.label !== l.url ? l.label + ": " : "") + l.url), sg.length ? "Suggested elements (developers decide): " + sg.map(([c]) => `${c} ${NAME[c] || c}`).join(", ") : ""].filter(Boolean).join("; ");
      const vals = { [C.programme]: s.prog, [C.type]: it.code, [C.source]: s.src, [C.element]: it.ref, [C.resource]: NAME[it.code] || it.code, [C.module]: it.module,
        [C.description]: it.title.replace(/\s*\n\s*/g, " "), [C.palette]: s.pal, [C.status]: S.startStatus, [C.writer]: s.writer, [C.notes]: notes };
      Object.entries(vals).forEach(([col, v]) => rc.set(col + r, v || ""));
      rc.set(C.due + r, s.due || "", s.due ? { date: true } : null);
      if (rc.cellEl(C.code + r, false) && rc.cellEl(C.code + r, false).getElementsByTagNameNS(XL_NS, "f").length) rc.setCached(C.code + r, code); else rc.set(C.code + r, code);
      preview.push({ r, code, it });
    });
    // programme and writer go into the Data lists so the dropdowns accept them
    const data = await wb.sheet(S.data);
    const addTo = (col, v) => { if (!data || !v) return; let empty = 0; for (let r = 2; r <= 60; r++) { const t = data.text(col + r); if (t === v) return; if (!t && !empty) empty = r; } if (empty) data.set(col + empty, v); };
    addTo(S.dataProgrammes, s.prog); addTo(S.dataWriters, s.writer);
    // 2. Question Bank
    let qCount = 0;
    const qb = wb.has(S.qb) ? await wb.sheet(S.qb) : null;
    if (qb) {
      const qLast = qb.lastUsedRow();
      if (dupes) for (let r = S.qbFirstRow; r <= qLast; r++) if (qb.text("B" + r) === s.prog && codeRe.test(qb.text("C" + r))) "ABCDEFGHIJKLMNO".split("").forEach(col => qb.set(col + r, ""));
      let num = 0; for (let r = S.qbFirstRow; r <= qLast; r++) { const v = qb.get("A" + r); if (typeof v === "number") num = Math.max(num, v); }
      let r = S.qbFirstRow;
      rows.filter(it => it.q !== "None").forEach(it => questionsFor(it).forEach(q => {
        while (!qb.rowEmpty(r, ["A", "B", "C", "I"])) r++;
        const vals = { A: ++num, B: s.prog, C: itemCode(s.prog, it.code, s.src, it.ref), D: it.topic, E: it.ref, G: it.q, H: q.format, I: q.text, J: q.options || "", K: q.answer || "" };
        Object.entries(vals).forEach(([col, v]) => qb.set(col + r, v)); qCount++; r++;
      }));
    }
    // 3. Snippets (added as a tab if this T06 does not have one)
    const SNH = ["Item code", "Programme", "Type", "Main source", "Source element", "Module", "Topic", "Resource title", "Snippet (content from the draft)", "Links in the draft", "To check", "Suggested elements (developer decides)", "Words"];
    const sn = wb.has(S.snippets) ? await wb.sheet(S.snippets) : await wb.addSheet(S.snippets, SNH, [20, 10, 8, 12, 11, 24, 24, 28, 70, 30, 30, 34, 7]);
    const snLast = sn.lastUsedRow();
    if (dupes) for (let r = S.snFirstRow; r <= snLast; r++) if (sn.text("B" + r) === s.prog && sn.text("D" + r) === s.src) "BCDEFGHIJKLM".split("").forEach(col => sn.set(col + r, ""));
    let sr = S.snFirstRow, snCount = 0;
    items.filter(i => i.include).forEach(it => {
      while (!sn.rowEmpty(sr, ["B", "E", "H", "I"])) sr++;
      const code = it.course ? "ME" : it.code; const el = it.course ? "CP" : it.ref; const ic = itemCode(s.prog, code, s.src, el);
      const vals = { B: s.prog, C: code, D: s.src, E: el, F: it.module, G: it.topic, H: it.title, I: it.text || "[To write]",
        J: it.links.map(l => (l.label && l.label !== l.url ? l.label + ": " : "") + l.url).join("\n"), K: it.flags.join("\n"),
        L: suggestions(it).map(([c, why]) => `${c} ${NAME[c] || c}: ${why}`).join("\n"), M: it.words || 0 };
      Object.entries(vals).forEach(([col, v]) => sn.set(col + sr, v));
      if (sn.bodyStyle != null) "ABCDEFGHIJKLM".split("").forEach(col => sn.cellEl(col + sr, true).setAttribute("s", sn.bodyStyle));
      const a = sn.cellEl("A" + sr, false);
      if (a && a.getElementsByTagNameNS(XL_NS, "f").length) sn.setCached("A" + sr, ic); else sn.set("A" + sr, ic);
      snCount++; sr++;
    });
    // 4. Design Blueprint course details
    const bp = wb.has(S.blueprint) ? await wb.sheet(S.blueprint) : null; const B = S.blueprintCells;
    if (bp) { if (s.cname) bp.set(B.course, s.cname); bp.set(B.programme, s.prog); if (s.pal) bp.set(B.palette, s.pal); if (s.dces) bp.set(B.dces, s.dces); }
    const blob = await wb.blob();
    filled = { blob, name: sheet.name, rows: preview, qCount, snCount, first: free[0], last: free[free.length - 1], setup: s, hasPlan: wb.has(S.projectPlan), over: free[free.length - 1] > S.rcLastRow };
    // keep working on the filled copy, so confirming again does not add the rows twice
    sheet = { ...sheet, buf: await blob.arrayBuffer(), counts: { ...sheet.counts, [s.prog + "|" + s.src]: rows.length } };
    dupCheck(); setDownloads(); showFilled();
    say("#confirmMsg", `Done: ${rows.length} rows, ${qCount} questions and ${snCount} snippets added. Download the sheet in step 4.`);
    $("#s4").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e) { console.error(e); say("#confirmMsg", "Something went wrong while filling the sheet: " + (e.message || e), true); }
}
function fmtDate(v) { if (typeof v === "number" && v > 20000) { const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000); return d.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }); } if (/^\d{4}-\d\d-\d\d$/.test(v || "")) return fmtDate((Date.UTC(+v.slice(0, 4), +v.slice(5, 7) - 1, +v.slice(8, 10)) - Date.UTC(1899, 11, 30)) / 86400000); return v || ""; }
function showFilled() {
  const f = filled; const s = f.setup;
  $("#doneList").innerHTML = [
    `<b>Resource Creation:</b> ${f.rows.length} rows (rows ${f.first} to ${f.last}), with item codes, palette, writer, status and the PDD QA 1 due date. The developer columns are left for the developers.`,
    `<b>Question Bank:</b> ${f.qCount} question${f.qCount === 1 ? "" : "s"} from the reflections and knowledge checks.`,
    `<b>Snippets:</b> ${f.snCount} snippets of content, matched by programme, main source and source element.`,
    `<b>Design Blueprint:</b> course name, programme, palette and DCES filled in; the resource list builds itself.`,
    f.hasPlan ? `<b>Project Plan:</b> counts, the PDD QA 1 due date and progress fill themselves. Complete the rest at close-out.` : `<b>Project Plan:</b> not in this sheet. Use the latest T06 template to get it.`,
    f.over ? `<b style="color:var(--bad-ink)">Some rows are below row ${S.rcLastRow}, where the dropdowns stop. Extend the dropdowns in Excel if you need them.</b>` : ""
  ].filter(Boolean).map(x => `<li>${x}</li>`).join("");
  $("#preview tbody").innerHTML = f.rows.map(({ r, code, it }) => `<tr><td>${r}</td><td class="ic">${esc(code)}</td><td>${esc(NAME[it.code] || it.code)}</td><td>${esc(it.module)}</td><td class="txt">${esc(it.title.slice(0, 140))}</td><td>${esc(s.pal)}</td><td>${esc(fmtDate(s.due))}</td><td>${esc(s.writer)}</td></tr>`).join("");
}
function setDownloads() {
  $("#dlSheet").disabled = !filled; $("#dlSnips").disabled = !filled; $("#useFilled").disabled = !filled; $("#nextSame").disabled = !filled;
  if (!filled) { $("#doneList").innerHTML = "<li>Nothing filled yet. Confirm in step 3.</li>"; $("#preview tbody").innerHTML = ""; }
}

// ---------- downloads ----------
// inside claude.ai the page asks the viewer to confirm the save; everywhere else (GitHub Pages) it downloads directly
let dlCap = null;
if (window.claude && window.claude.use) window.claude.use("downloads").then(d => { dlCap = d; }).catch(() => {});
async function save(blob, name) {
  if (dlCap) { try { await dlCap.save({ filename: name, data: blob }); } catch (e) { if (e && e.code !== "declined") say("#confirmMsg", "The file could not be saved here: " + (e.message || e.code), true); } return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const safe = s => String(s || "").replace(/[\\/:*?"<>|]+/g, "-").trim();
$("#dlSheet").addEventListener("click", () => filled && save(filled.blob, filled.name.replace(/\.xlsx$/i, "") + ".xlsx"));
$("#dlSnips").addEventListener("click", async () => {
  if (!filled) return; const s = filled.setup; const { p, h } = PAL[s.pal] || {};
  const d = new WordDoc.Doc();
  d.h(1, `Content snippets: ${s.cname || s.ccode}`);
  d.label("Course code", s.ccode); d.label("Colour palette", s.pal ? `${s.pal}${p ? ` (primary ${p}, highlight ${h})` : ""}` : "");
  d.label("Writer (SME)", s.writer); d.label("PDD QA 1 due date", fmtDate(s.due));
  d.p("Each snippet is the content from the course draft for one resource. Item codes match column A of the Resource Creation Sheet. Suggested elements are ideas only: the developers choose what to build in the sheet.", { italic: true, color: "55607E" });
  d.table(["Item code", "Resource", "Module", "Title"], items.filter(i => i.include).map(it => [codeOf(it), it.course ? "Course page tab" : NAME[it.code] || it.code, it.module, it.title]), [2200, 1600, 2500, 3300]);
  items.filter(i => i.include).forEach(it => snippetBlock(d, { code: codeOf(it), resource: it.course ? "Course page tab" : NAME[it.code] || it.code, module: it.module, topic: it.topic, title: it.title, text: it.text, links: it.links.map(l => (l.label && l.label !== l.url ? l.label + ": " : "") + l.url), check: it.flags, sugg: suggestions(it).map(([c, why]) => `${c} ${NAME[c] || c}: ${why}`) }));
  save(await d.blob("Content snippets"), `Snippets_${safe(s.ccode)}.docx`);
});
function snippetBlock(d, sn, level = 2) {
  d.h(level, `${sn.code} · ${sn.title}`);
  d.label("Module", sn.module + (sn.topic && sn.topic !== sn.module ? ` › ${sn.topic}` : ""));
  d.p("Content", { bold: true, color: "007DBA" });
  if (sn.text && sn.text.trim()) d.lines(sn.text); else d.p("[To write]", { italic: true });
  if (sn.links && sn.links.length) { d.p("Links in the draft", { bold: true, color: "007DBA" }); sn.links.forEach(l => d.bullet(l)); }
  if (sn.check && sn.check.length) { d.p("To check", { bold: true, color: "A1271B" }); sn.check.forEach(l => d.bullet(l)); }
  if (sn.sugg && sn.sugg.length) { d.p("Suggested elements (the developer decides)", { bold: true, color: "55607E" }); sn.sugg.forEach(l => d.bullet(l)); }
}

// ---------- developer packs ----------
$("#useFilled").addEventListener("click", async () => filled && loadDev(await filled.blob.arrayBuffer(), filled.name));
async function loadDev(buf, name) {
  try {
    const wb = await Workbook.load(buf.slice(0)); if (!wb.has(S.rc)) throw new Error(`There is no "${S.rc}" tab.`);
    const rc = await wb.sheet(S.rc); const rows = [];
    for (let r = S.rcFirstRow; r <= Math.max(S.rcLastRow, rc.lastUsedRow()); r++) {
      const g = k => rc.get(C[k] + r); const t = k => rc.text(C[k] + r);
      if (!t("programme")) continue;
      rows.push({ r, prog: t("programme"), type: t("type"), src: t("source"), el: t("element"), resource: t("resource"), module: t("module"), desc: t("description"),
        pal: t("palette"), due: g("due"), status: t("status"), notes: t("notes"), vid: t("vid"), tools: t("tools"), vid2: t("vid2"), product: t("product") });
    }
    const snips = {};
    if (wb.has(S.snippets)) {
      const sn = await wb.sheet(S.snippets);
      for (let r = S.snFirstRow; r <= sn.lastUsedRow(); r++) {
        const key = [sn.text("B" + r), sn.text("D" + r), sn.text("E" + r)].join("|"); if (key === "||") continue;
        (snips[key] = snips[key] || []).push({ title: sn.text("H" + r), module: sn.text("F" + r), topic: sn.text("G" + r), text: sn.text("I" + r), links: sn.text("J" + r).split("\n").filter(Boolean), check: sn.text("K" + r).split("\n").filter(Boolean) });
      }
    }
    const bp = wb.has(S.blueprint) ? await wb.sheet(S.blueprint) : null;
    const names = new Set(); rows.forEach(x => [x.vid, x.vid2].forEach(n => n && n.split(/\s*[;,\/&]\s*|\s+and\s+/).filter(Boolean).forEach(v => names.add(v))));
    dev = { buf, name, rows, snips, course: bp ? bp.text(S.blueprintCells.course) : "", hasSnips: wb.has(S.snippets) };
    const list = [...names].sort();
    $("#devSel").innerHTML = list.map(n => `<option>${esc(n)}</option>`).join("") + '<option value="__none">Not assigned yet</option><option value="__all">Everyone (all rows)</option>';
    $("#devSel").disabled = false; $("#dlPack").disabled = false; $("#dlDevSheet").disabled = false;
    $("#devName").textContent = "✓ " + name; $("#dropDev").classList.add("done");
    say("#devMsg", list.length ? `${list.length} developer${list.length > 1 ? "s" : ""} found in the sheet.` : "No developer names yet in the Visual Instructional Designer or VID columns. Ask the developers to choose their elements first.", !list.length);
    if (!dev.hasSnips) say("#devMsg", "This sheet has no Snippets tab, so the packs will have no content. Fill it with the sorter first (step 3).", true);
    devPreview();
  } catch (e) { console.error(e); $("#devName").textContent = "That file could not be read as the Resource Creation Sheet."; }
}
function devRows() {
  const who = $("#devSel").value;
  return dev.rows.filter(x => who === "__all" ? true : who === "__none" ? !x.vid && !x.vid2 : [x.vid, x.vid2].some(n => n && n.split(/\s*[;,\/&]\s*|\s+and\s+/).includes(who)));
}
const rowCode = x => itemCode(x.prog, x.type, x.src, x.el);
const snipsFor = x => dev.snips[[x.prog, x.src, x.el].join("|")] || [];
function devPreview() {
  if (!dev) return; const rows = devRows();
  $("#devPreview tbody").innerHTML = rows.map(x => `<tr><td class="ic">${esc(rowCode(x))}</td><td>${esc(x.resource)}</td><td>${esc(x.module)}</td><td>${esc([x.tools, x.product].filter(Boolean).join(", "))}</td><td>${esc(fmtDate(x.due))}</td><td>${snipsFor(x).length ? "✓" : "None found"}</td></tr>`).join("") || '<tr><td colspan="6">No rows for this developer.</td></tr>';
}
$("#devSel").addEventListener("change", devPreview);
$("#dlPack").addEventListener("click", async () => {
  if (!dev) return; const rows = devRows(); const who = $("#devSel").value;
  const label = who === "__all" ? "All developers" : who === "__none" ? "Not assigned yet" : who;
  const d = new WordDoc.Doc();
  d.h(1, `Content pack: ${label}`);
  if (dev.course) d.label("Course", dev.course);
  const pals = [...new Set(rows.map(x => x.pal).filter(Boolean))];
  d.label("Colour palette", pals.map(n => PAL[n] ? `${n} (primary ${PAL[n].p}, highlight ${PAL[n].h})` : n).join("; "));
  d.label("Elements", String(rows.length));
  d.p("Build the elements assigned to you in the Resource Creation Sheet. Item codes match column A of the sheet. Update the sheet as you work: date received back, product link and status.", { italic: true, color: "55607E" });
  d.table(["Item code", "Resource", "Module", "Tool / product", "Due"], rows.map(x => [rowCode(x), x.resource, x.module, [x.tools, x.product].filter(Boolean).join(", "), fmtDate(x.due)]), [2300, 1700, 2600, 1700, 1300]);
  rows.forEach(x => {
    d.h(2, `${rowCode(x)} · ${x.resource}`);
    d.label("Module", x.module); d.label("Description", x.desc); d.label("Digital tool", x.tools); if (x.product) d.label("Product type", x.product);
    d.label("Due date", fmtDate(x.due)); d.label("Status", x.status); if (x.notes) d.label("Notes", x.notes);
    const sn = snipsFor(x);
    if (!sn.length) d.p("No snippet found for this element in the Snippets tab.", { italic: true, color: "A1271B" });
    sn.forEach(s => {
      if (sn.length > 1) d.h(3, s.title);
      d.p("Content", { bold: true, color: "007DBA" });
      if (s.text) d.lines(s.text); else d.p("[To write]", { italic: true });
      if (s.links.length) { d.p("Links in the draft", { bold: true, color: "007DBA" }); s.links.forEach(l => d.bullet(l)); }
      if (s.check.length) { d.p("To check", { bold: true, color: "A1271B" }); s.check.forEach(l => d.bullet(l)); }
    });
  });
  save(await d.blob("Content pack " + label), `Content_pack_${safe(label).replace(/\s+/g, "_")}.docx`);
});
$("#dlDevSheet").addEventListener("click", () => dev && save(new Blob([dev.buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), dev.name));

// ---------- reset for the next course ----------
function resetSorter(keepSheet) {
  const keep = keepSheet && filled && sheet;
  model = null; items = []; dev = null; filled = null;
  if (!keep) sheet = null;
  const clear = keep ? ["ccode", "cname", "due"] : SETUP;
  clear.forEach(k => { $("#" + k).value = ""; $("#" + k).classList.remove("missing"); });
  try { localStorage.setItem("cds-setup", JSON.stringify(Object.fromEntries(SETUP.map(x => [x, $("#" + x).value])))); } catch (e) {}
  $("#docName").textContent = ""; $("#dropDoc").classList.remove("done");
  if (!keep) { $("#xlsName").textContent = ""; $("#dropXls").classList.remove("done"); $("#progs").innerHTML = ""; $("#writers").innerHTML = ""; }
  else $("#xlsName").textContent = "✓ " + sheet.name + " (with the last course added)";
  $("#summary").innerHTML = ""; $("#tabs").innerHTML = ""; $("#mods").innerHTML = '<p class="empty">Add a course draft in step 1.</p>';
  $("#dupWarn").innerHTML = ""; say("#confirmMsg", ""); setDownloads();
  $("#devName").textContent = ""; $("#dropDev").classList.remove("done");
  $("#devSel").innerHTML = "<option>Add the sheet first</option>"; $("#devSel").disabled = true; $("#dlPack").disabled = true; $("#dlDevSheet").disabled = true;
  say("#devMsg", ""); $("#devPreview tbody").innerHTML = "";
  codePreview(); gallery();
  $("#loadMsg").textContent = keep ? "Ready for the next course: add its draft. New rows go below the last course in the same sheet." : "The sorter is empty. Add a course draft and a sheet to start.";
  $("#s1").scrollIntoView({ behavior: "smooth", block: "start" });
}
// reset asks for a second click, so nothing is lost by accident
function armReset(btn, keepSheet) {
  const label = btn.textContent; let armed = false, t = null;
  btn.addEventListener("click", () => {
    if (!armed && (model || sheet)) { armed = true; btn.textContent = filled ? "Downloaded the sheet? Click again to reset" : "Click again to reset"; t = setTimeout(() => { armed = false; btn.textContent = label; }, 5000); return; }
    clearTimeout(t); armed = false; btn.textContent = label; resetSorter(keepSheet);
  });
}
armReset($("#resetBtn"), false); armReset($("#resetBtn2"), false);
$("#nextSame").addEventListener("click", () => resetSorter(true));

// start with the example draft so the page is never empty
if (!window.NO_SAMPLE) sample();
})();
