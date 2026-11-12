// CTLI Design Hub: the page. Rules and column positions live in config.js.
(() => {
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const S = CFG.sheet;
let C = S.rcCols; // Resource Creation columns, found by heading for each sheet (see rcMap)
const NAME = Object.fromEntries(CFG.types);
const PAL = Object.fromEntries(CFG.palettes.map(([n, p, h]) => [n, { p, h }]));
const TABS = ["Course Description", "Learning Objectives", "Course Structure", "Badging & Certification", "Navigation & Online Learning Tips", "References and additional reading material"];
let model = null, items = [], sheet = null, filled = null, dev = null;

// ---------- tabs: steps 1–4, 5–7 and 8–9 ----------
function showTab(id, scroll) {
  document.querySelectorAll(".tabpanel").forEach(p => { p.hidden = p.id !== id; });
  document.querySelectorAll(".tabbar [role=tab]").forEach(b => { const on = b.dataset.tab === id; b.setAttribute("aria-selected", on); b.tabIndex = on ? 0 : -1; });
  try { localStorage.setItem("pddHubTab", id); } catch (e) {}
  if (scroll) document.querySelector(".tabbar").scrollIntoView({ behavior: "smooth", block: "start" });
}
// opens the tab a step is in, then scrolls to it
function goStep(sel) { const el = $(sel); const p = el && el.closest(".tabpanel"); if (p && p.hidden) showTab(p.id); if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 30); }
document.querySelectorAll(".tabbar [role=tab]").forEach(b => b.addEventListener("click", () => showTab(b.dataset.tab, true)));
document.querySelector(".tabbar").addEventListener("keydown", e => {
  if (!/^Arrow(Left|Right)$/.test(e.key)) return; const bs = [...document.querySelectorAll(".tabbar [role=tab]")];
  const i = bs.indexOf(document.activeElement); if (i < 0) return; const n = bs[(i + (e.key === "ArrowRight" ? 1 : bs.length - 1)) % bs.length]; n.focus(); showTab(n.dataset.tab);
});
document.querySelectorAll("[data-goto]").forEach(b => b.addEventListener("click", () => showTab(b.dataset.goto, true)));
// a link can open a tab directly: …/#draft, …/#sheet or …/#claims (otherwise the tab used last)
const TAB_HASH = { draft: "tabA", review: "tabA", sheet: "tabB", build: "tabB", claims: "tabC", timesheets: "tabC", developers: "tabC" };
(() => { let t = "tabA"; try { t = localStorage.getItem("pddHubTab") || t; } catch (e) {} const h = TAB_HASH[location.hash.slice(1).toLowerCase()]; if (h) t = h; showTab(document.getElementById(t) ? t : "tabA"); })();
window.addEventListener("hashchange", () => { const h = TAB_HASH[location.hash.slice(1).toLowerCase()]; if (h) showTab(h, true); });

// find each Resource Creation column by its heading in row 2, so older and newer sheets both work
function rcMap(rc) {
  const heads = []; for (let c = 1; c <= 90; c++) heads.push([colName(c), rc.text(colName(c) + S.rcHeaderRow)]);
  const m = {}; const taken = new Set();
  Object.entries(S.rcHeaders).forEach(([k, re]) => { const hit = heads.find(([col, h]) => h && re.test(h) && !taken.has(col)); if (hit) { m[k] = hit[0]; if (k === "vid") taken.add(hit[0]); } });
  return Object.keys(m).length >= 6 ? m : { ...S.rcCols };
}

// ---------- programme team: units, co-ordinators and people ----------
const TEAMS_KEY = "cds-teams";
const copyOf = o => JSON.parse(JSON.stringify(o));
let teams = (() => { try { const t = JSON.parse(localStorage.getItem(TEAMS_KEY)); if (t && t.units && t.people) return t; } catch (e) {} return copyOf(CFG.teams); })();
const PEOPLE = ["writers", "developers", "pdd", "qa"];
PEOPLE.forEach(k => { teams.people[k] = teams.people[k] || []; });
const uniq = arr => { const seen = new Set(); return arr.map(x => String(x || "").trim()).filter(x => x && !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase())); };
function saveTeams() { try { localStorage.setItem(TEAMS_KEY, JSON.stringify(teams)); } catch (e) {} }
function teamSelects() {
  const u = $("#unit").value || savedSetup.unit || "", c = $("#coord").value || savedSetup.coord || "";
  $("#unit").innerHTML = '<option value="">Choose a unit</option>' + teams.units.map(x => `<option>${esc(x.name)}</option>`).join("");
  if (teams.units.some(x => x.name === u)) $("#unit").value = u;
  const unit = teams.units.find(x => x.name === $("#unit").value);
  $("#coord").innerHTML = '<option value="">' + (unit ? "Choose a co-ordinator" : "Choose a unit first") + "</option>" + (unit ? unit.coordinators.map(n => `<option>${esc(n)}</option>`).join("") : "");
  if (unit && unit.coordinators.includes(c)) $("#coord").value = c;
  $("#writers").innerHTML = teams.people.writers.map(p => `<option value="${esc(p)}">`).join("");
}
function teamEditor() {
  $("#unitsEd").innerHTML = teams.units.map((u, i) => `<div class="unit-card"><label class="small-note" style="margin:0">Unit <input class="un" data-i="${i}" value="${esc(u.name)}" aria-label="Unit name"></label>
    <label class="small-note" style="margin:0">Programme Co-ordinators, one per line <textarea class="uc" data-i="${i}" aria-label="Co-ordinators for ${esc(u.name)}">${esc(u.coordinators.join("\n"))}</textarea></label>
    <button class="rm reset" data-i="${i}">Remove this unit</button></div>`).join("");
  $("#peopleTxt").value = teams.people[$("#peopleSel").value].join("\n");
}
$("#unitsEd").addEventListener("input", e => {
  const i = +e.target.dataset.i; if (isNaN(i)) return;
  if (e.target.classList.contains("un")) teams.units[i].name = e.target.value;
  if (e.target.classList.contains("uc")) teams.units[i].coordinators = e.target.value.split("\n");
  $("#teamMsg").textContent = "Not saved yet";
});
$("#unitsEd").addEventListener("click", e => { const b = e.target.closest(".rm"); if (!b) return; teams.units.splice(+b.dataset.i, 1); teamEditor(); $("#teamMsg").textContent = "Not saved yet"; });
$("#addUnit").addEventListener("click", () => { teams.units.push({ name: "", coordinators: [] }); teamEditor(); const n = document.querySelectorAll(".un"); n[n.length - 1].focus(); });
$("#peopleSel").addEventListener("change", () => { $("#peopleTxt").value = teams.people[$("#peopleSel").value].join("\n"); });
$("#peopleTxt").addEventListener("input", () => { teams.people[$("#peopleSel").value] = $("#peopleTxt").value.split("\n"); $("#teamMsg").textContent = "Not saved yet"; });
function tidyTeams() {
  teams.units = teams.units.map(u => ({ name: String(u.name || "").trim(), coordinators: uniq(u.coordinators) })).filter(u => u.name);
  PEOPLE.forEach(k => { teams.people[k] = uniq(teams.people[k]); });
}
$("#saveTeams").addEventListener("click", () => { tidyTeams(); saveTeams(); teamEditor(); teamSelects(); $("#teamMsg").textContent = "Saved. The lists go into every sheet the Hub fills or downloads."; });
$("#resetTeams").addEventListener("click", () => { teams = copyOf(CFG.teams); saveTeams(); teamEditor(); teamSelects(); $("#teamMsg").textContent = "Back to the starting lists."; });
$("#copyTeams").addEventListener("click", async () => {
  tidyTeams();
  const txt = "teams: " + JSON.stringify({ units: teams.units, people: teams.people }, null, 2).replace(/"(\w+)":/g, "$1:") + ",";
  const out = $("#teamsOut"); out.hidden = false; out.value = txt; out.focus(); out.select();
  try { await navigator.clipboard.writeText(txt); $("#teamMsg").textContent = "Copied. On GitHub, open index.html, find teams: and replace that block with this text."; }
  catch (e) { $("#teamMsg").textContent = "Press Ctrl+C to copy the selected text, then paste it over teams: in the settings on GitHub."; }
});
// names already in a sheet's Data tab join the lists, so nobody is lost
async function teamsFromSheet(wb) {
  const d = await wb.sheet(S.data); if (!d) return;
  let added = 0;
  Object.entries(S.dataLists).forEach(([k, col]) => { for (let r = 2; r <= 60; r++) { const v = d.text(col + r); if (v && !teams.people[k].some(x => x.toLowerCase() === v.toLowerCase())) { teams.people[k].push(v); added++; } } });
  for (let c = colNum(S.dataUnits.firstCol); c <= colNum(S.dataUnits.lastCol); c++) {
    const name = d.text(colName(c) + 1); if (!name) continue;
    let u = teams.units.find(x => x.name.toLowerCase() === name.toLowerCase()); if (!u) { u = { name, coordinators: [] }; teams.units.push(u); added++; }
    for (let r = 2; r <= S.dataUnits.lastRow; r++) { const v = d.text(colName(c) + r); if (v && !u.coordinators.includes(v)) { u.coordinators.push(v); added++; } }
  }
  if (added) { saveTeams(); teamEditor(); teamSelects(); }
}
// writes the lists into a sheet's Data tab so its dropdowns match the dashboard
async function teamsToSheet(wb) {
  const d = await wb.sheet(S.data); if (!d) return;
  tidyTeams();
  const put = (ref, v) => { if (v || d.cellEl(ref, false)) d.set(ref, v || ""); };
  Object.entries(S.dataLists).forEach(([k, col]) => { for (let r = 2; r <= 60; r++) put(col + r, teams.people[k][r - 2]); });
  const first = colNum(S.dataUnits.firstCol), last = colNum(S.dataUnits.lastCol);
  for (let c = first; c <= last; c++) {
    const u = teams.units[c - first];
    put(colName(c) + 1, u ? u.name : "");
    for (let r = 2; r <= S.dataUnits.lastRow; r++) put(colName(c) + r, u ? u.coordinators[r - 2] : "");
  }
}

