// PDD Course Design Hub: learning design review.
// Reads a course draft (.docx), checks it against Universal Design for Learning (UDL) and the CTLI Moodle course flow,
// and writes a reviewed copy of the same document: added sections as tracked changes (highlighted), advice as comments,
// and a summary page at the front. The wording of every suggestion is in config.js (review).
const UDLReview = (() => {
  const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const WP = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
  const RV = () => (typeof SORTER_CONFIG !== "undefined" ? SORTER_CONFIG.review : require("./config.js").review);

  const kidsOf = (el, name) => { const o = []; for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 1 && (!name || n.localName === name)) o.push(n); return o; };
  const firstOf = (el, name) => kidsOf(el, name)[0] || null;
  const allOf = (el, name) => Array.from(el.getElementsByTagNameNS(W, name));
  const att = (el, name) => el ? (el.getAttributeNS(W, name) || el.getAttribute("w:" + name)) : null;
  const tidy = s => s.replace(/ /g, " ").replace(/[ \t]+/g, " ").trim();
  const wc = s => (s.trim() ? s.trim().split(/\s+/).length : 0);
  const snippet = (s, n = 160) => { s = tidy(s); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

  async function review(buf, opts = {}) {
    const cfg = RV(); const accepted = !!opts.accepted;
    const zip = await JSZip.loadAsync(buf);
    const P = new DOMParser(); const S = new XMLSerializer();
    const parse = s => P.parseFromString(s, "application/xml");
    const doc = parse(await zip.file("word/document.xml").async("string"));
    const body = firstOf(doc.documentElement, "body");
    // styles: heading levels and the ids to use for new paragraphs
    const styles = {}; const byName = {};
    const stFile = zip.file("word/styles.xml");
    if (stFile) allOf(parse(await stFile.async("string")), "style").forEach(st => {
      const id = att(st, "styleId"); const nm = firstOf(st, "name"); const name = ((nm && att(nm, "val")) || id || "").toLowerCase();
      const ppr = firstOf(st, "pPr"); const ol = ppr ? firstOf(ppr, "outlineLvl") : null;
      styles[id] = { name, outline: ol ? parseInt(att(ol, "val"), 10) : null }; byName[name] = id;
    });
    const rels = {};
    const relFile = zip.file("word/_rels/document.xml.rels"); const relDoc = relFile ? parse(await relFile.async("string")) : null;
    if (relDoc) Array.from(relDoc.getElementsByTagName("Relationship")).forEach(r => { rels[r.getAttribute("Id")] = r.getAttribute("Target"); });

    // ---- read the blocks in order ----
    const blocks = [];
    const info = p => {
      const ppr = firstOf(p, "pPr"); const ps = ppr ? firstOf(ppr, "pStyle") : null; const st = ps ? styles[att(ps, "val")] : null;
      const nm = st ? st.name : ""; let level = null; const m = nm.match(/^heading\s*(\d)/);
      if (m) level = +m[1]; else if (nm === "title") level = 0;
      else if (ppr && firstOf(ppr, "outlineLvl")) level = +att(firstOf(ppr, "outlineLvl"), "val") + 1;
      else if (st && st.outline !== null && st.outline < 9) level = st.outline + 1;
      let text = "", bold = 0, all = 0;
      allOf(p, "r").forEach(r => { const rp = firstOf(r, "rPr"); const b = rp ? firstOf(rp, "b") : null; const isB = b && !["0", "false"].includes(att(b, "val") || "");
        kidsOf(r, "t").forEach(t => { text += t.textContent; const k = t.textContent.replace(/\s/g, "").length; all += k; if (isB) bold += k; }); });
      const links = allOf(p, "hyperlink").map(h => { const id = h.getAttributeNS(R, "id") || h.getAttribute("r:id"); return { url: id ? rels[id] : "", label: tidy(allOf(h, "t").map(t => t.textContent).join("")) }; }).filter(l => l.url && /^https?:/i.test(l.url));
      const pics = Array.from(p.getElementsByTagNameNS(WP, "docPr")).filter(d => !(d.getAttribute("descr") || "").trim()).length;
      return { node: p, type: "p", level, text: tidy(text), bold: all > 0 && bold / all > 0.95, list: !!(ppr && firstOf(ppr, "numPr")), links, pics };
    };
    const walk = el => kidsOf(el).forEach(n => {
      if (n.localName === "p") blocks.push(info(n));
      else if (n.localName === "tbl") blocks.push({ node: n, type: "tbl", level: null, text: tidy(allOf(n, "t").map(t => t.textContent).join(" ")), rows: kidsOf(n, "tr").length, links: [], pics: 0 });
      else if (n.localName === "sdt") { const c = firstOf(n, "sdtContent"); if (c) walk(c); }
    });
    walk(body);

    // ---- structure: course page sections, modules, topics ----
    const course = []; const modules = []; let sec = null, mod = null, top = null, seen = false, ended = false;
    blocks.forEach(b => {
      const head = b.type === "p" && b.level !== null && b.level <= 4 && b.text;
      if (head) seen = true;
      if (!seen) return;
      if (head && b.level <= 1 && /^module\b/i.test(b.text)) { mod = { head: b, title: b.text, topics: [], blocks: [], outcomes: false }; modules.push(mod); top = null; ended = false; return; }
      if (head && b.level <= 1 && /reference|reading list|bibliograph/i.test(b.text)) { ended = true; mod = null; sec = { head: b, title: b.text, blocks: [], ref: true }; course.push(sec); return; }
      if (!mod || ended) { if (head && b.level <= 2) { sec = { head: b, title: b.text, blocks: [] }; course.push(sec); } else if (sec) sec.blocks.push(b); return; }
      mod.blocks.push(b);
      if (head && b.level >= 1) { top = { head: b, title: b.text, blocks: [] }; mod.topics.push(top); return; }
      if (b.type === "p" && /^(outcomes|learning outcomes)\s*:?$/i.test(b.text)) mod.outcomes = true;
      if (top) top.blocks.push(b);
    });
    const firstModHead = modules.length ? modules[0].head.node : null;

    // ---- rules ----
    const out = []; let n = 0;
    const msg = (k, vars = {}) => (cfg.messages[k] || k).replace(/\{(\w+)\}/g, (_, v) => vars[v] != null ? vars[v] : "");
    const add = s => { s.id = ++n; out.push(s); };
    const textOf = list => list.map(b => b.text).join(" ");
    // course page tabs
    const tabs = (typeof SORTER_CONFIG !== "undefined" ? SORTER_CONFIG : require("./config.js")).courseTabs;
    const tabHit = tabs.map(([name, re]) => ({ name, sec: course.find(s => !s.ref && re.test(s.title)) || (/reference/i.test(name) ? course.find(s => s.ref) : null) }));
    tabHit.forEach(t => {
      if (!t.sec) {
        if (firstModHead) add({ principle: "Moodle flow", where: "Course page", anchor: firstModHead, mode: "before", title: msg("tabMissingTitle", { tab: t.name }), detail: msg("tabMissing", { tab: t.name }), original: "Not in the draft",
          insert: [{ style: "h1", text: t.name }, ...(cfg.tabStarters[t.name] || ["[Write this tab]"]).map(x => ({ text: x }))] });
      } else if (wc(textOf(t.sec.blocks)) < 8) add({ principle: "Moodle flow", where: "Course page: " + t.name, anchor: t.sec.head.node, mode: "comment", title: msg("tabThinTitle", { tab: t.name }), detail: msg("tabThin", { tab: t.name }), original: t.sec.title });
    });
    const desc = tabHit[0].sec;
    if (desc && !/\b(welcome|you will|this course (helps|supports|is for))\b/i.test(textOf(desc.blocks)))
      add({ principle: "Engagement", where: "Course page: Course Description", anchor: desc.head.node, mode: "comment", title: msg("welcomeTitle"), detail: msg("welcome"), original: snippet(textOf(desc.blocks)) });
    // objectives that cannot be observed
    const weakVerb = /\b(understand|know|learn about|appreciate|be aware of|become familiar with|familiarise|realise|grasp)\b/i;
    const objSecs = [tabHit[1].sec].filter(Boolean);
    objSecs.forEach(s => s.blocks.filter(b => b.type === "p" && weakVerb.test(b.text)).slice(0, 6).forEach(b =>
      add({ principle: "Action & Expression", where: "Learning Objectives", anchor: b.node, mode: "comment", title: msg("verbTitle"), detail: msg("verb", { verb: b.text.match(weakVerb)[0] }), original: snippet(b.text) })));
    // modules
    modules.forEach((m, mi) => {
      const all = textOf(m.blocks); const label = m.title.replace(/\s+/g, " ");
      const last = m.blocks.length ? m.blocks[m.blocks.length - 1].node : m.head.node;
      const has = re => re.test(all) || m.topics.some(t => re.test(t.title));
      if (!m.outcomes && !has(/\boutcomes?\b|by the end of this module|you will be able to/i))
        add({ principle: "Moodle flow", where: label, anchor: m.head.node, mode: "after", title: msg("overviewTitle"), detail: msg("overview"), original: label,
          insert: [{ style: "h2", text: "Module overview" }, ...cfg.overviewStarter.map(x => ({ text: x }))] });
      if (!/\b\d+(\.\d+)?\s*(hours?|hrs?|minutes?|mins?)\b/i.test(all))
        add({ principle: "Action & Expression", where: label, anchor: m.head.node, mode: "comment", title: msg("timeTitle"), detail: msg("time"), original: label });
      const media = m.blocks.some(b => b.links.length || b.type === "tbl") || /\b(video|infographic|genially|interactive|podcast|diagram|image)\b/i.test(all);
      if (!media) add({ principle: "Representation", where: label, anchor: m.head.node, mode: "comment", title: msg("mediaTitle"), detail: msg("media"), original: label });
      if (!/\b(your school|your classroom|your learners|your staff|your context|your practice|at your school)\b/i.test(all))
        add({ principle: "Engagement", where: label, anchor: m.head.node, mode: "comment", title: msg("relevanceTitle"), detail: msg("relevance"), original: label });
      const lastTopic = m.topics[m.topics.length - 1];
      const hasSummary = lastTopic && /summary|conclusion|takeaway|wrap|next steps|reflection on/i.test(lastTopic.title);
      const ins = [];
      if (!has(/knowledge check|quiz|check your understanding|self-check|test your/i)) ins.push(["Engagement", "kcTitle", "kc", [{ text: "Knowledge check:", bold: true }, ...cfg.knowledgeCheckStarter.map(x => ({ text: x }))]]);
      if (!has(/reflect|forum|discussion|reflective post/i)) ins.push(["Engagement", "reflectTitle", "reflect", [{ text: "Reflective post:", bold: true }, ...cfg.reflectionStarter.map(x => ({ text: x }))]]);
      if (!hasSummary) ins.push(["Representation", "summaryTitle", "summary", [{ style: "h2", text: "Key takeaways and next steps" }, ...cfg.summaryStarter.map(x => ({ text: x }))]]);
      ins.forEach(([pr, t, d, insert]) => add({ principle: pr, where: label + " (end)", anchor: last, mode: "after", title: msg(t), detail: msg(d), original: snippet(m.blocks.length ? m.blocks[m.blocks.length - 1].text || "End of the module" : label), insert }));
      if (mi === modules.length - 1 && !/feedback|evaluation|survey/i.test(all))
        add({ principle: "Moodle flow", where: label + " (end of course)", anchor: last, mode: "comment", title: msg("feedbackTitle"), detail: msg("feedback"), original: "End of the course" });
      // assignments
      m.blocks.filter(b => b.type === "p" && /^assignment\b/i.test(b.text)).forEach(b => {
        const i = m.blocks.indexOf(b); const after = textOf(m.blocks.slice(i, i + 12));
        if (!/\b(choose|choice|option|either|or create|in any format)\b/i.test(after)) add({ principle: "Action & Expression", where: label, anchor: b.node, mode: "comment", title: msg("choiceTitle"), detail: msg("choice"), original: snippet(b.text) });
        if (!/\b(rubric|criteria|success criteria|you will be assessed|marked)\b/i.test(after)) add({ principle: "Action & Expression", where: label, anchor: b.node, mode: "comment", title: msg("criteriaTitle"), detail: msg("criteria"), original: snippet(b.text) });
      });
      // long topics and sentences
      m.topics.forEach(t => {
        const tx = textOf(t.blocks); const w = wc(tx);
        if (w > cfg.limits.topicWords) add({ principle: "Representation", where: label + " › " + t.title, anchor: t.head.node, mode: "comment", title: msg("chunkTitle"), detail: msg("chunk", { words: w }), original: snippet(tx) });
        const sents = tx.split(/(?<=[.!?])\s+/).filter(s => wc(s) > 3);
        const avg = sents.length ? sents.reduce((a, s) => a + wc(s), 0) / sents.length : 0;
        if (sents.length >= 4 && avg > cfg.limits.sentenceWords) add({ principle: "Representation", where: label + " › " + t.title, anchor: t.head.node, mode: "comment", title: msg("sentenceTitle"), detail: msg("sentence", { avg: Math.round(avg) }), original: snippet(tx) });
      });
    });
    // paragraph-level checks across the whole draft
    let longCount = 0;
    blocks.forEach(b => {
      if (b.type !== "p") return;
      if (wc(b.text) > cfg.limits.paragraphWords && longCount++ < 12) add({ principle: "Representation", where: "Paragraph", anchor: b.node, mode: "comment", title: msg("paraTitle"), detail: msg("para", { words: wc(b.text) }), original: snippet(b.text) });
      b.links.forEach(l => { if (!l.label || /^https?:/i.test(l.label) || /^(click here|here|link|this link|read more)$/i.test(l.label)) add({ principle: "Accessibility", where: "Link", anchor: b.node, mode: "comment", title: msg("linkTitle"), detail: msg("link"), original: snippet(l.label || l.url) }); });
      if (b.pics) add({ principle: "Accessibility", where: "Image", anchor: b.node, mode: "comment", title: msg("altTitle"), detail: msg("alt"), original: "Image without alt text" });
    });
    blocks.filter(b => b.type === "tbl").forEach(b => add({ principle: "Accessibility", where: "Table", anchor: b.node, mode: "comment-before", title: msg("tableTitle"), detail: msg("table"), original: snippet(b.text) }));
    // acronyms not written out
    const fullText = blocks.map(b => b.text).join(" "); const seenA = new Set(); let ac = 0; let started = false;
    blocks.forEach(b => {
      if (b.type === "p" && b.level !== null && b.text) started = true;
      if (!started || b.type !== "p" || ac >= 8 || b.text === b.text.toUpperCase()) return;
      (b.text.match(/\b[A-Z]{2,6}s?\b/g) || []).forEach(a => {
        const k = a.replace(/s$/, ""); if (seenA.has(k) || cfg.knownAcronyms.includes(k) || /^[IVXLC]+$/.test(k)) return; seenA.add(k);
        if (new RegExp("\\(" + k + "s?\\)").test(fullText)) return;
        if (new RegExp("\\b" + k + "\\b", "i").test(fullText.replace(new RegExp("\\b" + k + "\\b", "g"), ""))) return; // an ordinary word written in capitals
        if (ac++ < 8) add({ principle: "Representation", where: "Language", anchor: b.node, mode: "comment", title: msg("acronymTitle", { acr: k }), detail: msg("acronym", { acr: k }), original: snippet(b.text) });
      });
    });

    // ---- write the reviewed document ----
    const date = new Date().toISOString().replace(/\.\d+Z$/, "Z"); let tid = 900000; let cid = 0;
    const el = (name, attrs = {}, kids = []) => { const e = doc.createElementNS(W, "w:" + name); Object.entries(attrs).forEach(([k, v]) => e.setAttributeNS(W, "w:" + k, String(v))); kids.forEach(k => e.appendChild(k)); return e; };
    const sid = k => byName[k === "h1" ? "heading 1" : k === "h2" ? "heading 2" : "normal"];
    const run = (t, o = {}) => { const rp = el("rPr"); if (o.bold) rp.appendChild(el("b")); if (o.italic) rp.appendChild(el("i")); if (o.color) rp.appendChild(el("color", { val: o.color })); if (o.size) rp.appendChild(el("sz", { val: o.size * 2 })); if (o.hl) rp.appendChild(el("highlight", { val: o.hl }));
      const tt = el("t"); tt.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve"); tt.textContent = t; return el("r", {}, [rp, tt]); };
    const insPara = item => {
      const ppr = el("pPr"); const s = item.style ? sid(item.style) : null;
      if (s) ppr.appendChild(el("pStyle", { val: s }));
      else if (item.style) { /* no heading style in this document: bold, larger text */ item.bold = true; item.size = item.style === "h1" ? 16 : 13; }
      const r = run(item.text, { bold: item.bold, size: item.size, hl: accepted ? null : "yellow" });
      if (accepted) { ppr.appendChild(el("rPr")); return el("p", {}, [ppr, r]); }
      const prp = el("rPr", {}, [el("ins", { id: ++tid, author: cfg.author, date })]); ppr.appendChild(prp);
      return el("p", {}, [ppr, el("ins", { id: ++tid, author: cfg.author, date }, [r])]);
    };
    const comments = [];
    const comment = (p, text) => {
      const id = 800000 + ++cid; comments.push({ id, text });
      const ppr = firstOf(p, "pPr"); const start = el("commentRangeStart", { id });
      if (ppr) p.insertBefore(start, ppr.nextSibling); else p.insertBefore(start, p.firstChild);
      p.appendChild(el("commentRangeEnd", { id })); p.appendChild(el("r", {}, [el("commentReference", { id })]));
    };
    const lastAfter = new Map();
    out.forEach(s => {
      if (s.mode === "after" || s.mode === "before") {
        let ref = s.mode === "after" ? (lastAfter.get(s.anchor) || s.anchor) : s.anchor;
        s.insert.forEach(item => { const p = insPara(item); if (s.mode === "after") { ref.parentNode.insertBefore(p, ref.nextSibling); ref = p; } else s.anchor.parentNode.insertBefore(p, s.anchor); });
        if (s.mode === "after") lastAfter.set(s.anchor, ref);
        s.how = "Added to the draft (tracked change)";
      } else s.how = "Comment in the margin";
    });
    if (!accepted) {
      out.forEach(s => {
        if (s.mode === "comment") comment(s.anchor, `${s.principle}: ${s.title}. ${s.detail}`);
        if (s.mode === "comment-before") {
          const p = el("p", {}, [el("pPr", {}, [el("rPr")]), run(" ")]); s.anchor.parentNode.insertBefore(p, s.anchor); comment(p, `${s.principle}: ${s.title}. ${s.detail}`);
        }
      });
      // summary page at the front (the Hub ignores everything before the first heading)
      const first = body.firstChild; const put = node => body.insertBefore(node, first);
      const counts = {}; out.forEach(s => { counts[s.principle] = (counts[s.principle] || 0) + 1; });
      put(el("p", {}, [el("pPr", {}, [el("jc", { val: "left" })]), run("LEARNING DESIGN REVIEW", { bold: true, color: "007DBA", size: 10 })]));
      put(el("p", {}, [el("pPr", {}, [el("jc", { val: "left" })]), run("Suggestions for this course draft", { bold: true, color: "001489", size: 18 })]));
      put(el("p", {}, [el("pPr", {}, [el("jc", { val: "left" })]), run(`${out.length} suggestions · ` + Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(" · ") + ` · ${new Date().toLocaleDateString("en-ZA")}`, { color: "5B6478" })]));
      [cfg.howToReview1, cfg.howToReview2, cfg.howToReview3].forEach(t => put(el("p", {}, [el("pPr", {}, [el("jc", { val: "left" })]), run(t)])));
      const cell = (t, head, w) => el("tc", {}, [el("tcPr", {}, [el("tcW", { w, type: "dxa" }), ...(head ? [el("shd", { val: "clear", color: "auto", fill: "001489" })] : [])]), el("p", {}, [el("pPr", {}, [el("spacing", { after: 0, line: 240, lineRule: "auto" }), el("jc", { val: "left" })]), run(t, head ? { bold: true, color: "FFFFFF", size: 9 } : { size: 9 })])]);
      const widths = [500, 2200, 1500, 4000, 1438];
      const row = (vals, head) => el("tr", {}, vals.map((v, i) => cell(v, head, widths[i])));
      const bd = k => el(k, { val: "single", sz: 4, color: "A6BBC8" });
      const tbl = el("tbl", {}, [el("tblPr", {}, [el("tblW", { w: 9638, type: "dxa" }), el("tblBorders", {}, ["top", "left", "bottom", "right", "insideH", "insideV"].map(bd)), el("tblLayout", { type: "fixed" })]),
        el("tblGrid", {}, widths.map(w => el("gridCol", { w }))), row(["#", "Where", "UDL principle", "Suggestion", "How it appears"], true), ...out.map(s => row([String(s.id), s.where, s.principle, `${s.title}. ${s.detail}`, s.how]))]);
      put(tbl);
      put(el("p", {}, [el("r", {}, [el("br", { type: "page" })])]));
    }
    zip.file("word/document.xml", S.serializeToString(doc), { createFolders: false });
    if (!accepted && comments.length) {
      let cdoc; const cf = zip.file("word/comments.xml");
      if (cf) cdoc = parse(await cf.async("string"));
      else {
        cdoc = parse(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:comments xmlns:w="${W}"/>`);
        const rid = "rIdUdl1"; const rel = relDoc.createElementNS("http://schemas.openxmlformats.org/package/2006/relationships", "Relationship");
        rel.setAttribute("Id", rid); rel.setAttribute("Type", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments"); rel.setAttribute("Target", "comments.xml");
        relDoc.documentElement.appendChild(rel); zip.file("word/_rels/document.xml.rels", S.serializeToString(relDoc), { createFolders: false });
        const ct = parse(await zip.file("[Content_Types].xml").async("string")); const o = ct.createElementNS("http://schemas.openxmlformats.org/package/2006/content-types", "Override");
        o.setAttribute("PartName", "/word/comments.xml"); o.setAttribute("ContentType", "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml");
        ct.documentElement.appendChild(o); zip.file("[Content_Types].xml", S.serializeToString(ct), { createFolders: false });
      }
      comments.forEach(c => {
        const e = cdoc.createElementNS(W, "w:comment"); e.setAttributeNS(W, "w:id", c.id); e.setAttributeNS(W, "w:author", cfg.author); e.setAttributeNS(W, "w:date", date); e.setAttributeNS(W, "w:initials", "LDR");
        const p = cdoc.createElementNS(W, "w:p"); const r = cdoc.createElementNS(W, "w:r"); const t = cdoc.createElementNS(W, "w:t"); t.textContent = c.text;
        r.appendChild(t); p.appendChild(r); e.appendChild(p); cdoc.documentElement.appendChild(e);
      });
      zip.file("word/comments.xml", S.serializeToString(cdoc), { createFolders: false });
    }
    const blob = await zip.generateAsync({ type: accepted ? "arraybuffer" : "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", compression: "DEFLATE" });
    return { suggestions: out.map(({ anchor, ...rest }) => rest), file: blob, modules: modules.length };
  }
  return { review };
})();
if (typeof module !== "undefined") module.exports = UDLReview;
