// CTLI Design Hub: learning design review.
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
    // Every suggestion can carry ready-made options (the Hub shows them; the DCES picks one, writes their own, or keeps a comment).
    const out = []; let n = 0;
    const msg = (k, vars = {}) => (cfg.messages[k] || k).replace(/\{(\w+)\}/g, (_, v) => vars[v] != null ? vars[v] : "");
    const add = s => { s.id = ++n; s.options = s.options || []; out.push(s); };
    const textOf = list => list.map(b => b.text).join(" ");
    const clean = t => tidy(String(t || "").replace(/^module\s+\d+\s*[:.\-–]\s*/i, "").replace(/^\d+(\.\d+)*\s+/, "").replace(/\s*\([^)]*\)\s*$/, "").replace(/\[|\]/g, ""));
    const lowFirst = t => t && !/^[A-Z]{2,}/.test(t) ? t[0].toLowerCase() + t.slice(1) : t;
    const firstSentence = (txt, max = 170) => { const m = tidy(txt).match(/^.*?[.!?](\s|$)/); const f = m ? m[0].trim() : tidy(txt); return f.length > max ? f.slice(0, max - 1).replace(/\s+\S*$/, "") + "…" : f; };
    const listText = arr => arr.length <= 1 ? (arr[0] || "") : arr.slice(0, -1).join(", ") + " and " + arr[arr.length - 1];
    const firstHead = blocks.findIndex(b => b.type === "p" && b.level !== null && b.level > 0 && b.text);
    const tabNames = /description|objective|structure|badg|navigation|reference/i;
    const titleBlock = blocks.find(b => b.type === "p" && b.level === 0 && b.text) || blocks.slice(0, firstHead < 0 ? 3 : firstHead).find(b => b.type === "p" && b.text && wc(b.text) <= 14 && !tabNames.test(b.text));
    const courseName = titleBlock ? (clean(titleBlock.text.replace(/^(example\s+)?course\s*draft\s*[:\-–]?\s*/i, "")) || "this course") : "this course";
    const q = t => `“${t}”`;
    const modTitles = modules.map(m => clean(m.title));
    // content only: no headings, no [notes for the designer], no quiz lines
    const isNote = b => /^\[/.test(b.text);
    const content = list => list.filter(b => b.type === "p" && b.level === null && b.text && !isNote(b) && !/^(question \d|answer:|feedback:|[a-d]\)\s)/i.test(b.text));
    // a topic is a Heading 2 with everything under it (its screens too); falls back to every heading
    const topicsOf = m => { const lv = m.topics.some(t => t.head.level === 2) ? 2 : null; const tops = lv ? m.topics.filter(t => t.head.level === 2) : m.topics;
      return tops.map(t => { const i = m.blocks.indexOf(t.head); let j = i + 1; while (j < m.blocks.length && !(m.blocks[j].type === "p" && m.blocks[j].level !== null && m.blocks[j].level <= t.head.level && m.blocks[j].text)) j++;
        return { title: clean(t.title), head: t.head, blocks: m.blocks.slice(i + 1, j) }; }); };
    const estimate = m => { const w = wc(textOf(m.blocks)); const acts = m.blocks.filter(b => b.type === "p" && b.bold && /^(assignment|forum|reflect|knowledge check|quiz|task)/i.test(b.text)).length;
      let min = Math.max(30, Math.round((w / 150 + acts * 15) / 15) * 15); const h = Math.floor(min / 60), mm = min % 60;
      return (h ? h + (h === 1 ? " hour" : " hours") : "") + (h && mm ? " " : "") + (mm ? mm + " minutes" : ""); };
    const ins = (anchor, mode, items) => ({ type: "insert", anchor, mode, items });
    const P_ = text => ({ text }); const B_ = text => ({ text, bold: true }); const H1 = text => ({ style: "h1", text }); const H2 = text => ({ style: "h2", text }); const H3 = text => ({ style: "h3", text });
    const preview = o => o.type === "insert" ? o.items.map(i => i.text).join("\n") : o.type === "replace" ? o.paras.join("\n\n") : o.type === "wrap" ? o.before + o.acr + o.after : o.type === "relabel" ? o.label : o.type === "alt" ? o.text : o.type === "header" ? o.items.map(i => i.text).join("\n") + "\n(and the first row is marked as a header row)" : "";
    const opt = (label, o) => Object.assign(o, { label, preview: preview(o) });

    // course page tabs: a starter written from the draft itself, or the placeholders
    const tabs = (typeof SORTER_CONFIG !== "undefined" ? SORTER_CONFIG : require("./config.js")).courseTabs;
    const tabHit = tabs.map(([name, re]) => ({ name, sec: course.find(s => !s.ref && re.test(s.title)) || (/reference/i.test(name) ? course.find(s => s.ref) : null) }));
    const modList = modTitles.map((t, i) => `Module ${i + 1}: ${t}`);
    const tabDraft = name => {
      if (/description/i.test(name)) return [`Welcome to ${courseName}.`, modules.length ? `The course has ${modules.length} module${modules.length === 1 ? "" : "s"}: ${listText(modTitles.map(q))}.` : "", "You will connect each idea to your own school and practice."].filter(Boolean);
      if (/objective/i.test(name)) return ["By the end of this course, you will be able to:", ...modTitles.map((t, i) => `• ${["Explain", "Apply", "Use", "Plan with"][i % 4]} the key ideas of ${q(t)} at your school`)];
      if (/structure/i.test(name)) return [`The course has ${modules.length} module${modules.length === 1 ? "" : "s"}. Work through them in order:`, ...modules.map((m, i) => `• ${modList[i]} (about ${estimate(m)})`)];
      if (/badg|certif/i.test(name)) return ["Complete every module and its activities to earn the course badge.", "Your certificate becomes available in Moodle when all activities are marked complete."];
      return cfg.tabStarters[name] || ["[Write this tab]"];
    };
    tabHit.forEach(t => {
      const gen = tabDraft(t.name); const starter = cfg.tabStarters[t.name] || ["[Write this tab]"];
      if (!t.sec) {
        if (firstModHead) add({ principle: "Moodle flow", where: "Course page", anchor: firstModHead, mode: "before", title: msg("tabMissingTitle", { tab: t.name }), detail: msg("tabMissing", { tab: t.name }), original: "Not in the draft",
          options: [opt("Written from this draft", ins(firstModHead, "before", [H1(t.name), ...gen.map(P_)])), ...(gen.join() !== starter.join() ? [opt("Starter for the writer", ins(firstModHead, "before", [H1(t.name), ...starter.map(P_)]))] : [])],
          own: { kind: "insert", anchor: firstModHead, mode: "before", head: [H1(t.name)] } });
      } else if (wc(textOf(t.sec.blocks)) < 8) add({ principle: "Moodle flow", where: "Course page: " + t.name, anchor: t.sec.head.node, mode: "comment", title: msg("tabThinTitle", { tab: t.name }), detail: msg("tabThin", { tab: t.name }), original: t.sec.title,
          options: [opt("Written from this draft", ins(t.sec.head.node, "after", gen.map(P_))), ...(gen.join() !== starter.join() ? [opt("Starter for the writer", ins(t.sec.head.node, "after", starter.map(P_)))] : [])],
          own: { kind: "insert", anchor: t.sec.head.node, mode: "after" } });
    });
    const desc = tabHit[0].sec;
    if (desc && !/\b(welcome|you will|this course (helps|supports|is for))\b/i.test(textOf(desc.blocks)))
      add({ principle: "Engagement", where: "Course page: Course Description", anchor: desc.head.node, mode: "comment", title: msg("welcomeTitle"), detail: msg("welcome"), original: snippet(textOf(desc.blocks)),
        options: [opt("Welcome and what the course covers", ins(desc.head.node, "after", [P_(`Welcome to ${courseName}. This course is for [who it is for]. It covers ${modTitles.length ? listText(modTitles.map(q)) : "[what it covers]"}, with examples from your own school.`)])),
                  opt("Welcome and time", ins(desc.head.node, "after", [P_(`Welcome to ${courseName}. Over ${modules.length || "[number]"} module${modules.length === 1 ? "" : "s"}, you will connect each idea to your own school. Plan about [time] to complete the course, at your own pace.`)]))],
        own: { kind: "insert", anchor: desc.head.node, mode: "after" } });
    // objectives that cannot be observed: rewrite with an observable verb
    const weakVerb = /\b(understand|know|learn about|appreciate|be aware of|become familiar with|familiarise yourself with|familiarise|realise|grasp)\b/i;
    const better = { understand: ["explain", "describe"], know: ["identify", "describe"], "learn about": ["explain", "describe"], appreciate: ["explain the value of", "recognise"], "be aware of": ["identify", "describe"],
      "become familiar with": ["use", "describe"], "familiarise yourself with": ["use", "describe"], familiarise: ["use", "describe"], realise: ["recognise", "explain"], grasp: ["explain", "apply"] };
    const objSecs = [tabHit[1].sec].filter(Boolean);
    objSecs.forEach(s => s.blocks.filter(b => b.type === "p" && weakVerb.test(b.text)).slice(0, 6).forEach(b => {
      const v = b.text.match(weakVerb)[0]; const alts = better[v.toLowerCase()] || ["explain"];
      const swap = w => b.text.replace(weakVerb, m => m[0] === m[0].toUpperCase() ? w[0].toUpperCase() + w.slice(1) : w);
      add({ principle: "Action & Expression", where: "Learning Objectives", anchor: b.node, mode: "comment", title: msg("verbTitle"), detail: msg("verb", { verb: v }), original: snippet(b.text),
        options: b.links.length ? [] : alts.map(w => opt(`Use "${w}"`, { type: "replace", anchor: b.node, paras: [swap(w)] })), own: { kind: b.links.length ? "comment" : "replace", anchor: b.node } });
    }));
    // modules
    modules.forEach((m, mi) => {
      const all = textOf(m.blocks); const label = m.title.replace(/\s+/g, " "); const mt = modTitles[mi];
      const last = m.blocks.length ? m.blocks[m.blocks.length - 1].node : m.head.node;
      const has = re => re.test(all) || m.topics.some(t => re.test(t.title));
      const mtops = topicsOf(m).filter(t => t.title && !/^(about|introduction|overview|welcome)/i.test(t.title));
      const topicNames = mtops.map(t => t.title);
      const est = estimate(m);
      if (!m.outcomes && !has(/\boutcomes?\b|by the end of this module|you will be able to/i))
        add({ principle: "Moodle flow", where: label, anchor: m.head.node, mode: "after", title: msg("overviewTitle"), detail: msg("overview"), original: label,
          options: [opt("Outcomes from this module's topics", ins(m.head.node, "after", [P_("Outcomes"), ...topicNames.slice(0, 5).map((t, i) => P_(`${["Explain", "Apply", "Describe", "Use", "Plan with"][i % 5]} the key ideas of ${q(t)}`)), P_(`Time to complete: about ${est}`)])),
                    opt("Starter for the writer", ins(m.head.node, "after", [P_("Outcomes"), ...cfg.overviewStarter.slice(1).map(P_)]))],
          own: { kind: "insert", anchor: m.head.node, mode: "after", head: [P_("Outcomes")] } });
      if (!/\b\d+(\.\d+)?\s*(hours?|hrs?|minutes?|mins?)\b/i.test(all))
        add({ principle: "Action & Expression", where: label, anchor: m.head.node, mode: "comment", title: msg("timeTitle"), detail: msg("time"), original: label,
          options: [opt(`Estimate from the length of the module (${est})`, ins(m.head.node, "after", [P_(`Time to complete: about ${est}`)])), opt("Sentence", ins(m.head.node, "after", [P_(`This module takes about ${est} to complete. You can stop and come back at any time.`)]))],
          own: { kind: "insert", anchor: m.head.node, mode: "after" } });
      const media = m.blocks.some(b => b.links.length || b.type === "tbl") || /\b(video|infographic|genially|interactive|podcast|diagram|image)\b/i.test(all);
      if (!media) { const t0 = m.topics[0];
        add({ principle: "Representation", where: label, anchor: m.head.node, mode: "comment", title: msg("mediaTitle"), detail: msg("media"), original: label,
          options: t0 ? [opt("Note for the designer", ins(t0.head.node, "after", [P_(`[Designer: show the key idea of ${q(clean(t0.title))} in a second way, for example an infographic, a short video or an interactive resource.]`)]))] : [],
          own: { kind: "insert", anchor: t0 ? t0.head.node : m.head.node, mode: "after" } }); }
      if (!/\b(your school|your classroom|your learners|your staff|your context|your practice|at your school)\b/i.test(all))
        add({ principle: "Engagement", where: label, anchor: m.head.node, mode: "comment", title: msg("relevanceTitle"), detail: msg("relevance"), original: label,
          options: [opt("Link to your school", ins(last, "after", [B_("At your school"), P_(`Think of a recent situation at your school that links to ${q(mt)}. What happened, and what would you do differently now?`)])),
                    opt("A school example for the writer to complete", ins(last, "after", [B_("Example from a school"), P_(`[Write a short, realistic example from a South African school that shows ${q(mt)} in practice.]`)]))],
          own: { kind: "insert", anchor: last, mode: "after" } });
      const lastTopic = m.topics[m.topics.length - 1];
      const hasSummary = lastTopic && /summary|conclusion|takeaway|wrap|next steps|reflection on/i.test(lastTopic.title);
      const endItems = [];
      if (!has(/knowledge check|quiz|check your understanding|self-check|test your/i)) {
        const qs = mtops.filter(t => wc(textOf(content(t.blocks))) > 8).slice(0, 2).flatMap((t, qi) => [P_(`Question ${qi + 1}: Which statement best sums up ${q(t.title)}?`), P_(`a) ${firstSentence(textOf(content(t.blocks)))}`), P_("b) [A plausible but incorrect statement]"), P_("c) [A plausible but incorrect statement]"), P_("Answer: a)"), P_(`Feedback: Go back to ${t.title} if you chose another answer.`)]);
        endItems.push({ pr: "Engagement", t: "kcTitle", d: "kc", options: [...(qs.length ? [opt("Questions from this module", ins(last, "after", [B_("Knowledge check:"), ...qs]))] : []), opt("Starter for the writer", ins(last, "after", [B_("Knowledge check:"), ...cfg.knowledgeCheckStarter.map(P_)]))], head: [B_("Knowledge check:")] });
      }
      if (!has(/reflect|forum|discussion|reflective post/i))
        endItems.push({ pr: "Engagement", t: "reflectTitle", d: "reflect", head: [B_("Reflective post:")], options: [
          opt("Apply it at your school", ins(last, "after", [B_("Reflective post:"), P_(`Think about what you learnt in ${q(mt)}. What is one thing you will do differently at your school this week, and why?`)])),
          opt("What challenged you", ins(last, "after", [B_("Reflective post:"), P_("Which idea in this module challenged your thinking most? Describe how it applies to a situation at your school.")]))] });
      if (!hasSummary) {
        const next = mi < modules.length - 1 ? `Next: Module ${mi + 2}, ${modTitles[mi + 1]}.` : "Next: complete the course feedback and claim your badge.";
        const tk = mtops.filter(t => wc(textOf(content(t.blocks))) > 8).slice(0, 4).map(t => P_(`• ${t.title}: ${firstSentence(textOf(content(t.blocks)), 140)}`));
        endItems.push({ pr: "Representation", t: "summaryTitle", d: "summary", head: [H2("Key takeaways and next steps")], options: [
          ...(tk.length ? [opt("Takeaways from this module's topics", ins(last, "after", [H2("Key takeaways and next steps"), ...tk, P_(next)]))] : []),
          opt("Starter for the writer", ins(last, "after", [H2("Key takeaways and next steps"), ...cfg.summaryStarter.slice(0, 3).map(P_), P_(next)]))] });
      }
      endItems.forEach(e => add({ principle: e.pr, where: label + " (end)", anchor: last, mode: "after", title: msg(e.t), detail: msg(e.d), original: snippet(m.blocks.length ? m.blocks[m.blocks.length - 1].text || "End of the module" : label), options: e.options, own: { kind: "insert", anchor: last, mode: "after", head: e.head } }));
      if (mi === modules.length - 1 && !/feedback|evaluation|survey/i.test(all))
        add({ principle: "Moodle flow", where: label + " (end of course)", anchor: last, mode: "comment", title: msg("feedbackTitle"), detail: msg("feedback"), original: "End of the course",
          options: [opt("Feedback survey and badge", ins(last, "after", [H2("Course feedback and your badge"), P_("Tell us what worked and what we can improve in this short survey: [link to the course feedback survey]."), P_("When every activity is marked complete, your badge and certificate become available in Moodle.")]))],
          own: { kind: "insert", anchor: last, mode: "after" } });
      // assignments
      m.blocks.filter(b => b.type === "p" && /^assignment\b/i.test(b.text)).forEach(b => {
        const i = m.blocks.indexOf(b); const after = textOf(m.blocks.slice(i, i + 12));
        if (!/\b(choose|choice|option|either|or create|in any format)\b/i.test(after)) add({ principle: "Action & Expression", where: label, anchor: b.node, mode: "comment", title: msg("choiceTitle"), detail: msg("choice"), original: snippet(b.text),
          options: [opt("Choice of format", ins(b.node, "after", [P_("You may choose how to present your work: a written piece, a slide presentation, an infographic, or a short audio or video recording.")]))], own: { kind: "insert", anchor: b.node, mode: "after" } });
        if (!/\b(rubric|criteria|success criteria|you will be assessed|marked)\b/i.test(after)) add({ principle: "Action & Expression", where: label, anchor: b.node, mode: "comment", title: msg("criteriaTitle"), detail: msg("criteria"), original: snippet(b.text),
          options: [opt("Success criteria", ins(b.node, "after", [B_("Success criteria: your submission"), P_("• answers every part of the task"), P_("• links the ideas in this module to your own school, with an example"), P_("• is clear, well organised and in your own words")]))], own: { kind: "insert", anchor: b.node, mode: "after" } });
      });
      // long topics and sentences
      m.topics.forEach(t => {
        const tx = textOf(t.blocks); const w = wc(tx);
        if (w > cfg.limits.topicWords) {
          const ps = content(t.blocks).filter(b => !b.list && wc(b.text) > 10); const mid = ps[Math.floor(ps.length / 2)];
          add({ principle: "Representation", where: label + " › " + t.title, anchor: t.head.node, mode: "comment", title: msg("chunkTitle"), detail: msg("chunk", { words: w }), original: snippet(tx),
            options: mid ? [opt("Sub-heading halfway through", ins(mid.node, "before", [H3(`[Sub-heading: ${firstSentence(mid.text, 60).replace(/[.!?…]$/, "")}]`)]))] : [], own: { kind: "insert", anchor: mid ? mid.node : t.head.node, mode: mid ? "before" : "after", style: "h3" } });
        }
        const sents = tx.split(/(?<=[.!?])\s+/).filter(s => wc(s) > 3);
        const avg = sents.length ? sents.reduce((a, s) => a + wc(s), 0) / sents.length : 0;
        if (sents.length >= 4 && avg > cfg.limits.sentenceWords) {
          // the longest sentence in a paragraph without links, split at a natural break
          let target = null, longest = "";
          content(t.blocks).forEach(b => { if (b.links.length) return; b.text.split(/(?<=[.!?])\s+/).forEach(s => { if (wc(s) > wc(longest)) { longest = s; target = b; } }); });
          const split = s => { const words = s.split(" "); const cut = [", and ", "; ", ", but ", ", which ", ", so ", " and ", " because "].map(k => { let best = -1; let idx = s.indexOf(k); while (idx > -1) { const before = wc(s.slice(0, idx)); if (before >= 6 && wc(s) - before >= 5 && (best < 0 || Math.abs(before - wc(s) / 2) < Math.abs(wc(s.slice(0, best)) - wc(s) / 2))) best = idx; idx = s.indexOf(k, idx + 1); } return [k, best]; }).filter(x => x[1] > -1)[0];
            if (!cut) return null; const [k, i] = cut; let a = s.slice(0, i).replace(/[,;]$/, "") + "."; let rest = s.slice(i + k.length); if (k.trim() === "which") rest = "This " + rest; else if (/but|so/.test(k)) rest = k.trim()[0].toUpperCase() + k.trim().slice(1) + " " + rest; return a + " " + rest[0].toUpperCase() + rest.slice(1); };
          const sp = target && wc(longest) > cfg.limits.sentenceWords ? split(longest) : null;
          add({ principle: "Representation", where: label + " › " + t.title, anchor: target ? target.node : t.head.node, mode: "comment", title: msg("sentenceTitle"), detail: msg("sentence", { avg: Math.round(avg) }), original: snippet(target && sp ? longest : tx),
            options: sp ? [opt("Split the longest sentence", { type: "replace", anchor: target.node, paras: [target.text.replace(longest, sp)] })] : [], own: { kind: target ? "replace" : "comment", anchor: target ? target.node : t.head.node } });
        }
      });
    });
    // paragraph-level checks across the whole draft
    let longCount = 0;
    const host = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return "the website"; } };
    blocks.forEach(b => {
      if (b.type !== "p") return;
      if (wc(b.text) > cfg.limits.paragraphWords && !isNote(b) && longCount++ < 12) {
        const ss = b.text.split(/(?<=[.!?])\s+/); let acc = 0, cut = 0; const half = wc(b.text) / 2;
        ss.forEach((s, i) => { if (acc < half) { acc += wc(s); cut = i + 1; } });
        const parts = cut > 0 && cut < ss.length ? [ss.slice(0, cut).join(" "), ss.slice(cut).join(" ")] : null;
        add({ principle: "Representation", where: "Paragraph", anchor: b.node, mode: "comment", title: msg("paraTitle"), detail: msg("para", { words: wc(b.text) }), original: snippet(b.text),
          options: parts && !b.links.length ? [opt("Split into two paragraphs", { type: "replace", anchor: b.node, paras: parts })] : [], own: { kind: b.links.length ? "comment" : "replace", anchor: b.node } });
      }
      b.links.forEach(l => { if (!l.label || /^https?:/i.test(l.label) || /^(click here|here|link|this link|read more)$/i.test(l.label)) {
        const h = host(l.url); const lab = /youtu/.test(h) ? "Watch the video on YouTube" : /genial/.test(h) ? "Open the interactive presentation (Genially)" : /canva/.test(h) ? "Open the design in Canva" : /\.pdf($|\?)/i.test(l.url) ? `Download the PDF (${h})` : `Read more on ${h}`;
        add({ principle: "Accessibility", where: "Link", anchor: b.node, mode: "comment", title: msg("linkTitle"), detail: msg("link"), original: snippet(l.label || l.url),
          options: [opt("Describe where it goes", { type: "relabel", anchor: b.node, url: l.url, label: lab })], own: { kind: "relabel", anchor: b.node, url: l.url } }); } });
      if (b.pics) { const near = [...blocks.slice(0, blocks.indexOf(b))].reverse().find(x => x.type === "p" && x.level !== null && x.text);
        add({ principle: "Accessibility", where: "Image", anchor: b.node, mode: "comment", title: msg("altTitle"), detail: msg("alt"), original: "Image without alt text",
          options: [opt("Alt text from the heading", { type: "alt", anchor: b.node, text: `Image for ${near ? clean(near.text) : "this section"}` }), opt("Mark as decorative", { type: "alt", anchor: b.node, text: "Decorative image" })], own: { kind: "alt", anchor: b.node } }); }
    });
    blocks.filter(b => b.type === "tbl").forEach(b => {
      const tr = kidsOf(b.node, "tr")[0]; const heads = tr ? kidsOf(tr, "tc").map(c => tidy(allOf(c, "t").map(t => t.textContent).join(" "))).filter(Boolean) : [];
      const intro = heads.length >= 2 ? `The table below sets out ${listText(heads.map(lowFirst))}.` : "The table below summarises the key points.";
      add({ principle: "Accessibility", where: "Table", anchor: b.node, mode: "comment-before", title: msg("tableTitle"), detail: msg("table"), original: snippet(b.text),
        options: [opt("Introduce it and mark the header row", { type: "header", anchor: b.node, items: [P_(intro)] })], own: { kind: "header", anchor: b.node } }); });
    // acronyms not written out
    const fullText = blocks.map(b => b.text).join(" "); const seenA = new Set(); let ac = 0; let started = false;
    const expand = cfg.acronymExpansions || {};
    blocks.forEach(b => {
      if (b.type === "p" && b.level !== null && b.text) started = true;
      if (!started || b.type !== "p" || ac >= 8 || b.text === b.text.toUpperCase() || isNote(b)) return;
      (b.text.match(/\b[A-Z]{2,6}s?\b/g) || []).forEach(a => {
        const k = a.replace(/s$/, ""); if (seenA.has(k) || cfg.knownAcronyms.includes(k) || /^[IVXLC]+$/.test(k)) return; seenA.add(k);
        if (new RegExp("\\(" + k + "s?\\)").test(fullText)) return;
        if (new RegExp("\\b" + k + "\\b", "i").test(fullText.replace(new RegExp("\\b" + k + "\\b", "g"), ""))) return; // an ordinary word written in capitals
        if (ac++ < 8) add({ principle: "Representation", where: "Language", anchor: b.node, mode: "comment", title: msg("acronymTitle", { acr: k }), detail: msg("acronym", { acr: k }), original: snippet(b.text),
          options: expand[k] ? [opt(`Write it in full: ${expand[k]}`, { type: "wrap", anchor: b.node, acr: k, before: expand[k] + " (", after: ")" })] : [opt("Placeholder for the writer", { type: "wrap", anchor: b.node, acr: k, before: `[${k} in full] (`, after: ")" })],
          own: { kind: "wrap", anchor: b.node, acr: k } });
      });
    });
    // what the DCES chose: an option, their own version, a comment only, or leave it out
    const choices = opts.choices || {};
    out.forEach(s => {
      const c = choices[s.id]; let pick = c ? c.pick : (s.options.length ? 0 : "comment");
      if (typeof pick === "number" && !s.options[pick]) pick = s.options.length ? 0 : "comment";
      if (pick === "own") {
        const lines = String(c.own || "").split(/\n+/).map(x => x.trim()).filter(Boolean); const o = s.own || { kind: "comment" };
        if (!lines.length) pick = "comment";
        else if (o.kind === "insert") s.apply = ins(o.anchor, o.mode, [...(o.head || []), ...lines.map(x => o.style ? { style: o.style, text: x } : P_(x))]);
        else if (o.kind === "replace") s.apply = { type: "replace", anchor: o.anchor, paras: lines };
        else if (o.kind === "relabel") s.apply = { type: "relabel", anchor: o.anchor, url: o.url, label: lines.join(" ") };
        else if (o.kind === "alt") s.apply = { type: "alt", anchor: o.anchor, text: lines.join(" ") };
        else if (o.kind === "wrap") s.apply = { type: "wrap", anchor: o.anchor, acr: o.acr, before: lines.join(" ") + " (", after: ")" };
        else if (o.kind === "header") s.apply = { type: "header", anchor: o.anchor, items: lines.map(P_) };
        else s.ownComment = lines.join(" ");
      } else if (typeof pick === "number") s.apply = s.options[pick];
      s.pick = pick;
    });

    // ---- write the reviewed document ----
    const date = new Date().toISOString().replace(/\.\d+Z$/, "Z"); let tid = 900000; let cid = 0;
    const el = (name, attrs = {}, kids = []) => { const e = doc.createElementNS(W, "w:" + name); Object.entries(attrs).forEach(([k, v]) => e.setAttributeNS(W, "w:" + k, String(v))); kids.forEach(k => e.appendChild(k)); return e; };
    const sid = k => byName[k === "h1" ? "heading 1" : k === "h2" ? "heading 2" : k === "h3" ? "heading 3" : "normal"];
    const run = (t, o = {}) => { const rp = el("rPr"); if (o.bold) rp.appendChild(el("b")); if (o.italic) rp.appendChild(el("i")); if (o.color) rp.appendChild(el("color", { val: o.color })); if (o.size) rp.appendChild(el("sz", { val: o.size * 2 })); if (o.hl) rp.appendChild(el("highlight", { val: o.hl }));
      const tt = el("t"); tt.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve"); tt.textContent = t; return el("r", {}, [rp, tt]); };
    const insPara = item => {
      const ppr = el("pPr"); const s = item.style ? sid(item.style) : null;
      if (s) ppr.appendChild(el("pStyle", { val: s }));
      else if (item.style) { /* no heading style in this document: bold, larger text */ item.bold = true; item.size = item.style === "h1" ? 16 : item.style === "h2" ? 13 : 11.5; }
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
    const lastAfter = new Map(); const replaced = new Set();
    const toDel = r => { allOf(r, "t").forEach(t => { const d = doc.createElementNS(W, "w:delText"); d.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve"); d.textContent = t.textContent; t.parentNode.replaceChild(d, t); }); };
    const rprOf = p => { const r = allOf(p, "r").find(x => firstOf(x, "t")); const rp = r ? firstOf(r, "rPr") : null; return rp ? rp.cloneNode(true) : null; };
    const newRun = (text, rp) => { const r = run(text, { hl: accepted ? null : "yellow" }); if (rp) { const own = firstOf(r, "rPr"); kidsOf(rp).forEach(k => { if (!["highlight"].includes(k.localName)) own.appendChild(k.cloneNode(true)); }); } return r; };
    const tracked = kids => accepted ? kids : [el("ins", { id: ++tid, author: cfg.author, date }, kids)];
    const doApply = (o, s) => {
      if (o.type === "insert") {
        let ref = o.mode === "after" ? (lastAfter.get(o.anchor) || o.anchor) : o.anchor;
        o.items.forEach(item => { const p = insPara(item); if (o.mode === "after") { ref.parentNode.insertBefore(p, ref.nextSibling); ref = p; } else o.anchor.parentNode.insertBefore(p, o.anchor); });
        if (o.mode === "after") lastAfter.set(o.anchor, ref);
        return "Added to the draft (tracked change)";
      }
      if (o.type === "replace") {
        if (replaced.has(o.anchor)) return "Comment in the margin";
        replaced.add(o.anchor); const p = o.anchor; const rp = rprOf(p);
        const runs = kidsOf(p).filter(k => k.localName === "r");
        if (accepted) runs.forEach(r => p.removeChild(r));
        else { const del = el("del", { id: ++tid, author: cfg.author, date }); runs[0] && p.insertBefore(del, runs[0]); runs.forEach(r => { toDel(r); del.appendChild(r); }); }
        tracked([newRun(o.paras[0], rp)]).forEach(k => p.appendChild(k));
        let ref = p;
        o.paras.slice(1).forEach(t => { const np = el("p"); const ppr = firstOf(p, "pPr"); if (ppr) np.appendChild(ppr.cloneNode(true));
          if (!accepted) { const pp = firstOf(np, "pPr") || np.insertBefore(el("pPr"), np.firstChild); let rpr = firstOf(pp, "rPr"); if (!rpr) { rpr = el("rPr"); pp.appendChild(rpr); } rpr.appendChild(el("ins", { id: ++tid, author: cfg.author, date })); }
          tracked([newRun(t, rp)]).forEach(k => np.appendChild(k)); ref.parentNode.insertBefore(np, ref.nextSibling); ref = np; });
        return "Rewritten in the draft (tracked change)";
      }
      if (o.type === "wrap") {
        const t = allOf(o.anchor, "t").find(x => new RegExp("\\b" + o.acr + "\\b").test(x.textContent)); if (!t) return "Comment in the margin";
        const r = t.parentNode; const rp = firstOf(r, "rPr"); const txt = t.textContent; const i = txt.search(new RegExp("\\b" + o.acr + "\\b"));
        const mk = (x, ins_) => { const nr = run(x, ins_ && !accepted ? { hl: "yellow" } : {}); const own = firstOf(nr, "rPr"); if (rp) kidsOf(rp).forEach(k => own.appendChild(k.cloneNode(true))); return ins_ ? tracked([nr]) : [nr]; };
        const parts = [...(i > 0 ? mk(txt.slice(0, i)) : []), ...mk(o.before, true), ...mk(o.acr), ...mk(o.after, true), ...(i + o.acr.length < txt.length ? mk(txt.slice(i + o.acr.length)) : [])];
        parts.forEach(k => r.parentNode.insertBefore(k, r)); r.parentNode.removeChild(r);
        return "Written in full in the draft (tracked change)";
      }
      if (o.type === "relabel") {
        const h = allOf(o.anchor, "hyperlink").find(x => { const id = x.getAttributeNS(R, "id") || x.getAttribute("r:id"); return id && rels[id] === o.url; }); if (!h) return "Comment in the margin";
        const runs = kidsOf(h, "r"); const rp = runs[0] ? firstOf(runs[0], "rPr") : null;
        if (accepted) runs.forEach(r => h.removeChild(r)); else { const del = el("del", { id: ++tid, author: cfg.author, date }); runs[0] && h.insertBefore(del, runs[0]); runs.forEach(r => { toDel(r); del.appendChild(r); }); }
        tracked([newRun(o.label, rp)]).forEach(k => h.appendChild(k));
        return "Link text rewritten (tracked change)";
      }
      if (o.type === "alt") { Array.from(o.anchor.getElementsByTagNameNS(WP, "docPr")).filter(d => !(d.getAttribute("descr") || "").trim()).forEach(d => d.setAttribute("descr", o.text)); return "Alt text added"; }
      if (o.type === "header") {
        const tr = kidsOf(o.anchor, "tr")[0]; if (tr) { let trPr = firstOf(tr, "trPr"); if (!trPr) { trPr = el("trPr"); tr.insertBefore(trPr, firstOf(tr, "tc")); } if (!firstOf(trPr, "tblHeader")) trPr.appendChild(el("tblHeader")); }
        (o.items || []).forEach(item => o.anchor.parentNode.insertBefore(insPara(item), o.anchor));
        return "Introduced, header row marked (tracked change)";
      }
      return "Comment in the margin";
    };
    out.forEach(s => {
      if (s.pick === "skip") { s.how = "Left out"; return; }
      if (s.apply) { s.how = doApply(s.apply, s); s.applied = !/^Comment/.test(s.how); }
      else s.how = "Comment in the margin";
    });
    if (!accepted) {
      out.forEach(s => {
        if (s.pick === "skip") return;
        const note = s.ownComment ? `${s.principle}: ${s.ownComment}` : `${s.principle}: ${s.title}. ${s.detail}`;
        if (s.apply && s.apply.type === "insert" && s.applied) return;           // the inserted text speaks for itself
        const anchorNode = s.apply && s.applied && s.apply.anchor ? s.apply.anchor : s.anchor;
        if (s.mode === "comment-before" && !(s.apply && s.applied)) {
          const p = el("p", {}, [el("pPr", {}, [el("rPr")]), run(" ")]); s.anchor.parentNode.insertBefore(p, s.anchor); comment(p, note);
        } else if (anchorNode.localName === "p") comment(anchorNode, note);
        else { const p = el("p", {}, [el("pPr", {}, [el("rPr")]), run(" ")]); anchorNode.parentNode.insertBefore(p, anchorNode); comment(p, note); }
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
    return { suggestions: out.map(s => ({ id: s.id, principle: s.principle, where: s.where, title: s.title, detail: s.detail, original: s.original, how: s.how, pick: s.pick,
      options: s.options.map(o => ({ label: o.label, preview: o.preview })), ownKind: (s.own || { kind: "comment" }).kind, ownComment: s.ownComment })), file: blob, modules: modules.length };
  }
  return { review };
})();
if (typeof module !== "undefined") module.exports = UDLReview;