// ---------- set-up fields ----------
$("#pal").innerHTML = '<option value="">Choose a palette</option>' + CFG.palettes.map(([n]) => `<option>${esc(n)}</option>`).join("");
const SETUP = ["unit", "coord", "ccode", "cname", "pal", "writer", "dces", "due"];
let savedSetup = {};
try { savedSetup = JSON.parse(localStorage.getItem("cds-setup") || "{}"); } catch (e) {}
teamSelects(); teamEditor();
SETUP.forEach(k => { if (savedSetup[k] && !["unit", "coord"].includes(k)) $("#" + k).value = savedSetup[k]; });
function storeSetup() { try { localStorage.setItem("cds-setup", JSON.stringify(Object.fromEntries(SETUP.map(x => [x, $("#" + x).value])))); } catch (e) {} }
SETUP.forEach(k => ["input", "change"].forEach(ev => $("#" + k).addEventListener(ev, () => {
  if (k === "unit" && ev === "change") { savedSetup.coord = ""; teamSelects(); }
  savedSetup[k] = $("#" + k).value; storeSetup();
  $("#" + k).classList.remove("missing"); codePreview(); dupCheck(); if (model && ev === "input") render();
})));
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
function gallery() { $("#visPal").textContent = $("#pal").value || CFG.palettes[0][0]; }
// a page with every element type in the chosen palette (step 6), to share with the developers or print to PDF
function visualsPage() {
  const name = $("#pal").value || CFG.palettes[0][0]; const { p, h } = colours();
  const cards = VISUALS.codes.map(c => `<figure>${VISUALS.svg(c, p, h, "Example of " + (NAME[c] || c))}<figcaption><b>${esc(c)} · ${esc(NAME[c] || c)}</b><span>${esc(VISUALS.about(c))}</span></figcaption></figure>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Visual examples · ${esc(name)}</title>
<style>body{font-family:"Century Gothic",Questrial,"Avenir Next",Arial,sans-serif;color:#14204a;margin:0;padding:24px 16px;background:#fff}main{max-width:1100px;margin:0 auto}
h1{font-size:24px;margin:0 0 4px;color:#001489}p{margin:0 0 16px;color:#55607e}.sw{display:inline-block;width:18px;height:18px;border-radius:4px;vertical-align:-3px;margin-right:4px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}figure{margin:0;border:1px solid #d7dee8;border-radius:12px;padding:10px;break-inside:avoid}
figure svg{width:100%;height:auto;display:block;border-radius:8px}figcaption b{display:block;font-size:14px;margin-top:8px}figcaption span{font-size:12.5px;color:#55607e}
@media print{body{padding:0}.grid{grid-template-columns:repeat(3,1fr)}}</style></head><body><main>
<p style="font-size:12px;font-weight:700;color:#007dba;letter-spacing:.04em">CTLI • PROGRAMME DESIGN &amp; DEVELOPMENT · CTLI DESIGN HUB</p>
<h1>Visual examples of the elements developers can choose</h1>
<p><span class="sw" style="background:${p}"></span><span class="sw" style="background:${h}"></span>${esc(name)} palette. Developers choose what to build in the Resource Creation Sheet; these show what each element can look like. Build from the Canva master templates (T07).</p>
<div class="grid">${cards}</div></main></body></html>`;
}
gallery(); $("#pal").addEventListener("change", () => { gallery(); tplStrip(); if (model) render(); });
// the visual examples as an A4 PDF, WCG Education logo top left (jsPDF loads only when needed)
const loadScript = src => new Promise((ok, no) => { if ([...document.scripts].some(s => s.src === src)) return ok(); const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error("could not load " + src)); document.head.appendChild(s); });
const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
async function visualsPdf() {
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  try { await document.fonts.ready; } catch (e) {}
  const name = $("#pal").value || CFG.palettes[0][0]; const { p, h } = colours();
  const logoEl = document.querySelector(".wcg-logo"); const logo = await loadImg(window.LOGO_DATA || (logoEl && logoEl.src)).catch(() => null);
  const pics = await Promise.all(VISUALS.codes.map(c => loadImg("data:image/svg+xml;charset=utf-8," + encodeURIComponent(VISUALS.svg(c, p, h, esc("Example of " + (NAME[c] || c))))).catch(() => null)));
  const { jsPDF } = window.jspdf; const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const W = 210, H = 297, K = 6, M = 12, cols = 3, gap = 6, cw = (W - 2 * M - gap * (cols - 1)) / cols, ih = cw * 76 / 120;
  const FONT = '"Century Gothic", Questrial, "Avenir Next", Arial, sans-serif';
  const wrap = (ctx, text, max) => { const out = []; let line = ""; String(text).split(/\s+/).forEach(w => { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > max && line) { out.push(line); line = w; } else line = t; }); if (line) out.push(line); return out; };
  let page = 0, ctx = null, cv = null, y = 0;
  const startPage = () => {
    cv = document.createElement("canvas"); cv.width = W * K; cv.height = H * K; ctx = cv.getContext("2d"); ctx.scale(K, K);
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
    if (logo) { const lh = 13, lw = lh * logo.width / logo.height; ctx.drawImage(logo, M, 9, lw, lh); }
    ctx.fillStyle = "#007DBA"; ctx.font = `bold 2.6px ${FONT}`; ctx.textAlign = "right"; ctx.fillText("CTLI • PROGRAMME DESIGN & DEVELOPMENT", W - M, 13); ctx.fillText("CTLI DESIGN HUB", W - M, 16.5); ctx.textAlign = "left";
    ctx.strokeStyle = "#d7dee8"; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.moveTo(M, 26); ctx.lineTo(W - M, 26); ctx.stroke();
    y = 33;
    if (page === 0) {
      ctx.fillStyle = "#001489"; ctx.font = `bold 6.2px ${FONT}`; ctx.fillText("Visual examples of the elements developers can choose", M, y); y += 7;
      ctx.fillStyle = p; ctx.fillRect(M, y - 3.2, 4, 4); ctx.fillStyle = h; ctx.fillRect(M + 5, y - 3.2, 4, 4);
      ctx.fillStyle = "#14204a"; ctx.font = `bold 3.4px ${FONT}`; ctx.fillText(`${name} palette`, M + 11, y); y += 5.5;
      ctx.fillStyle = "#55607e"; ctx.font = `3px ${FONT}`;
      wrap(ctx, "Developers choose what to build in the Resource Creation Sheet; these show what each element can look like in this palette. Build from the Canva master templates (T07).", W - 2 * M).forEach(l => { ctx.fillText(l, M, y); y += 4.2; });
      y += 3;
    }
    page++;
  };
  const endPage = () => { ctx.fillStyle = "#8a96a8"; ctx.font = `2.6px ${FONT}`; ctx.textAlign = "right"; ctx.fillText(`Page ${page}`, W - M, H - 8); ctx.textAlign = "left"; ctx.fillText(`Visual examples · ${name}`, M, H - 8);
    if (page > 1) pdf.addPage(); pdf.addImage(cv.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, W, H); };
  startPage();
  const cardH = c => { ctx.font = `3px ${FONT}`; return ih + 4 + 4.5 + wrap(ctx, VISUALS.about(c), cw - 4).slice(0, 4).length * 3.8 + 4; };
  for (let i = 0; i < VISUALS.codes.length; i += cols) {
    const row = VISUALS.codes.slice(i, i + cols); const rh = Math.max(...row.map(cardH));
    if (y + rh > H - 14) { endPage(); startPage(); }
    row.forEach((c, k) => {
      const x = M + k * (cw + gap);
      ctx.strokeStyle = "#d7dee8"; ctx.lineWidth = 0.3; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, cw, rh - 2, 2.5); else ctx.rect(x, y, cw, rh - 2); ctx.stroke();
      const pic = pics[VISUALS.codes.indexOf(c)]; if (pic) ctx.drawImage(pic, x + 2, y + 2, cw - 4, ih - 2);
      let ty = y + ih + 4.5; ctx.fillStyle = "#14204a"; ctx.font = `bold 3.3px ${FONT}`; ctx.fillText(`${c} · ${NAME[c] || c}`, x + 2, ty); ty += 4.5;
      ctx.fillStyle = "#55607e"; ctx.font = `3px ${FONT}`; wrap(ctx, VISUALS.about(c), cw - 4).slice(0, 4).forEach(l => { ctx.fillText(l, x + 2, ty); ty += 3.8; });
    });
    y += rh + 2;
  }
  endPage();
  return pdf.output("blob");
}
$("#dlVisuals").addEventListener("click", async () => {
  const name = $("#pal").value || CFG.palettes[0][0]; const b = $("#dlVisuals"); const was = b.textContent; b.disabled = true; b.textContent = "Making the PDF…";
  try { save(await visualsPdf(), `CTLI_Visual_examples_${safe(name.split(/\s+/)[0])}.pdf`, "B"); }
  catch (e) { console.error(e); save(new Blob([visualsPage()], { type: "text/html" }), `CTLI_Visual_examples_${safe(name.split(/\s+/)[0])}.html`, "B"); }
  finally { b.disabled = false; b.textContent = was; }
});

// ---------- loading files ----------
function wireDrop(drop, input, handler) {
  drop.addEventListener("click", () => input.click());
  drop.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
  drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", e => { e.preventDefault(); drop.classList.remove("over"); const f = e.dataTransfer.files[0]; if (f) f.arrayBuffer().then(b => handler(b, f.name)); });
  input.addEventListener("change", () => { const f = input.files[0]; if (f) f.arrayBuffer().then(b => handler(b, f.name)); input.value = ""; });
}
wireDrop($("#dropOrig"), $("#fileOrig"), (b, n) => loadOriginal(b, n));
wireDrop($("#dropDoc"), $("#fileDoc"), (b, n) => loadDoc(b, n));
wireDrop($("#dropXls"), $("#fileXls"), (b, n) => loadSheet(b, n));
wireDrop($("#dropDev"), $("#fileDev"), (b, n) => loadDev(b, n));

