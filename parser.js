// PDD Course Design Hub: reads a course draft (.docx). Rules live in config.js.
// Course draft parser: reads a .docx and sorts it into course page content, modules, topics and resources.
const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

function kids(el, local) { const out = []; for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 1 && (!local || n.localName === local)) out.push(n); return out; }
function first(el, local) { for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 1 && n.localName === local) return n; return null; }
function all(el, local) { return Array.from(el.getElementsByTagNameNS(W_NS, local)); }
function wattr(el, name) { return el ? (el.getAttributeNS(W_NS, name) || el.getAttribute("w:" + name)) : null; }
function clean(s) { return s.replace(/ /g, " ").replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").trim(); }
function words(s) { const t = (s || "").trim(); return t ? t.split(/\s+/).length : 0; }

const CFG = (typeof SORTER_CONFIG !== "undefined") ? SORTER_CONFIG : require("./config.js");
const COURSE_TABS = CFG.courseTabs;
function classifyLabel(t) {
  for (const a of CFG.activities) if (a.match.test(t)) return { kind: a.kind, code: a.code, tool: a.tool, q: a.question || "None" };
  return null;
}
function classifyLink(url) {
  for (const l of CFG.links) if (l.match.test(url)) return { kind: l.kind, code: l.code, tool: l.tool };
  return null;
}

async function parseDocx(buf, JSZip, DOMParserImpl) {
  const zip = await JSZip.loadAsync(buf);
  const parse = s => new DOMParserImpl().parseFromString(s, "application/xml");
  const doc = parse(await zip.file("word/document.xml").async("string"));
  const rels = {};
  const relFile = zip.file("word/_rels/document.xml.rels");
  if (relFile) {
    const rd = parse(await relFile.async("string"));
    Array.from(rd.getElementsByTagName("Relationship")).forEach(r => { rels[r.getAttribute("Id")] = r.getAttribute("Target"); });
  }
  const styles = {};
  const stFile = zip.file("word/styles.xml");
  if (stFile) {
    const sd = parse(await stFile.async("string"));
    all(sd, "style").forEach(st => {
      const id = wattr(st, "styleId"); const nm = first(st, "name"); const ppr = first(st, "pPr");
      const ol = ppr ? first(ppr, "outlineLvl") : null;
      styles[id] = { name: (nm ? wattr(nm, "val") : id) || id, outline: ol ? parseInt(wattr(ol, "val"), 10) : null };
    });
  }
  const comments = {};
  const cmFile = zip.file("word/comments.xml");
  if (cmFile) {
    const cd = parse(await cmFile.async("string"));
    const reviewer = CFG.review ? CFG.review.author : null; // comments left by the learning design review are not flags
    all(cd, "comment").forEach(c => { if (reviewer && wattr(c, "author") === reviewer) return; comments[wattr(c, "id")] = { author: wattr(c, "author") || "", text: clean(all(c, "t").map(t => t.textContent).join(" ")) }; });
  }

  let coreTitle = "";
  const coreFile = zip.file("docProps/core.xml");
  if (coreFile) { const m = (await coreFile.async("string")).match(/<dc:title>([^<]*)<\/dc:title>/); if (m) coreTitle = m[1].trim(); }
  // --- flatten the body into blocks ---
  const blocks = [];
  function paraInfo(p) {
    const ppr = first(p, "pPr");
    const ps = ppr ? first(ppr, "pStyle") : null; const sid = ps ? wattr(ps, "val") : null;
    const st = sid ? styles[sid] : null; const nm = st ? st.name.toLowerCase() : "";
    let level = null;
    const m = nm.match(/^heading\s*(\d)/); if (m) level = parseInt(m[1], 10);
    else if (nm === "title") level = 0;
    else if (ppr && first(ppr, "outlineLvl")) level = parseInt(wattr(first(ppr, "outlineLvl"), "val"), 10) + 1;
    else if (st && st.outline !== null && st.outline < 9) level = st.outline + 1;
    const isList = !!(ppr && first(ppr, "numPr"));
    let text = "", boldChars = 0, allChars = 0; const links = [];
    const walk = (node, href) => {
      for (let n = node.firstChild; n; n = n.nextSibling) {
        if (n.nodeType !== 1) continue;
        const ln = n.localName;
        if (ln === "hyperlink") {
          const rid = n.getAttributeNS(R_NS, "id") || n.getAttribute("r:id");
          const url = rid ? rels[rid] : null; const before = text.length;
          walk(n, url);
          if (url && /^https?:/i.test(url)) links.push({ url, label: clean(text.slice(before)) });
        } else if (ln === "r") {
          const rpr = first(n, "rPr"); const b = rpr ? first(rpr, "b") : null;
          const bold = b && !["0", "false"].includes(wattr(b, "val") || "");
          for (let c = n.firstChild; c; c = c.nextSibling) {
            if (c.nodeType !== 1) continue;
            if (c.localName === "t") { const s = c.textContent; text += s; const k = s.replace(/\s/g, "").length; allChars += k; if (bold) boldChars += k; }
            else if (c.localName === "tab") text += " ";
            else if (c.localName === "br" || c.localName === "cr") text += "\n";
          }
        } else if (ln === "smartTag" || ln === "ins" || ln === "fldSimple" || ln === "sdt" || ln === "sdtContent") walk(n, href);
      }
    };
    walk(p, null);
    const cids = all(p, "commentRangeStart").map(c => wattr(c, "id"));
    return { type: "p", level, style: nm, isList, text: clean(text), bold: allChars > 0 && boldChars / allChars > 0.95, links, comments: cids.map(i => comments[i]).filter(Boolean) };
  }
  function addBody(el) {
    for (const n of kids(el)) {
      if (n.localName === "p") blocks.push(paraInfo(n));
      else if (n.localName === "tbl") {
        const rows = kids(n, "tr").map(tr => kids(tr, "tc").map(tc => clean(kids(tc, "p").map(p => paraInfo(p).text).join(" "))));
        const links = all(n, "hyperlink").map(h => rels[h.getAttributeNS(R_NS, "id") || h.getAttribute("r:id")]).filter(u => u && /^https?:/.test(u)).map(url => ({ url, label: "" }));
        blocks.push({ type: "tbl", rows, links, comments: all(n, "commentRangeStart").map(c => comments[wattr(c, "id")]).filter(Boolean) });
      } else if (n.localName === "sdt") {
        const xml = n.textContent || ""; const gal = all(n, "docPartGallery").map(g => wattr(g, "val") || "").join(" ");
        const instr = all(n, "instrText").map(t => t.textContent).join(" ");
        if (/table of contents/i.test(gal) || /\bTOC\b/.test(instr)) { blocks.push({ type: "toc" }); continue; }
        const c = first(n, "sdtContent"); if (c) addBody(c);
      }
    }
  }
  addBody(first(doc.documentElement, "body"));

  // --- build the model ---
  const model = { preamble: [], course: [], modules: [], references: [], skipped: 0, title: "" };
  const titleBlock = blocks.find(b => b.type === "p" && b.level === 0 && b.text);
  model.title = titleBlock ? titleBlock.text : coreTitle;
  let section = null, mod = null, topic = null, el = null, modeOutcomes = false, seenHeading = false, endedModules = false;
  const newEl = (title, info, num) => { el = { title, kind: info.kind, code: info.code, tool: info.tool, q: info.q || "None", lines: [], links: [], notes: [], num }; topic.elements.push(el); return el; };
  const ensureTopic = () => { if (!topic) { topic = { title: "Module introduction", num: "", elements: [] }; mod.topics.push(topic); } if (!el) newEl(topic.title, { kind: "Reading page", code: "Text", tool: "Moodle" }, topic.num); };
  const noteFlags = (b, target) => {
    (b.comments || []).forEach(c => target.notes.push(`Comment${c.author ? " (" + c.author + ")" : ""}: ${c.text}`));
  };
  for (const b of blocks) {
    if (b.type === "toc") continue;
    if (b.type === "p" && !b.text && !(b.level !== null)) continue;
    const isHead = b.type === "p" && b.level !== null && b.level >= 0 && b.level <= 4;
    if (!seenHeading && !isHead) { if (b.type === "p" && b.text) model.preamble.push(b.text); continue; }
    if (isHead) {
      seenHeading = true;
      const t = b.text;
      if (!t) continue;
      if (b.level <= 1) {
        if (/^module\b/i.test(t)) { mod = { title: t.replace(/\s+/g, " "), topics: [], outcomes: [], activities: [], notes: [] }; model.modules.push(mod); topic = null; el = null; modeOutcomes = false; endedModules = false; continue; }
        if (/reference|reading list|bibliograph/i.test(t)) { section = { title: t, lines: [], kind: "references" }; model.references.push(section); mod = null; topic = null; el = null; endedModules = true; continue; }
        if (mod && !endedModules) { topic = { title: t, num: "", elements: [] }; mod.topics.push(topic); el = null; newEl(t, { kind: "Reading page", code: "Text", tool: "Moodle" }, ""); modeOutcomes = false; continue; }
      }
      if (!mod) { section = { title: t, level: b.level, lines: [] }; model.course.push(section); continue; }
      // heading 2 = topic, heading 3+ = sub-topic inside the topic
      const num = (t.match(/^(\d+(?:\.\d+)*)\.?\s/) || [])[1] || "";
      if (b.level === 2) { topic = { title: t, num, elements: [] }; mod.topics.push(topic); el = null; newEl(t, { kind: "Reading page", code: "Text", tool: "Moodle" }, num); modeOutcomes = false; continue; }
      ensureTopic(); const lab = classifyLabel(t); if (num) topic.cur = num;
      newEl(t, lab || { kind: "Reading page", code: "Text", tool: "Moodle" }, num || topic.cur || topic.num); continue;
    }
    if (!mod) {
      if (!section) continue;
      if (b.type === "p") section.lines.push((b.isList ? "• " : "") + b.text);
      else if (b.type === "tbl") b.rows.forEach(r => section.lines.push(r.join(" | ")));
      continue;
    }
    // inside a module
    if (b.type === "p" && !b.isList && /^(outcomes|learning outcomes|activities)\:?$/i.test(b.text)) { modeOutcomes = /activit/i.test(b.text) ? "activities" : "outcomes"; continue; }
    if (modeOutcomes && !topic) {
      if (b.type === "p" && b.text) {
        const br = Array.from(b.text.matchAll(/\[([^\]]+)\]?/g)).map(m => m[1].trim());
        br.forEach(n => mod.notes.push("Editor note: " + n.replace(/[{}]/g, "")));
        const plainO = clean(b.text.replace(/\[[^\]]*\]?/g, ""));
        if (plainO && !/following activities|should be able to/i.test(plainO)) mod[modeOutcomes === "activities" ? "activities" : "outcomes"].push(plainO);
      }
      continue;
    }
    if (b.type === "tbl") {
      ensureTopic();
      const hdr = b.rows[0] || []; const title = `Table: ${hdr.filter(Boolean).join(" · ") || "untitled"}`;
      const t = newEl(title, { kind: "Table", code: "T", tool: "Moodle" }, (topic.cur || topic.num));
      b.rows.forEach(r => t.lines.push(r.join(" | ")));
      b.links.forEach(l => t.links.push(l)); noteFlags(b, t);
      t.notes.push("Table: could become an infographic (IG) or an accordion (A)");
      el = null; continue;
    }
    const t = b.text;
    // editor notes in square brackets
    const brackets = Array.from(t.matchAll(/\[([^\]]+)\]/g)).map(m => m[1].trim());
    const plain = clean(t.replace(/\[[^\]]*\]/g, ""));
    const lab = !b.isList && b.bold && t.length <= 140 ? classifyLabel(t) : null;
    const numbered = !b.isList && b.bold && /^\d+(\.\d+)+\s+\S/.test(t);
    if (lab || numbered) {
      ensureTopic();
      if (numbered) topic.cur = t.match(/^(\d+(?:\.\d+)+)/)[1];
      newEl(t.replace(/:$/, ""), lab || { kind: "Reading page", code: "Text", tool: "Moodle" }, topic.cur || topic.num);
      noteFlags(b, el); continue;
    }
    if (!b.isList && /^download\b/i.test(t) && t.length < 40) {
      ensureTopic(); const d = newEl(t, classifyLabel("download"), (topic.cur || topic.num)); d.notes.push("Placeholder: add the download file"); el = null; continue;
    }
    if (!b.isList && !b.bold && /^(reflective post|reflection|forum post|knowledge check|quiz|assignment)\b.*:?$/i.test(t) && t.length < 60) {
      ensureTopic(); newEl(t.replace(/:$/, ""), classifyLabel(t), (topic.cur || topic.num)); continue;
    }
    ensureTopic();
    for (const n of brackets) {
      if (/^end$/i.test(n)) continue;
      const lm = n.match(/open in new window\s*:?\s*(https?:\S+)/i);
      if (lm) continue;
      el.notes.push(`Editor note: ${n}`);
    }
    let target = el;
    for (const l of b.links) {
      const k = classifyLink(l.url);
      if (k && !(el.links.some(x => x.url === l.url))) {
        const e2 = { title: (l.label && l.label !== l.url && !/^https?:/.test(l.label)) ? `${k.kind}: ${l.label}` : `${k.kind} (${k.tool})`, kind: k.kind, code: k.code, tool: k.tool, q: "None", lines: [], links: [l], notes: [], num: (topic.cur || topic.num) };
        topic.elements.push(e2);
      } else target.links.push(l);
    }
    noteFlags(b, target);
    if (plain) target.lines.push((b.isList ? "• " : "") + (b.bold && !b.isList ? plain : plain));
    else if (b.isList && !b.links.length) target.notes.push("Empty bullet in the document");
  }
  // tidy: drop empty reading pages that have no text, links or notes
  model.modules.forEach(m => m.topics.forEach(t => {
    t.elements = t.elements.filter(e => e.lines.length || e.links.length || e.notes.length || e.code !== "Text");
    t.elements.forEach(e => { e.text = e.lines.join("\n"); e.words = words(e.text); if (!e.text && !["IR", "V", "IG", "G"].includes(e.code)) e.notes.push("No content yet"); });
    if (!t.elements.length) t.elements.push({ title: t.title, kind: /^download/i.test(t.title) ? "Download" : "Reading page", code: /^download/i.test(t.title) ? "G" : "Text", tool: /^download/i.test(t.title) ? "Google Docs" : "Moodle", q: "None", lines: [], links: [], notes: [/^download/i.test(t.title) ? "Placeholder: add the download file" : "Heading with no content yet"], num: t.num, text: "", words: 0 });
  }));
  model.modules.forEach(m => { if (!m.outcomes.filter(x => x.trim()).length) m.notes.push("Module outcomes are missing"); });
  model.tabs_missing = [];
  // course page tabs
  const tabs = COURSE_TABS.map(([name]) => ({ name, parts: [] })); const other = [];
  model.course.forEach(s => {
    const i = COURSE_TABS.findIndex(([, re]) => re.test(s.title));
    const txt = [s.title, ...s.lines].join("\n");
    if (i >= 0) tabs[i].parts.push(txt); else other.push(txt);
  });
  model.references.forEach(s => tabs[5].parts.push([s.title, ...s.lines].join("\n")));
  model.tabs = tabs.map(t => ({ name: t.name, text: t.parts.join("\n\n"), words: words(t.parts.join(" ")) }));
  model.tabs.forEach(t => { const body = t.text.split("\n").slice(1).join(" "); t.flag = !t.text ? "Missing from the draft" : (words(body) < 8 ? "Heading only: add the content" : ""); });
  model.otherCourse = other;
  return model;
}