async function loadDoc(buf, name, isExample) {
  try {
    model = await parseDocx(buf, JSZip, DOMParser); build();
    $("#docName").innerHTML = (isExample ? "Example: " : "✓ ") + esc(name); $("#dropDoc").classList.add("done");
    if (!$("#cname").value && model.title) $("#cname").value = model.title;
    filled = null; setDownloads(); render();
    if (!isExample) goStep("#s2");
  } catch (e) { console.error(e); $("#docName").textContent = "That file could not be read as a Word document. Save it as .docx and try again."; $("#dropDoc").classList.remove("done"); }
}
async function loadSheet(buf, name, label) {
  try {
    const wb = await Workbook.load(buf.slice(0));
    if (!wb.has(S.rc)) throw new Error(`There is no "${S.rc}" tab in this workbook.`);
    readLinks(wb).then(adoptLinks).catch(() => {});
    const rc = await wb.sheet(S.rc); const map = rcMap(rc); C = map; const counts = {};
    for (let r = S.rcFirstRow; r <= Math.max(S.rcLastRow, rc.lastUsedRow()); r++) {
      const k = rc.text(C.programme + r) + "|" + rc.text(C.source + r); if (k !== "|") counts[k] = (counts[k] || 0) + 1;
    }
    const list = async (sheetName, col) => { const d = await wb.sheet(sheetName); if (!d) return []; const out = []; for (let r = 2; r <= 60; r++) { const v = d.text(col + r); if (v) out.push(v); } return out; };
    const progs = await list(S.data, S.dataProgrammes);
    $("#progs").innerHTML = progs.map(p => `<option value="${esc(p)}_">`).join("");
    await teamsFromSheet(wb);
    const bp = await wb.sheet(S.blueprint); const B = S.blueprintCells;
    if (bp) {
      if (!$("#cname").value && bp.text(B.course)) $("#cname").value = bp.text(B.course);
      if (!$("#pal").value && bp.text(B.palette)) { $("#pal").value = bp.text(B.palette); gallery(); }
      if (!$("#dces").value && bp.text(B.dces)) $("#dces").value = bp.text(B.dces);
      if (!$("#unit").value && bp.text(B.unit) && teams.units.some(u => u.name === bp.text(B.unit))) { $("#unit").value = bp.text(B.unit); teamSelects(); }
      if (!$("#coord").value && B.coordinator && bp.text(B.coordinator)) { savedSetup.coord = bp.text(B.coordinator); teamSelects(); }
    }
    const missing = [S.qb, S.snippets, S.projectPlan, S.blueprint].filter(n => !wb.has(n));
    sheet = { buf, name, counts, missing, map, blank: !!label };
    $("#xlsName").textContent = "✓ " + (label || name) + (missing.length ? ` (no ${missing.join(", ")} tab${missing.length > 1 ? "s" : ""})` : "");
    $("#dropXls").classList.add("done");
    $("#loadMsg").textContent = missing.includes(S.projectPlan) ? "This is an older T06: the Hub will add a Snippets tab. For the Project Plan tab and the duration column, use the blank template." : (!map.devTime ? "This sheet has no Duration to develop column. The blank template has it." : "");
    filled = null; setDownloads(); dupCheck(); if (model) render();
  } catch (e) { console.error(e); $("#xlsName").textContent = "That file could not be read as the Resource Creation Sheet. " + (e.message || ""); $("#dropXls").classList.remove("done"); sheet = null; }
}
$("#sampleBtn").addEventListener("click", sample);
function sample() {
  if (window.SAMPLE_B64) { const bin = atob(window.SAMPLE_B64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return loadOriginal(u.buffer, "Example course draft: SMT work planning", true); }
  fetch("examples/sample-course-draft.docx").then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); }).then(b => loadOriginal(b, "Example course draft: SMT work planning", true)).catch(() => { $("#loadMsg").textContent = "The example draft is not available here."; });
}
// the blank T06 template ships with the Hub and is loaded when the page opens
const fromB64 = s => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
// an uploaded file in templates/ wins; otherwise the built-in copy (files.js) is used
async function fileOr(path, b64) { if (location.protocol !== "file:") { try { const r = await fetch(path, { cache: "no-cache" }); if (r.ok) return r.arrayBuffer(); } catch (e) {} } if (b64) return fromB64(b64); throw new Error("missing " + path); }
async function blankBuf() { return fileOr("templates/T06_Resource_Creation_Sheet.xlsx", window.BLANK_T06_B64); }
async function loadBlank() {
  try { await loadSheet(await blankBuf(), "T06_Resource_Creation_Sheet.xlsx", "Blank T06 template (preloaded)"); }
  catch (e) { $("#loadMsg").textContent = "The blank template could not be loaded here. Add your own copy of T06 instead."; }
}
$("#blankBtn").addEventListener("click", loadBlank);
$("#dlBlank").addEventListener("click", async () => {
  try {
    const wb = await Workbook.load(await blankBuf()); await teamsToSheet(wb);
    const bp = await wb.sheet(S.blueprint); const s = setup(); const B = S.blueprintCells;
    if (bp) { if (s.unit) bp.set(B.unit, s.unit); if (s.coord && B.coordinator) bp.set(B.coordinator, s.coord); if (s.dces) bp.set(B.dces, s.dces); }
    save(await wb.blob(), "T06_Resource_Creation_Sheet.xlsx");
  } catch (e) { $("#loadMsg").textContent = "The blank template could not be loaded here."; }
});

// ---------- learning design review ----------
const PRINCIPLES = ["Engagement", "Representation", "Action & Expression", "Accessibility", "Moodle flow"];
let review = null, udlFilter = "All";
async function loadOriginal(buf, name, isExample) {
  try {
    $("#origName").textContent = "Reviewing…";
    const r = await UDLReview.review(buf.slice(0));
    review = { name, buf: buf.slice(0), suggestions: r.suggestions, modules: r.modules, choices: {} };
    $("#origName").textContent = (isExample ? "Example: " : "✓ ") + name; $("#dropOrig").classList.add("done");
    ["#dlReviewed", "#dlAccepted", "#useAccepted", "#useOriginal"].forEach(id => { $(id).disabled = false; });
    udlFilter = "All"; renderReview();
    goStep("#sR");
  } catch (e) { console.error(e); $("#origName").textContent = "That file could not be read as a Word document. Save it as .docx and try again."; $("#dropOrig").classList.remove("done"); }
}
const pslug = p => p.toLowerCase().replace(/[^a-z]+/g, "-");
// what the DCES picked for each suggestion: a ready-made option (0, 1 …), "own", "comment" or "skip"
const pickOf = x => { const c = review.choices[x.id]; return c ? c.pick : (x.options.length ? 0 : "comment"); };
const OWN_HINT = { insert: "Write your own text. Each line becomes a paragraph in the draft.", replace: "Write the paragraph as it should read.", relabel: "Write the link text, e.g. Watch the video on effective feedback.",
  alt: "Describe what the image shows.", wrap: "Write the term in full, e.g. School Management Team.", header: "Write the sentence that introduces the table.", comment: "Write your own advice: it goes in the margin as a comment." };
function reviewCounts() { const sg = review.suggestions; const ch = sg.filter(x => { const p = pickOf(x); return typeof p === "number" || (p === "own" && (review.choices[x.id].own || "").trim() && x.ownKind !== "comment"); }).length;
  const sk = sg.filter(x => pickOf(x) === "skip").length; $("#udlCount").textContent = `${ch} change${ch === 1 ? "" : "s"} will be made in the draft · ${sg.length - ch - sk} as comments · ${sk} left out`; }
function renderReview() {
  if (!review) return;
  const sg = review.suggestions; const count = p => sg.filter(x => x.principle === p).length;
  $("#udlTiles").innerHTML = [["Suggestions", sg.length], ...PRINCIPLES.map(p => [p, count(p)])].map(([l, v], i) => `<div class="tile ${i ? "udl-" + pslug(l) : ""}"><b>${v}</b><span>${esc(l)}</span></div>`).join("");
  $("#udlChips").innerHTML = ["All", ...PRINCIPLES].map(p => `<button class="chip ${p === udlFilter ? "on" : ""}" data-p="${esc(p)}" aria-pressed="${p === udlFilter}">${esc(p)}${p === "All" ? "" : " · " + count(p)}</button>`).join("");
  const list = sg.filter(x => udlFilter === "All" || x.principle === udlFilter);
  $("#udlList").innerHTML = list.length ? list.map(x => { const pick = pickOf(x); const own = (review.choices[x.id] || {}).own || "";
    const radio = (val, label, body) => `<label class="udl-opt${String(pick) === String(val) ? " on" : ""}"><input type="radio" name="c${x.id}" value="${val}" ${String(pick) === String(val) ? "checked" : ""}><span><b>${esc(label)}</b>${body || ""}</span></label>`;
    return `<div class="udl-row" data-id="${x.id}">
    <div class="udl-orig"><span class="udl-k">Original · ${esc(x.where)}</span><p>${esc(x.original || "")}</p></div>
    <div class="udl-sugg udl-${pslug(x.principle)}"><span class="udl-k"><span class="pchip udl-${pslug(x.principle)}">${esc(x.principle)}</span> #${x.id}</span>
      <p><b>${esc(x.title)}.</b> ${esc(x.detail)}</p>
      <div class="udl-opts" role="radiogroup" aria-label="What to do with suggestion ${x.id}">
        ${x.options.map((o, i) => radio(i, o.label, `<mark class="udl-prev">${esc(o.preview).replace(/\n/g, "<br>")}</mark>`)).join("")}
        ${radio("own", x.ownKind === "comment" ? "My own advice" : "My own version", `<textarea rows="3" data-own="${x.id}" placeholder="${esc(OWN_HINT[x.ownKind] || OWN_HINT.insert)}">${esc(own)}</textarea>`)}
        ${radio("comment", "Comment in the margin only")}
        ${radio("skip", "Leave it out")}
      </div></div></div>`; }).join("")
    : '<p class="empty">No suggestions for this principle.</p>';
  reviewCounts();
}
$("#udlChips").addEventListener("click", e => { const b = e.target.closest(".chip"); if (!b) return; udlFilter = b.dataset.p; renderReview(); });
$("#udlList").addEventListener("change", e => {
  const r = e.target.closest("input[type=radio]"); if (!r || !review) return; const id = +r.closest(".udl-row").dataset.id;
  const c = review.choices[id] || {}; c.pick = /^\d+$/.test(r.value) ? +r.value : r.value; review.choices[id] = c;
  r.closest(".udl-opts").querySelectorAll(".udl-opt").forEach(l => l.classList.toggle("on", l.contains(r)));
  if (c.pick === "own") { const ta = r.closest(".udl-opt").querySelector("textarea"); if (ta) ta.focus(); }
  reviewCounts();
});
$("#udlList").addEventListener("input", e => {
  const ta = e.target.closest("textarea[data-own]"); if (!ta || !review) return; const id = +ta.dataset.own;
  const c = review.choices[id] || {}; c.own = ta.value; c.pick = "own"; review.choices[id] = c;
  const r = ta.closest(".udl-opt").querySelector("input"); if (!r.checked) { r.checked = true; ta.closest(".udl-opts").querySelectorAll(".udl-opt").forEach(l => l.classList.toggle("on", l.contains(r))); }
  reviewCounts();
});
document.addEventListener("click", e => { const b = e.target.closest("[data-allpick]"); if (!b || !review) return;
  review.suggestions.forEach(x => { if (b.dataset.allpick === "options") review.choices[x.id] = { pick: x.options.length ? 0 : "comment", own: (review.choices[x.id] || {}).own };
    else review.choices[x.id] = { pick: "comment", own: (review.choices[x.id] || {}).own }; }); renderReview(); });
function resetReview() {
  review = null; $("#origName").textContent = ""; $("#dropOrig").classList.remove("done");
  $("#udlTiles").innerHTML = ""; $("#udlChips").innerHTML = ""; $("#udlList").innerHTML = '<p class="empty">Add a course draft in step 2.</p>'; $("#udlCount").textContent = "";
  ["#dlReviewed", "#dlAccepted", "#useAccepted", "#useOriginal"].forEach(id => { $(id).disabled = true; });
}
const baseName = n => String(n || "course_draft").replace(/\.docx$/i, "").replace(/[\\/:*?"<>|]+/g, "-");
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
async function reviewed(accepted) { const r = await UDLReview.review(review.buf.slice(0), { accepted, choices: review.choices }); return r.file; }
$("#dlReviewed").addEventListener("click", async () => review && save(await reviewed(false), baseName(review.name) + "_learning_design_review.docx", "A"));
$("#dlAccepted").addEventListener("click", async () => review && save(new Blob([await reviewed(true)], { type: DOCX }), baseName(review.name) + "_with_changes.docx", "A"));
$("#useAccepted").addEventListener("click", async () => review && loadDoc(await reviewed(true), baseName(review.name) + " (with the chosen changes)"));
$("#useOriginal").addEventListener("click", () => review && loadDoc(review.buf.slice(0), baseName(review.name) + " (original)"));

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
  if (!model) return say("#confirmMsg", "Add the approved draft in step 4 first.", true);
  if (!sheet) return say("#confirmMsg", "Add the Resource Creation Sheet in step 4, or click Use the blank template.", true);
  if (!s.prog || !s.src) { $("#ccode").classList.add("missing"); $("#ccode").focus(); return say("#confirmMsg", "Fill in the course code as Programme_source, for example LP3_Comp2.", true); }
  const dupes = sheet.counts[s.prog + "|" + s.src] || 0;
  if (dupes && !($("#replace") && $("#replace").checked)) return say("#confirmMsg", "This course code is already in the sheet. Tick Replace, or change the course code.", true);
  say("#confirmMsg", "Filling the sheet…");
  try {
    const wb = await Workbook.load(sheet.buf.slice(0));
    const rc = await wb.sheet(S.rc); C = sheet.map || rcMap(rc);
    const lastRc = Math.max(S.rcLastRow, rc.lastUsedRow());
    const valueCols = []; for (let c = colNum(C.programme); c < (C.done ? colNum(C.done) : 47); c++) valueCols.push(colName(c));
    const codeRe = new RegExp("^" + s.prog.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[^_]*_" + s.src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\.");
    // 1. Resource Creation
    if (dupes) for (let r = S.rcFirstRow; r <= lastRc; r++) if (rc.text(C.programme + r) === s.prog && rc.text(C.source + r) === s.src) { valueCols.forEach(col => rc.set(col + r, "")); rc.setCached(C.code + r, ""); }
    const rows = rcItems(); const free = [];
    const dataSh = await wb.sheet(S.data); const typical = {};
    if (dataSh) for (let r = 2; r <= 60; r++) { const c = dataSh.text("B" + r), v = dataSh.get("N" + r); if (c && typeof v === "number") typical[c] = v; }
    for (let r = S.rcFirstRow; free.length < rows.length; r++) if (rc.rowEmpty(r, [C.programme, C.type, C.source, C.element, C.resource])) free.push(r);
    const preview = [];
    rows.forEach((it, k) => {
      const r = free[k]; const code = itemCode(s.prog, it.code, s.src, it.ref); const sg = suggestions(it);
      const notes = [...it.flags, ...it.links.map(l => (l.label && l.label !== l.url ? l.label + ": " : "") + l.url), sg.length ? "Suggested elements (developers decide): " + sg.map(([c]) => `${c} ${NAME[c] || c}`).join(", ") : ""].filter(Boolean).join("; ");
      const vals = { [C.programme]: s.prog, [C.type]: it.code, [C.source]: s.src, [C.element]: it.ref, [C.resource]: NAME[it.code] || it.code, [C.module]: it.module,
        [C.description]: it.title.replace(/\s*\n\s*/g, " "), [C.palette]: s.pal, [C.status]: S.startStatus, [C.writer]: s.writer, [C.notes]: notes };
      Object.entries(vals).forEach(([col, v]) => { if (col && col !== "undefined") rc.set(col + r, v || ""); });
      if (C.due) rc.set(C.due + r, s.due || "", s.due ? { date: true } : null);
      if (C.devTime && typical[it.code] != null) rc.setCached(C.devTime + r, typical[it.code]);
      it.days = typical[it.code];
      if (rc.cellEl(C.code + r, false) && rc.cellEl(C.code + r, false).getElementsByTagNameNS(XL_NS, "f").length) rc.setCached(C.code + r, code); else rc.set(C.code + r, code);
      preview.push({ r, code, it });
    });
    // programme and writer go into the Data lists so the dropdowns accept them
    const data = await wb.sheet(S.data);
    const addTo = (col, v) => { if (!data || !v) return; let empty = 0; for (let r = 2; r <= 60; r++) { const t = data.text(col + r); if (t === v) return; if (!t && !empty) empty = r; } if (empty) data.set(col + empty, v); };
    if (s.writer && !teams.people.writers.some(x => x.toLowerCase() === s.writer.toLowerCase())) { teams.people.writers.push(s.writer); saveTeams(); teamEditor(); teamSelects(); }
    await teamsToSheet(wb);
    addTo(S.dataProgrammes, s.prog);
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
    if (bp) {
      if (s.cname) bp.set(B.course, s.cname); bp.set(B.programme, s.prog); if (s.pal) bp.set(B.palette, s.pal); if (s.dces) bp.set(B.dces, s.dces);
      if (s.unit) bp.set(B.unit, s.unit);
      if (s.coord && B.coordinator && /co-?ordinator/i.test(bp.text("A" + B.coordinator.replace(/\D/g, "")))) bp.set(B.coordinator, s.coord);
    }
    const blob = await wb.blob();
    filled = { blob, name: sheet.name, rows: preview, qCount, snCount, first: free[0], last: free[free.length - 1], setup: s, hasPlan: wb.has(S.projectPlan), over: free[free.length - 1] > S.rcLastRow };
    // keep working on the filled copy, so confirming again does not add the rows twice
    sheet = { ...sheet, buf: await blob.arrayBuffer(), counts: { ...sheet.counts, [s.prog + "|" + s.src]: rows.length } };
    dupCheck(); setDownloads(); showFilled();
    say("#confirmMsg", `Done: ${rows.length} rows, ${qCount} questions and ${snCount} snippets added. Download the sheet in step 7.`);
    goStep("#s4");
  } catch (e) { console.error(e); say("#confirmMsg", "Something went wrong while filling the sheet: " + (e.message || e), true); }
}
function fmtDate(v) { if (typeof v === "number" && v > 20000) { const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000); return d.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }); } if (/^\d{4}-\d\d-\d\d$/.test(v || "")) return fmtDate((Date.UTC(+v.slice(0, 4), +v.slice(5, 7) - 1, +v.slice(8, 10)) - Date.UTC(1899, 11, 30)) / 86400000); return v || ""; }
function showFilled() {
  const f = filled; const s = f.setup;
  $("#doneList").innerHTML = [
    `<b>Resource Creation:</b> ${f.rows.length} rows (rows ${f.first} to ${f.last}), with item codes, palette, writer, status and the PDD QA 1 due date. The developer columns are left for the developers.`,
    `<b>Question Bank:</b> ${f.qCount} question${f.qCount === 1 ? "" : "s"} from the reflections and knowledge checks.`,
    `<b>Snippets:</b> ${f.snCount} snippets of content, matched by programme, main source and source element.`,
    `<b>Design Blueprint:</b> course name, programme, unit, Programme Co-ordinator, palette and DCES filled in; the resource list builds itself.`,
    `<b>Data tab:</b> the team lists, units and Programme Co-ordinators from step 1, so the sheet's dropdowns match.`,
    f.hasPlan ? `<b>Project Plan:</b> counts, the PDD QA 1 due date and progress fill themselves. Complete the rest at close-out.` : `<b>Project Plan:</b> not in this sheet. Use the latest T06 template to get it.`,
    f.over ? `<b style="color:var(--bad-ink)">Some rows are below row ${S.rcLastRow}, where the dropdowns stop. Extend the dropdowns in Excel if you need them.</b>` : ""
  ].filter(Boolean).map(x => `<li>${x}</li>`).join("");
  $("#preview tbody").innerHTML = f.rows.map(({ r, code, it }) => `<tr><td>${r}</td><td class="ic">${esc(code)}</td><td>${esc(NAME[it.code] || it.code)}</td><td>${esc(it.module)}</td><td class="txt">${esc(it.title.slice(0, 140))}</td><td>${it.days != null ? esc(fmtDur(it.days)) : ""}</td><td>${esc(s.pal)}</td><td>${esc(fmtDate(s.due))}</td><td>${esc(s.writer)}</td></tr>`).join("");
}
function setDownloads() {
  $("#dlSheet").disabled = !filled; $("#dlSnips").disabled = !filled; $("#useFilled").disabled = !filled; $("#nextSame").disabled = !filled;
  if (!filled) { $("#doneList").innerHTML = "<li>Nothing filled yet. Confirm in step 6.</li>"; $("#preview tbody").innerHTML = ""; }
}