function intakeRows(model) {
  const rows = []; let n = 0; const used = {};
  const uniq = base => { const b = base.replace(/\s+/g, ""); used[b] = (used[b] || 0) + 1; return used[b] === 1 ? b : b + String.fromCharCode(95 + used[b]); };
  // course page tabs share one resource number
  if (model.tabs.some(t => t.text)) {
    n++;
    model.tabs.forEach(t => rows.push({ ref: "CP", title: t.name, text: t.text || "[To write]", notes: t.flag || "", keep: "Keep", module: "Course page", res: n, code: "ME", tool: "Moodle", q: "None" }));
  }
  model.modules.forEach((m, mi) => {
    if (m.outcomes.length) {
      n++; rows.push({ ref: uniq(`M${mi + 1}.O`), title: `${m.title}: outcomes`, text: m.outcomes.map(o => "• " + o).join("\n"), notes: m.notes.join("\n"), keep: "Keep", module: m.title, res: n, code: "Text", tool: "Moodle", q: "None" });
    }
    m.topics.forEach((t, ti) => t.elements.forEach(e => {
      n++;
      rows.push({ ref: uniq(e.num || t.num || `M${mi + 1}.${ti + 1}`), title: e.title, text: e.text || "", notes: [...e.links.map(l => (l.label ? l.label + ": " : "") + l.url), ...e.notes].join("\n"),
        keep: "Keep", module: m.title, topic: t.title, res: n, code: e.code, tool: e.tool, q: e.q || "None", kind: e.kind, words: e.words, flags: e.notes, lines: e.lines, links: e.links });
    }));
  });
  return rows;
}
function tsv(rows, cols) {
  const esc = v => { const s = String(v == null ? "" : v); return /[\t\n"]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return rows.map(r => cols.map(c => esc(r[c])).join("\t")).join("\r\n");
}
if (typeof module !== "undefined") module.exports = { parseDocx, intakeRows, tsv };