// ---------- downloads ----------
// inside claude.ai the page asks the viewer to confirm the save; everywhere else (GitHub Pages) it downloads directly
let dlCap = null;
if (window.claude && window.claude.use) window.claude.use("downloads").then(d => { dlCap = d; }).catch(() => {});
async function save(blob, name, place, sub) {
  if (place && backup) backupFile(blob, name, place, sub);
  if (dlCap) { try { await dlCap.save({ filename: name, data: blob }); } catch (e) { if (e && e.code !== "declined") say("#confirmMsg", "The file could not be saved here: " + (e.message || e.code), true); } return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const safe = s => String(s || "").replace(/[\\/:*?"<>|]+/g, "-").trim();

// ---------- Google Drive backup: every download is also saved in the project's Drive folder ----------
// The link is the project's "Hub backup link" (Project Links tab), made by PDD tools → New project.
let backup = null;
const BK = "ctliHubBackup";
function bkSay(html, on) { $("#bkMsg").innerHTML = html; document.querySelector(".bkbox").classList.toggle("on", !!on); }
// a Google Workspace link (script.google.com/a/<domain>/macros/… or /a/macros/<domain>/…) asks for a sign-in,
// which a page outside the domain cannot do; the plain /macros/s/… form of the same web app does not
const plainLink = u => String(u || "").trim().replace(/^https:\/\/script\.google\.com\/a\/(?:macros\/)?[^\/]+\/(?:macros\/)?s\//i, "https://script.google.com/macros/s/");
// Two ways in. Direct: the web app answers anyone (Who has access: Anyone, and the organisation allows it).
// Signed-in bridge: when the organisation keeps the web app to its own users (as wced.info does), the Hub opens the
// web app inside the page (or in a small window) as the signed-in user, and passes each save to it with postMessage.
let bridge = null, bridgeWin = null, bridgeTimer = null, bridgeSeq = 0;
const bridgeWait = new Map();
const fromGoogle = o => /^https:\/\/([a-z0-9-]+\.)*(googleusercontent|google)\.com$/i.test(o);
window.addEventListener("message", e => {
  const d = e.data; if (!d || typeof d !== "object" || !d.ctliHub || !fromGoogle(e.origin)) return;
  if (d.ctliHub === "ready") {
    clearTimeout(bridgeTimer);
    if (!d.ok) { backup = null; bkSay("The project's Drive folder said no: " + esc(d.error || "not allowed") + "."); return; }
    if (d.embedded) {   // the Hub opened through Google (…&mode=hub): already connected, nothing to paste
      if (e.source !== window.parent) return;
      bridge = { win: e.source, origin: e.origin }; backup = { url: "", project: d.project, folder: d.url, via: "bridge" };
      $("#bkLink").value = ""; $("#bkLink").placeholder = "Opened through Google: connected"; $("#bkLink").disabled = true; $("#bkCheck").disabled = true;
      bkSay(`On: every download is also saved in <a href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.project)}</a> in Google Drive (opened through Google).`, true);
      return;
    }
    bridge = { win: e.source, origin: e.origin };
    backup = { url: pendingUrl, project: d.project, folder: d.url, via: "bridge" };
    try { localStorage.setItem(BK, pendingUrl); } catch (x) {}
    bkSay(`On: every download is also saved in <a href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.project)}</a> in Google Drive (signed in as you${bridgeWin ? "; keep the small Drive window open" : ""}).`, true);
  } else if (d.ctliHub === "result" && bridgeWait.has(d.id)) {
    const w = bridgeWait.get(d.id); bridgeWait.delete(d.id); w(d.result || { ok: false, error: "no answer" });
  }
});
let pendingUrl = "";
function bridgeUrl(url) { return url + (url.includes("?") ? "&" : "?") + "mode=bridge"; }
function startBridge(url) {
  pendingUrl = url; bridge = null;
  let fr = document.getElementById("bkFrame");
  if (!fr) { fr = document.createElement("iframe"); fr.id = "bkFrame"; fr.title = "Google Drive connection"; fr.style.cssText = "position:absolute;width:1px;height:1px;border:0;left:-9999px;top:0"; document.body.appendChild(fr); }
  fr.src = bridgeUrl(url);
  bkSay("Connecting through your Google sign-in…");
  clearTimeout(bridgeTimer);
  bridgeTimer = setTimeout(() => {
    if (bridge) return;
    bkSay('Almost there: this browser keeps Google sign-ins out of other sites, so the Drive connection needs its own small window. <button type="button" id="bkOpen" class="primary">Open the Drive connection</button> Sign in with your work account if Google asks, then leave that window open while you work.');
    const b = document.getElementById("bkOpen"); if (b) b.onclick = () => {
      bridgeWin = window.open(bridgeUrl(url), "ctliDrive", "width=460,height=360");
      if (!bridgeWin) { bkSay("The browser blocked the small window. Allow pop-ups for this page, then click Connect again."); return; }
      bkSay("Waiting for the Drive connection window…");
      clearTimeout(bridgeTimer);
      bridgeTimer = setTimeout(() => { if (!bridge) bkSay("The Drive connection window did not answer. Check it shows your project's name; if it says the file does not exist, sign in there with the account that owns the master T06. Then click Connect again."); }, 45000);
    };
  }, 9000);
}
async function checkBackup(url) {
  url = plainLink(url);
  if (url && $("#bkLink").value.trim() !== url) $("#bkLink").value = url;
  if (!url) { backup = null; bkSay("Off: downloads are saved on this computer only. Paste the project's Hub backup link (or add the project's sheet in step 4) and every download is also saved in the project's Drive folder."); try { localStorage.removeItem(BK); } catch (e) {} return; }
  if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(url) || !/[?&]k=/.test(url) || !/[?&]f=/.test(url)) { backup = null; bkSay("That is not a Hub backup link. Copy it from the Hub backup link row of the project's Project Links tab."); return; }
  bkSay("Connecting…");
  try {
    const r = await fetch(url, { cache: "no-store" }).then(x => x.json());
    if (!r.ok) throw new Error(r.error || "not allowed");
    backup = { url, project: r.project, folder: r.url, via: "direct" };
    bkSay(`On: every download is also saved in <a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.project)}</a> in Google Drive.`, true);
    try { localStorage.setItem(BK, url); } catch (e) {}
  } catch (e) {
    if (/not valid|not a project/i.test(String(e.message))) { backup = null; bkSay("Could not connect: " + esc(e.message) + "."); return; }
    backup = null; startBridge(url);   // the organisation keeps the web app to signed-in users: go through the sign-in
  }
}
function adoptLinks(links) {
  const hub = (links || []).find(l => /^Hub backup link/i.test(l.what));
  if (hub && plainLink(hub.url) !== $("#bkLink").value.trim()) { $("#bkLink").value = plainLink(hub.url); checkBackup(hub.url); }
  const claim = (links || []).find(l => /^PDD Support Claim/i.test(l.what));
  if (claim) $("#claimLink").innerHTML = `<a href="${esc(claim.url)}" target="_blank" rel="noopener">Open the PDD Support Claim →</a> The claim reads the developers' workplans, so send the timesheets to the workplans first.`;
}
async function readLinks(wb) {
  const out = []; if (!wb.has(S.links)) return out; const pl = await wb.sheet(S.links);
  for (let r = 5; r <= 60; r++) { const u = pl.text("C" + r); if (/^https?:\/\//i.test(u)) out.push({ what: pl.text("A" + r), phase: pl.text("B" + r), url: u }); }
  return out;
}
const b64 = blob => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = no; r.readAsDataURL(blob); });
async function backupPost(body) {
  let r;
  if (backup.via === "bridge") {
    if (!bridge || (bridgeWin && bridgeWin.closed)) throw new Error("the Drive connection window was closed: click Connect in step 1 again");
    const id = ++bridgeSeq;
    r = await new Promise(ok => { bridgeWait.set(id, ok); bridge.win.postMessage({ ctliHub: "call", id, body }, bridge.origin);
      setTimeout(() => { if (bridgeWait.has(id)) { bridgeWait.delete(id); ok({ ok: false, error: "Google Drive took too long to answer" }); } }, 120000); });
  } else {
    try { r = await fetch(backup.url, { method: "POST", body: JSON.stringify(body) }).then(x => x.json()); }
    catch (e) {   // the direct way was refused: switch to the signed-in way and try once more
      if (body._again) throw e;
      startBridge(backup.url);
      const t0 = Date.now(); while (!bridge && Date.now() - t0 < 60000) await new Promise(ok => setTimeout(ok, 500));
      if (!bridge) throw new Error("Google refused the direct connection. Click Connect in step 1 (and Open the Drive connection if it asks), then send again");
      return backupPost(Object.assign({}, body, { _again: 1 }));
    }
  }
  if (!r.ok) throw new Error(r.error || "failed"); return r;
}
async function backupFile(blob, name, place, sub) {
  try {
    const r = await backupPost({ action: "save", place, sub: sub || "", name, mime: blob.type || "application/octet-stream", b64: await b64(blob) });
    bkSay(`On: saved <b>${esc(name)}</b> in <a href="${esc(backup.folder)}" target="_blank" rel="noopener">${esc(backup.project)}</a> › ${esc(r.folder)}.`, true);
  } catch (e) { bkSay(`On, but <b>${esc(name)}</b> was not saved in Drive: ${esc(e.message || e)}. It is still on this computer.`, true); }
}
$("#bkCheck").addEventListener("click", () => checkBackup($("#bkLink").value));
$("#bkLink").addEventListener("change", () => checkBackup($("#bkLink").value));
const EMBEDDED = window.parent !== window && /[?&]embed=1/.test(location.search);
if (EMBEDDED) { bkSay("Connecting through Google…"); const hi = () => { if (!bridge) try { window.parent.postMessage({ ctliHub: "hello" }, "*"); } catch (e) {} }; hi(); setTimeout(hi, 1000); setTimeout(hi, 3000); }
else (() => { let u = ""; try { u = localStorage.getItem(BK) || ""; } catch (e) {} if (u) { $("#bkLink").value = u; checkBackup(u); } })();
$("#dlSheet").addEventListener("click", () => filled && save(filled.blob, filled.name.replace(/\.xlsx$/i, "") + ".xlsx", "sheet"));
$("#dlSnips").addEventListener("click", async () => {
  if (!filled) return; const s = filled.setup; const { p, h } = PAL[s.pal] || {};
  const d = new WordDoc.Doc();
  d.h(1, `Content snippets: ${s.cname || s.ccode}`);
  d.label("Course code", s.ccode); d.label("Colour palette", s.pal ? `${s.pal}${p ? ` (primary ${p}, highlight ${h})` : ""}` : "");
  d.label("Writer (SME)", s.writer); d.label("PDD QA 1 due date", fmtDate(s.due));
  d.p("Each snippet is the content from the course draft for one resource. Item codes match column A of the Resource Creation Sheet. Suggested elements are ideas only: the developers choose what to build in the sheet.", { italic: true, color: "55607E" });
  d.table(["Item code", "Resource", "Module", "Title"], items.filter(i => i.include).map(it => [codeOf(it), it.course ? "Course page tab" : NAME[it.code] || it.code, it.module, it.title]), [2200, 1600, 2500, 3300]);
  items.filter(i => i.include).forEach(it => snippetBlock(d, { code: codeOf(it), resource: it.course ? "Course page tab" : NAME[it.code] || it.code, module: it.module, topic: it.topic, title: it.title, text: it.text, links: it.links.map(l => (l.label && l.label !== l.url ? l.label + ": " : "") + l.url), check: it.flags, sugg: suggestions(it).map(([c, why]) => `${c} ${NAME[c] || c}: ${why}`) }));
  save(await d.blob("Content snippets"), `Snippets_${safe(s.ccode)}.docx`, "B");
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
const splitNames = v => String(v || "").split(/\s*[;,\/&]\s*|\s+and\s+/).map(x => x.trim()).filter(Boolean);
async function loadDev(buf, name) {
  try {
    const wb = await Workbook.load(buf.slice(0)); if (!wb.has(S.rc)) throw new Error(`There is no "${S.rc}" tab.`);
    const rc = await wb.sheet(S.rc); const M = rcMap(rc); const rows = [];
    for (let r = S.rcFirstRow; r <= Math.max(S.rcLastRow, rc.lastUsedRow()); r++) {
      const g = k => M[k] ? rc.get(M[k] + r) : ""; const t = k => M[k] ? rc.text(M[k] + r) : "";
      if (!t("programme")) continue;
      const days = g("devTime");
      rows.push({ r, prog: t("programme"), type: t("type"), src: t("source"), el: t("element"), resource: t("resource"), module: t("module"), desc: t("description"),
        days: typeof days === "number" ? days : (parseFloat(days) || null), pal: t("palette"), due: g("due"), status: t("status"), notes: t("notes"),
        vid: t("vid"), tools: t("tools"), vid2: t("vid2"), product: t("product") });
    }
    const snips = {};
    if (wb.has(S.snippets)) {
      const sn = await wb.sheet(S.snippets);
      for (let r = S.snFirstRow; r <= sn.lastUsedRow(); r++) {
        const key = [sn.text("B" + r), sn.text("D" + r), sn.text("E" + r)].join("|"); if (key === "||") continue;
        (snips[key] = snips[key] || []).push({ title: sn.text("H" + r), module: sn.text("F" + r), topic: sn.text("G" + r), text: sn.text("I" + r), links: sn.text("J" + r).split("\n").filter(Boolean), check: sn.text("K" + r).split("\n").filter(Boolean) });
      }
    }
    const bp = wb.has(S.blueprint) ? await wb.sheet(S.blueprint) : null; const B = S.blueprintCells;
    const info = bp ? { course: bp.text(B.course), unit: bp.text(B.unit), dces: bp.text(B.dces), coord: B.coordinator ? bp.text(B.coordinator) : "" } : {};
    const names = new Set(); rows.forEach(x => [x.vid, x.vid2].forEach(v => splitNames(v).forEach(n => names.add(n))));
    const links = await readLinks(wb); adoptLinks(links);
    dev = { buf, name, rows, snips, info, map: M, hasSnips: wb.has(S.snippets), links };
    const list = [...names].sort();
    $("#devSel").innerHTML = list.map(n => `<option>${esc(n)}</option>`).join("") + '<option value="__none">Not assigned yet</option><option value="__all">Everyone (all rows)</option>';
    $("#devSel").disabled = false; $("#dlPack").disabled = false; $("#dlDevSheet").disabled = false; $("#dlTs").disabled = false;
    $("#devName").textContent = "✓ " + name; $("#dropDev").classList.add("done");
    say("#devMsg", list.length ? `${list.length} developer${list.length > 1 ? "s" : ""} found in the sheet.` : "No developer names yet in the Visual Instructional Designer columns. Ask the developers to choose their elements first.", !list.length);
    if (!dev.hasSnips) say("#devMsg", "This sheet has no Snippets tab, so the packs will have no content. Fill it with the Hub first (step 6).", true);
    devPreview(); if (tsList.length) renderTs();
    $("#devLinks").innerHTML = links.length ? `<details class="box" open><summary>Project files in Google Drive (${links.length})</summary><ul class="links">${links.filter(l => !/^T08 master/i.test(l.what)).map(l => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.what)}</a> <span>${esc(l.phase)}</span></li>`).join("")}</ul></details>` : '<p class="small-note">No Google Drive links in this sheet yet. Make the project with PDD tools → New project in Google Drive, or paste the links in the Project Links tab, and they go into every developer pack.</p>';
  } catch (e) { console.error(e); $("#devName").textContent = "That file could not be read as the Resource Creation Sheet."; }
}
function devRows() {
  const who = $("#devSel").value;
  const rows = dev.rows.filter(x => who === "__all" ? true : who === "__none" ? !x.vid && !x.vid2 : [x.vid, x.vid2].some(v => splitNames(v).includes(who)));
  const key = x => typeof x.due === "number" ? x.due : 1e9;
  return rows.sort((a, b) => key(a) - key(b) || a.r - b.r);
}
const rowCode = x => itemCode(x.prog, x.type, x.src, x.el);
const snipsFor = x => dev.snips[[x.prog, x.src, x.el].join("|")] || [];
// durations are stored as Excel time values (fractions of a day) and shown as hours:minutes
const fmtDur = v => { if (v == null || v === "" || isNaN(v)) return "Not set"; const m = Math.round(v * 24 * 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`; };
const fmtDays = fmtDur;
function devPreview() {
  if (!dev) return; const rows = devRows();
  $("#devPreview tbody").innerHTML = rows.map(x => `<tr><td class="ic">${esc(rowCode(x))}</td><td>${esc(x.resource)}</td><td>${esc(x.module)}</td><td>${esc([x.tools, x.product].filter(Boolean).join(", "))}</td><td>${x.days == null ? "" : esc(fmtDur(x.days))}</td><td>${esc(fmtDate(x.due))}</td><td>${snipsFor(x).length ? "✓" : "None found"}</td></tr>`).join("") || '<tr><td colspan="7">No rows for this developer.</td></tr>';
}
$("#devSel").addEventListener("change", devPreview);
function whoLabel() { const who = $("#devSel").value; return who === "__all" ? "All developers" : who === "__none" ? "Not assigned yet" : who; }
$("#dlPack").addEventListener("click", async () => {
  if (!dev) return; const rows = devRows(); const label = whoLabel(); const person = !$("#devSel").value.startsWith("__");
  const first = person ? label.split(/\s+/)[0] : ""; const I = dev.info || {};
  const pals = [...new Set(rows.map(x => x.pal).filter(Boolean))];
  const tools = [...new Set(rows.flatMap(x => [x.tools, x.product]).filter(Boolean))];
  const dues = rows.map(x => x.due).filter(v => typeof v === "number").sort((a, b) => a - b);
  const known = rows.filter(x => x.days != null); const total = known.reduce((a, x) => a + x.days, 0);
  const d = new WordDoc.Doc();
  d.h(1, person ? `Content pack for ${label}` : `Content pack: ${label}`);
  if (I.course) d.p(I.course, { bold: true, color: "007DBA", size: 13 });
  if (person) d.p(`Hi ${first}, these are the ${rows.length} element${rows.length === 1 ? "" : "s"} you chose to build${I.course ? " for " + I.course : ""}. Everything you need is in this pack: your due dates, the palette, a checklist for each element and the content to use from the course draft.`);
  d.h(2, person ? "Your work at a glance" : "At a glance");
  d.table(null, [
    ["Elements", String(rows.length)],
    ["Duration to develop", known.length ? `${fmtDur(total)} (hh:mm)${known.length < rows.length ? ` (${rows.length - known.length} not set yet)` : ""}` : "Not set yet: add it in the Duration to develop column"],
    ["First due date", dues.length ? fmtDate(dues[0]) : "Not set"], ["Last due date", dues.length ? fmtDate(dues[dues.length - 1]) : "Not set"],
    ["Digital tools", tools.join(", ") || "Not set"],
    ["Colour palette", pals.map(n => PAL[n] ? `${n} (primary ${PAL[n].p}, highlight ${PAL[n].h})` : n).join("; ") || "Not set"],
    ["Unit", I.unit || "—"], ["Programme Co-ordinator", I.coord || "—"], ["DCES (project lead)", I.dces || "—"]
  ].map(([a, b]) => [a, b]), [3000, 6600]);
  const myLinks = (dev.links || []).filter(l => !/^T08 master/i.test(l.what) && (!/^Timesheet:/i.test(l.what) || !person || l.what.toLowerCase().includes(label.toLowerCase())));
  if (myLinks.length) {
    d.h(2, "Project files in Google Drive");
    d.table(["What", "Link"], myLinks.map(l => [l.what, l.url]), [3400, 6200]);
  }
  d.h(2, person ? "Your elements, by due date" : "Elements, by due date");
  d.table(["Item code", "Resource", "Module", "Tool", "Hours", "Due"], rows.map(x => [rowCode(x), x.resource, x.module, [x.tools, x.product].filter(Boolean).join(", "), x.days == null ? "—" : fmtDur(x.days), fmtDate(x.due)]), [2200, 1600, 2300, 1500, 700, 1300]);
  d.h(2, "When you finish an element");
  ["Run the checklist for that element below.", "Add your link in the Resource Creation Sheet (VD link or Product link) and the date received back.", "Set the element to Submitted for QA by its due date. PDD QA checks it against the QA criteria and the design standards.", `Questions about the content go to ${I.coord || "the Programme Co-ordinator"}; questions about design, dates or the sheet go to ${I.dces || "the DCES"}.`].forEach(t => d.bullet(t));
  rows.forEach(x => {
    d.pageBreak();
    d.h(2, `${rowCode(x)} · ${x.resource}`);
    d.label("Module", x.module); d.label("Description", x.desc); d.label("Digital tool", [x.tools, x.product].filter(Boolean).join(", ") || "—");
    d.label("Duration to develop", fmtDays(x.days)); d.label("Due date", fmtDate(x.due) || "—"); d.label("Status", x.status || "—"); if (x.notes) d.label("Notes from PDD", x.notes);
    d.p("Your checklist", { bold: true, color: "007DBA" });
    [`Built in ${x.tools || x.product || "the assigned tool"}${x.pal ? `, from the ${x.pal} Canva master template only` : ""}`,
     "Content matches the snippet below; nothing new is added to legal or policy wording",
     "Text contrast at least 4.5:1, alt text on images, captions on any video or audio",
     "Works on desktop and on a phone; every link opens",
     `Link added to the Resource Creation Sheet and submitted for QA${typeof x.due === "number" ? " by " + fmtDate(x.due) : ""}`].forEach(t => d.p("☐  " + t, { after: 40 }));
    const sn = snipsFor(x);
    d.p("Content from the course draft", { bold: true, color: "007DBA" });
    if (!sn.length) d.p("No snippet found for this element in the Snippets tab. Ask the DCES for the content.", { italic: true, color: "A1271B" });
    sn.forEach(s => {
      if (sn.length > 1) d.h(3, s.title);
      if (s.text) d.lines(s.text); else d.p("[To write]", { italic: true });
      if (s.links.length) { d.p("Links in the draft", { bold: true, color: "007DBA" }); s.links.forEach(l => d.bullet(l)); }
      if (s.check.length) { d.p("To check", { bold: true, color: "A1271B" }); s.check.forEach(l => d.bullet(l)); }
    });
  });
  save(await d.blob("Content pack " + label), `Content_pack_${safe(label).replace(/\s+/g, "_")}.docx`, "packs", label);
});
// their own copy of the sheet: every other developer's rows are hidden (Excel: Home → Format → Unhide rows to see them again)
$("#dlDevSheet").addEventListener("click", async () => {
  if (!dev) return;
  const label = whoLabel(); const mine = new Set(devRows().map(x => x.r));
  const wb = await Workbook.load(dev.buf.slice(0)); const rc = await wb.sheet(S.rc);
  if ($("#devSel").value !== "__all") dev.rows.forEach(x => { if (!mine.has(x.r)) { const el = rc.rows.get(x.r); if (el) { el.setAttribute("hidden", "1"); rc.dirty = true; } } });
  save(await wb.blob(), `T06_${safe(label).replace(/\s+/g, "_")}.xlsx`, "packs", label);
});

// ---------- timesheets: a T08 for each developer (step 8) ----------
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
$("#tsMonth").value = new Date().toISOString().slice(0, 7);
async function t08Buf() { return fileOr("templates/T08_Developer_Timesheet.xlsx", window.BLANK_T08_B64); }
$("#dlTs").addEventListener("click", async () => {
  if (!dev) return;
  try {
    const rows = devRows(); const label = whoLabel(); const person = !$("#devSel").value.startsWith("__"); const I = dev.info || {};
    const [y, m] = ($("#tsMonth").value || new Date().toISOString().slice(0, 7)).split("-").map(Number);
    const cname = String(I.course || "").replace(/^\s*course\s+draft\s*[:\-–]\s*/i, "").trim();
    const plos = uniq(rows.map(x => [x.prog, cname].filter(Boolean).join(" ")));   // PLO code and course name, e.g. "LS Leading Self"
    const wb = await Workbook.load(await t08Buf());
    await Timesheets.fill(wb, { name: person ? label : "", month: MONTH_NAMES[m - 1], year: y, course: [I.unit, I.course].filter(Boolean).join(" · "),
      codes: rows.map(rowCode), plos, claimUrl: ((dev.links || []).find(l => /^PDD Support Claim/i.test(l.what)) || {}).url || "",
      elements: rows.map(x => ({ code: rowCode(x), resource: x.resource, module: x.module, tool: [x.tools, x.product].filter(Boolean).join(", "), due: x.due, planned: x.days, status: x.status })) });
    save(await wb.blob(), `${safe(person ? label : "Developer")}_Content_Developer_Timesheet_${MONTH_NAMES[m - 1].slice(0, 3)} ${y}.xlsx`, "timesheets");
    say("#devMsg", `Timesheet ready for ${label}: ${rows.length} element${rows.length === 1 ? "" : "s"} in the item code list.`);
  } catch (e) { console.error(e); say("#devMsg", "The timesheet could not be made: " + (e.message || e), true); }
});

// ---------- palette templates (step 5) ----------
function tplStrip() {
  const name = $("#pal").value || CFG.palettes[0][0]; const code = name.split(/\s+/)[0]; const { p, h } = colours();
  $("#tplSw").innerHTML = `<span class="swatch" style="background:${p}" title="Primary ${p}"></span><span class="swatch" style="background:${h}" title="Highlight ${h}"></span> <span class="small-note">${esc(name)}</span>`;
  $("#tplStrip").innerHTML = (CFG.templateKinds || []).map(([f, kind]) => {
    const file = `${f}_${code}`; const src = (window.TPL_THUMBS && window.TPL_THUMBS[file]) || `assets/templates/${file}.jpg`;
    return `<button type="button" class="tpl" data-src="${esc(src)}" data-label="${esc(kind)} · ${esc(name)} · CTLI_${esc(file)}"><img src="${esc(src)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'tplmiss',textContent:'Picture missing: upload thumbs.js'}))"><b>${esc(kind)}</b><span>CTLI_${esc(file)}</span></button>`;
  }).join("");
}
$("#tplStrip").addEventListener("click", e => {
  const b = e.target.closest(".tpl"); if (!b) return; const dlg = $("#tplBig");
  dlg.querySelector("img").src = b.dataset.src; dlg.querySelector("img").alt = b.dataset.label; dlg.querySelector("p").textContent = b.dataset.label;
  if (dlg.showModal) dlg.showModal();
});
$("#tplClose").addEventListener("click", () => $("#tplBig").close());
$("#tplBig").addEventListener("click", e => { if (e.target === $("#tplBig")) $("#tplBig").close(); });
tplStrip();

// ---------- timesheets and claims (step 9) ----------
let tsList = [], tsSheet = null;
const hm = Timesheets.hm;
function wireMany(drop, input, handler) {
  drop.addEventListener("click", () => input.click());
  drop.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
  drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", e => { e.preventDefault(); drop.classList.remove("over"); handler([...e.dataTransfer.files]); });
  input.addEventListener("change", () => { handler([...input.files]); input.value = ""; });
}
wireMany($("#dropTs"), $("#fileTs"), loadTimesheets);
wireDrop($("#dropTsXls"), $("#fileTsXls"), async (b, n) => {
  try { const wb = await Workbook.load(b.slice(0)); if (!wb.has(S.rc)) throw 0; tsSheet = { buf: b, name: n }; readLinks(wb).then(adoptLinks).catch(() => {}); $("#tsXlsName").textContent = "✓ " + n; $("#dropTsXls").classList.add("done"); await renderTs(); }
  catch (e) { $("#tsXlsName").textContent = "That file is not a Resource Creation Sheet."; $("#dropTsXls").classList.remove("done"); }
});
async function loadTimesheets(files) {
  const bad = [];
  for (const f of files.filter(f => /\.xlsx$/i.test(f.name))) {
    try {
      const wb = await Workbook.load(await f.arrayBuffer()); const t = await Timesheets.read(wb, f.name);
      if (!t.name) t.name = f.name.split("_")[0].replace(/\.xlsx$/i, "").trim();
      tsList = tsList.filter(x => x.file !== f.name).concat(t);
    } catch (e) { console.error(e); bad.push(`${f.name}: ${e.message || "could not be read"}`); }
  }
  if (files.some(f => !/\.xlsx$/i.test(f.name))) bad.push("Only .xlsx files can be read. In Google Sheets: File → Download → Microsoft Excel (.xlsx).");
  $("#tsNames").textContent = tsList.length ? "✓ " + tsList.map(t => t.file).join(", ") : "";
  $("#dropTs").classList.toggle("done", tsList.length > 0);
  say("#tsMsg", bad.join(" "), bad.length > 0);
  await renderTs();
}
// the Resource Creation Sheet used for planned time and logging: the one dropped here, else step 8, else step 7
async function tsBase() {
  if (tsSheet) return tsSheet;
  if (dev) return { buf: dev.buf, name: dev.name };
  if (filled) return { buf: await filled.blob.arrayBuffer(), name: filled.name };
  return null;
}
async function rcIndex() {
  const base = await tsBase(); if (!base) return null;
  const wb = await Workbook.load(base.buf.slice(0)); const rc = await wb.sheet(S.rc); const M = rcMap(rc); const idx = new Map();
  for (let r = S.rcFirstRow; r <= Math.max(S.rcLastRow, rc.lastUsedRow()); r++) {
    const t = k => M[k] ? rc.text(M[k] + r) : ""; if (!t("programme")) continue;
    const code = itemCode(t("programme"), t("type"), t("source"), t("element")); const d = M.devTime ? rc.get(M.devTime + r) : "";
    idx.set(code, { r, resource: t("resource"), planned: typeof d === "number" ? d * 1440 : null });
  }
  return idx;
}
const period = () => [Timesheets.date($("#claimFrom").value), Timesheets.date($("#claimTo").value)];
["#claimFrom", "#claimTo"].forEach(s => $(s).addEventListener("change", renderTs));
async function renderTs() {
  const on = tsList.length > 0; ["#dlClaim", "#tsClear", "#tsWorkplan"].forEach(s => $(s).disabled = !on);
  if (!on) { $("#tsOut").innerHTML = '<p class="empty">No timesheets added yet.</p>'; $("#dlTimeLog").disabled = true; return; }
  const idx = await rcIndex().catch(() => null); const [from, to] = period();
  $("#dlTimeLog").disabled = !idx;
  if (!idx) say("#tsMsg", "Add the Resource Creation Sheet (here, or in step 8) to log the time against each element.");
  $("#tsOut").innerHTML = tsList.map((t, k) => {
    const lines = Timesheets.claimLines(t.entries, from, to); const total = lines.reduce((a, l) => a + l.minutes, 0);
    const out = Timesheets.outside(t.entries, from, to); const warns = [...t.warnings];
    if (out.length) warns.push(`${out.length} entr${out.length === 1 ? "y is" : "ies are"} outside the claim period and left out of the claim lines.`);
    const codes = new Map(); t.entries.forEach(x => { if (x.code) codes.set(x.code, (codes.get(x.code) || 0) + x.minutes); });
    if (idx) [...codes.keys()].filter(c => !idx.has(c)).forEach(c => warns.push(`Item code ${c} is not in the Resource Creation Sheet.`));
    const elRows = [...codes.entries()].map(([c, mins]) => { const e = idx && idx.get(c); const over = e && e.planned != null && mins > e.planned;
      return `<tr><td class="ic">${esc(c)}</td><td>${esc(e ? e.resource : "Not in the sheet")}</td><td>${e && e.planned != null ? hm(e.planned) : "—"}</td><td class="${over ? "over" : ""}">${hm(mins)}${over ? " (over the plan)" : ""}</td></tr>`; }).join("");
    return `<div class="tscard"><h3>${esc(t.name || "Name not found")}</h3>
      <div class="meta">${esc(t.month || "Month not found")} · ${t.entries.length} entr${t.entries.length === 1 ? "y" : "ies"} · ${esc(t.file)} · <b>Claimable: ${hm(total)} (${total} minutes, ${(total / 60).toFixed(2)} hours)</b></div>
      <div class="tablewrap"><table><thead><tr><th>Nr.</th><th>Support Category</th><th>Start Date</th><th>End Date</th><th>Total Minutes</th><th>Hours</th><th>Task description summary</th></tr></thead><tbody>
      ${lines.map(l => `<tr><td>${l.nr}</td><td class="copy" data-v="${esc(l.cat)}">${esc(l.cat)}${l.known ? "" : " ⚠"}</td><td class="copy" data-v="${Timesheets.iso(l.start)}">${esc(Timesheets.nice(l.start))}</td><td class="copy" data-v="${Timesheets.iso(l.end)}">${esc(Timesheets.nice(l.end))}</td><td class="copy" data-v="${l.minutes}">${l.minutes}</td><td>${hm(l.minutes)}</td><td class="copy" data-v="${esc(l.task)}">${esc(l.task)}</td></tr>`).join("") || '<tr><td colspan="7">No claimable time in this period.</td></tr>'}
      </tbody></table></div>
      <div class="row"><button data-copy="${k}">Copy the claim lines</button><span class="small-note">Click any cell to copy just that value. The PDD Support Claim reads the workplans: use Send to the developers&#39; workplans below.</span></div>
      ${elRows ? `<details class="box"><summary>Time per element (planned vs logged)</summary><div class="tablewrap"><table><thead><tr><th>Item code</th><th>Resource</th><th>Planned</th><th>Logged</th></tr></thead><tbody>${elRows}</tbody></table></div></details>` : ""}
      ${warns.length ? `<div class="warns"><b>Check before claiming</b><ul>${warns.slice(0, 25).map(w => `<li>${esc(w)}</li>`).join("")}${warns.length > 25 ? `<li>and ${warns.length - 25} more</li>` : ""}</ul></div>` : ""}
    </div>`;
  }).join("");
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; }
  catch (e) { const a = document.createElement("textarea"); a.value = t; document.body.appendChild(a); a.select(); let ok = false; try { ok = document.execCommand("copy"); } catch (x) {} a.remove(); return ok; }
}
$("#tsOut").addEventListener("click", async e => {
  const cell = e.target.closest("td.copy"); const btn = e.target.closest("button[data-copy]");
  if (cell) { const ok = await copyText(cell.dataset.v); say("#tsMsg", ok ? `Copied: ${cell.dataset.v}` : "Copy is blocked in this browser.", !ok); }
  if (btn) {
    const t = tsList[+btn.dataset.copy]; const [from, to] = period();
    const tsv = Timesheets.claimLines(t.entries, from, to).map(l => [l.nr, l.cat, Timesheets.iso(l.start), Timesheets.iso(l.end), l.minutes, l.task].join("\t")).join("\n");
    const ok = await copyText(tsv); say("#tsMsg", ok ? `Claim lines for ${t.name} copied (Nr, Support Category, Start Date, End Date, Total Minutes, Task description).` : "Copy is blocked in this browser.", !ok);
  }
});
// sends each timesheet's month to the developer's Workplan and Time Schedule (the PDD Support Claim reads the workplans)
function workplanGroups(t, from, to) {
  const g = new Map();
  t.entries.filter(x => x.cat && x.known && (from == null || (x.date != null && x.date >= from)) && (to == null || (x.date != null && x.date <= to))).forEach(x => {
    const plo = String(x.plo || "").replace(/^\s*course\s+draft\s*[:\-–]\s*/i, "").trim(); const key = x.cat + "|" + plo; const o = g.get(key) || { cat: x.cat, plo, minutes: 0, start: null, end: null, items: [] };
    o.minutes += x.minutes; if (x.date != null) { o.start = o.start == null ? x.date : Math.min(o.start, x.date); o.end = o.end == null ? x.date : Math.max(o.end, x.date); }
    const it = x.desc || x.code; if (it && !o.items.includes(it)) o.items.push(it); g.set(key, o);
  });
  return [...g.values()].map(o => { let task = (o.plo ? o.plo + ": " : "") + (o.items.join(", ") || "time"); if (task.length > 95) task = task.slice(0, 94) + "…";
    return { cat: o.cat, course: o.plo, minutes: o.minutes, task, start: Timesheets.iso(o.start), end: Timesheets.iso(o.end) }; });
}
function monthLabel(t) {
  if (/^[A-Za-z]+ \d{4}$/.test(t.month || "")) return t.month;
  const d = t.entries.map(x => x.date).filter(x => x != null).sort((p, q) => q - p)[0];
  if (d == null) return t.month || ""; const dt = new Date(Date.UTC(1899, 11, 30) + d * 86400000);
  return MONTH_NAMES[dt.getUTCMonth()] + " " + dt.getUTCFullYear();
}
$("#tsWorkplan").addEventListener("click", async () => {
  if (!backup) { say("#tsMsg", "", true); $("#tsMsg").innerHTML = "Connect the project's Google Drive first: the workplans are updated through it. <button type=\"button\" class=\"secondary\" id=\"toBk\">Go to step 1</button> Or send from Google Sheets: in the project's Resource Creation Sheet, PDD tools → Send timesheets to the workplans…."; const tb = $("#toBk"); if (tb) tb.onclick = () => goStep("#bkLink"); return; }
  const [from, to] = period(); const manager = $("#dces").value.trim() || (dev && dev.info && dev.info.dces) || "";
  if (!manager) { say("#tsMsg", "", true); $("#tsMsg").innerHTML = "Add the DCES (project lead) in step 1 first: it goes into each workplan row as the manager. <button type=\"button\" class=\"secondary\" id=\"toDces\">Go to step 1</button>"; const tb = $("#toDces"); if (tb) tb.onclick = () => { goStep("#dces"); setTimeout(() => $("#dces").focus(), 300); }; return; }
  $("#tsWorkplan").disabled = true; say("#tsMsg", "Sending to the workplans…");
  const out = [];
  for (const t of tsList) {
    try {
      const r = await backupPost({ action: "workplan", developer: t.name, month: monthLabel(t), manager, groups: workplanGroups(t, from, to) });
      out.push(`<b>${esc(t.name)}</b> → <a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.workplan)}</a>: ` + r.rows.map(x => `${esc(x.task)} (${esc(x.result)})`).join("; "));
    } catch (e) { out.push(`<b>${esc(t.name)}</b>: ${esc(e.message || e)}`); }
  }
  $("#tsWorkplan").disabled = false; $("#tsMsg").innerHTML = out.join("<br>");
});
$("#tsClear").addEventListener("click", () => { tsList = []; $("#tsNames").textContent = ""; $("#dropTs").classList.remove("done"); say("#tsMsg", ""); renderTs(); });

// writes every entry into the Time Log tab; a timesheet added again replaces its earlier rows (same developer and month)
$("#dlTimeLog").addEventListener("click", async () => {
  const base = await tsBase(); if (!base || !tsList.length) return;
  try {
    const wb = await Workbook.load(base.buf.slice(0)); const L0 = S.timeLogFirstRow || 5, L1 = S.timeLogLastRow || 1504;
    let tl = wb.has(S.timeLog) ? await wb.sheet(S.timeLog) : null; const plain = !tl;
    if (!tl) tl = await wb.addSheet(S.timeLog, ["Developer", "Month", "Date", "PLO name", "Activity category", "Item code", "Item description", "Start time", "End time", "Duration (hh:mm)", "Minutes", "From timesheet"], [20, 14, 12, 30, 30, 22, 22, 10, 10, 12, 9, 34]);
    const COLS = "ABCDEFGHIJKL".split("");
    const replace = new Set(tsList.map(t => (t.name + "|" + t.month).toLowerCase()));
    const kept = []; let prevLast = L0 - 1;
    for (let r = L0; r <= Math.min(L1, tl.lastUsedRow()); r++) {
      const v = COLS.map(c => tl.get(c + r)); if (!v[0] && !v[10]) continue; prevLast = r;
      if (replace.has((String(v[0]) + "|" + String(v[1])).toLowerCase())) continue; kept.push(v);
    }
    const fresh = tsList.flatMap(t => t.entries.map(x => [t.name, t.month, x.date == null ? "" : x.date, x.plo, x.cat, x.code, x.desc, x.start == null ? "" : x.start, x.end == null ? "" : x.end, x.minutes / 1440, x.minutes, t.file]));
    const all = kept.concat(fresh).slice(0, L1 - L0 + 1);
    const last = Math.max(prevLast, L0 + all.length - 1);
    for (let i = 0, r = L0; r <= Math.min(last, L1); i++, r++) {
      const v = all[i];
      COLS.forEach((c, k) => {
        let val = v ? v[k] : "";
        if (plain && v) { if (k === 2 && typeof val === "number") val = Timesheets.iso(val); if ((k === 7 || k === 8 || k === 9) && typeof val === "number") val = hm(val * 1440); }
        if (k === 9 && !plain) { tl.setCached(c + r, v && typeof val === "number" ? val : ""); return; }
        tl.set(c + r, val === undefined ? "" : val);
      });
    }
    // Resource Creation: show the time logged per element straight away (the formulas recalculate when the file opens)
    const rc = await wb.sheet(S.rc); const M = rcMap(rc); const byCode = new Map();
    all.forEach(v => { if (v[5]) byCode.set(String(v[5]), (byCode.get(String(v[5])) || 0) + (+v[10] || 0)); });
    if (M.logged) for (let r = S.rcFirstRow; r <= Math.max(S.rcLastRow, rc.lastUsedRow()); r++) {
      const t = k => M[k] ? rc.text(M[k] + r) : ""; if (!t("programme")) continue;
      const mins = byCode.get(itemCode(t("programme"), t("type"), t("source"), t("element"))); rc.setCached(M.logged + r, mins ? mins / 1440 : "");
    }
    save(await wb.blob(), base.name.replace(/\.xlsx$/i, "") + ".xlsx", "sheet");
    say("#tsMsg", `${fresh.length} time entr${fresh.length === 1 ? "y" : "ies"} logged in the ${S.timeLog} tab${kept.length ? ` (with ${kept.length} kept from earlier timesheets)` : ""}.` + (M.logged ? " Resource Creation shows the time logged for each element." : " This sheet has no Time logged column: use the newest blank T06 for that."));
  } catch (e) { console.error(e); say("#tsMsg", "The sheet could not be updated: " + (e.message || e), true); }
});

// a claim summary per developer, to check and file with the PDD Support Claim
$("#dlClaim").addEventListener("click", async () => {
  if (!tsList.length) return; const [from, to] = period(); const d = new WordDoc.Doc();
  tsList.forEach((t, k) => {
    if (k) d.pageBreak();
    const lines = Timesheets.claimLines(t.entries, from, to); const total = lines.reduce((a, l) => a + l.minutes, 0);
    d.h(1, `Claim summary: ${t.name || "name not found"}`);
    d.p(`${t.month || ""}${from != null || to != null ? ` · claim period ${Timesheets.nice(from) || "start"} to ${Timesheets.nice(to) || "end"}` : ""}`, { bold: true, color: "007DBA", size: 13 });
    d.p("These lines go into the developer's Workplan and Time Schedule (step 9: Send to the developers' workplans), which the PDD Support Claim reads. The claim sheet works out the payment from the claimant's rate.");
    d.table(["Nr.", "Support Category", "Start Date", "End Date", "Total Minutes", "Task description summary"],
      lines.map(l => [String(l.nr), l.cat, Timesheets.nice(l.start), Timesheets.nice(l.end), String(l.minutes), l.task]), [600, 2900, 1300, 1300, 1000, 2500]);
    d.label("Total time", `${total} minutes (${(total / 60).toFixed(2)} hours, ${hm(total)})`);
    d.h(2, "Where the time went");
    d.table(["Support Category", "Element or task", "Minutes", "hh:mm"], lines.flatMap(l => l.items.map(([it, m]) => [l.cat, it, String(m), hm(m)])), [3400, 3600, 1200, 1400]);
    const out = Timesheets.outside(t.entries, from, to); const warns = [...t.warnings]; if (out.length) warns.push(`${out.length} entries are outside the claim period.`);
    if (warns.length) { d.h(2, "Checked before claiming"); warns.forEach(w => d.bullet(w)); }
    d.h(2, "Sign-off");
    d.p("Checked by DCES: ______________________________   Date: ______________");
    d.p("Timesheet: " + t.file, { italic: true, color: "5B7F95" });
  });
  save(await d.blob("Claim summary"), `Claim_summary_${tsList.length === 1 ? safe(tsList[0].name).replace(/\s+/g, "_") : "developers"}.docx`, "claims");
});

// ---------- reset for the next course ----------
function resetSorter(keepSheet) {
  const keep = keepSheet && filled && sheet;
  model = null; items = []; dev = null; filled = null;
  if (!keep) sheet = null;
  const clear = keep ? ["ccode", "cname", "due"] : SETUP;
  clear.forEach(k => { $("#" + k).value = ""; $("#" + k).classList.remove("missing"); savedSetup[k] = ""; });
  teamSelects(); storeSetup();
  $("#docName").textContent = ""; $("#dropDoc").classList.remove("done");
  if (!keep) { $("#xlsName").textContent = ""; $("#dropXls").classList.remove("done"); $("#progs").innerHTML = ""; loadBlank(); }
  else $("#xlsName").textContent = "✓ " + sheet.name + " (with the last course added)";
  $("#summary").innerHTML = ""; $("#tabs").innerHTML = ""; $("#mods").innerHTML = '<p class="empty">Add the approved draft in step 4.</p>'; resetReview();
  $("#dupWarn").innerHTML = ""; say("#confirmMsg", ""); setDownloads();
  $("#devName").textContent = ""; $("#dropDev").classList.remove("done");
  $("#devSel").innerHTML = "<option>Add the sheet first</option>"; $("#devSel").disabled = true; $("#dlPack").disabled = true; $("#dlDevSheet").disabled = true; $("#dlTs").disabled = true;
  say("#devMsg", ""); $("#devPreview tbody").innerHTML = ""; $("#devLinks").innerHTML = "";
  codePreview(); gallery();
  $("#loadMsg").textContent = keep ? "Ready for the next course: add its draft. New rows go below the last course in the same sheet." : "The Hub is empty and the blank template is loaded. Add a course draft to start.";
  goStep("#s0");
}
// reset asks for a second click, so nothing is lost by accident
function armReset(btn, keepSheet) {
  const label = btn.textContent; let armed = false, t = null;
  btn.addEventListener("click", () => {
    if (!armed && (model || filled || (sheet && !sheet.blank))) { armed = true; btn.textContent = filled ? "Downloaded the sheet? Click again to reset" : "Click again to reset"; t = setTimeout(() => { armed = false; btn.textContent = label; }, 5000); return; }
    clearTimeout(t); armed = false; btn.textContent = label; resetSorter(keepSheet);
  });
}
armReset($("#resetBtn"), false); armReset($("#resetBtn2"), false);
$("#nextSame").addEventListener("click", () => resetSorter(true));

// open with the blank T06 template ready; the example draft loads only when asked
loadBlank();
// if assets/ is not in the repository, show the built-in copy of the logo (files.js)
(() => { const img = document.querySelector(".wcg-logo"); const fix = () => { if (img && img.complete && img.naturalWidth === 0 && window.LOGO_DATA) img.src = window.LOGO_DATA; }; fix(); window.addEventListener("load", fix); })();
// the logo on the page also goes into the header of every Word document the Hub makes
(() => { const img = document.querySelector(".wcg-logo"); if (img) fetch("assets/wcg-education-logo.png").then(r => r.ok ? r : fetch(window.LOGO_DATA || img.src)).catch(() => fetch(window.LOGO_DATA || img.src)).then(r => r.ok ? r.arrayBuffer() : null).then(b => { if (b) WordDocLogo.bytes = new Uint8Array(b); }).catch(() => {}); })();
})();
