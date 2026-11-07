// PDD Course Design Hub: developer timesheets (T08).
// Reads completed timesheets (the T08 layout or the older content developer timesheet), works out the
// claim lines for the PDD Support Claim, and fills a new T08 for a developer. Settings: config.js → timesheet.
const Timesheets = (() => {
  const T = () => (typeof CFG !== "undefined" ? CFG : SORTER_CONFIG).timesheet;
  const EPOCH = Date.UTC(1899, 11, 30);
  const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

  // a time of day as a fraction of a day: 0.5 = 12:00. Accepts Excel times, "9:30", "14:30:00", "9h30", "9.30"
  function time(v) {
    if (v === "" || v == null) return null;
    if (typeof v === "number") return v >= 1 ? v % 1 : v;
    const m = /^\s*(\d{1,2})\s*[:hH.]\s*(\d{2})(?:\s*[:.]\s*(\d{2}))?\s*(am|pm)?\s*$/i.exec(String(v));
    if (!m) return null;
    let h = +m[1]; const min = +m[2]; if (m[4]) { if (/pm/i.test(m[4]) && h < 12) h += 12; if (/am/i.test(m[4]) && h === 12) h = 0; }
    if (h > 24 || min > 59) return null; return (h * 60 + min) / 1440;
  }
  // a date as an Excel serial number. Accepts Excel dates, "12/2/26", "15/2/2026" (day first), "2026-02-15", "15 Feb 2026"
  function date(v) {
    if (v === "" || v == null) return null;
    if (typeof v === "number") return v > 20000 ? Math.floor(v) : null;
    const s = String(v).trim(); let y, mo, d, m;
    if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else if ((m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/.exec(s))) { d = +m[1]; mo = +m[2]; y = +m[3]; if (mo > 12 && d <= 12) [d, mo] = [mo, d]; }
    else if ((m = /^(\d{1,2})\s+([A-Za-z]{3,})\.?\s+(\d{2,4})$/.exec(s))) { d = +m[1]; mo = MONTHS.findIndex(x => x.startsWith(m[2].toLowerCase().slice(0, 3))) + 1; y = +m[3]; }
    else return null;
    if (y < 100) y += 2000; if (!mo || mo > 12 || d > 31) return null;
    return Math.round((Date.UTC(y, mo - 1, d) - EPOCH) / 86400000);
  }
  const iso = n => n == null ? "" : new Date(EPOCH + n * 86400000).toISOString().slice(0, 10);
  const nice = n => n == null ? "" : new Date(EPOCH + n * 86400000).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const hm = min => `${Math.floor(Math.round(min) / 60)}:${String(Math.round(min) % 60).padStart(2, "0")}`;

  // the claim category for what the developer typed: "119_Multi-media design (Basic)," → "119_Multi-media design (Basic)"
  function category(raw) {
    const s = String(raw || "").trim().replace(/[,;.\s]+$/, ""); if (!s) return { cat: "", known: false };
    const cats = T().categories; const low = s.toLowerCase();
    const hit = cats.find(c => c.toLowerCase() === low) || cats.find(c => low.startsWith(c.toLowerCase()))
      || (/^\d{3}/.test(s) ? cats.find(c => c.slice(0, 3) === s.slice(0, 3)) : null)
      || cats.find(c => c.slice(4).toLowerCase() === low);
    return hit ? { cat: hit, known: true } : { cat: s, known: false };
  }

  // reads one completed timesheet workbook (a Workbook from workbook.js)
  async function read(wb, fileName) {
    const H = T().headers; let found = null;
    for (const name of wb.names()) {
      const sh = await wb.sheet(name);
      for (let r = 1; r <= 20 && !found; r++) {
        const map = {};
        for (let c = 1; c <= 30; c++) {
          const t = sh.text(colName(c) + r); if (!t) continue;
          Object.entries(H).forEach(([k, re]) => { if (!map[k] && re.test(t)) map[k] = colName(c); });
        }
        if (map.category && map.start && map.end) found = { sh, r, map };
      }
      if (found) break;
    }
    if (!found) throw new Error("No timesheet table found: the file needs the headings Activity Category, Start Time and End Time.");
    const { sh, r: hr, map } = found;
    // team member and month: the first filled cells to the right of their labels, above the table
    const labelled = re => { for (let r = 1; r < hr; r++) for (let c = 1; c <= 20; c++) if (re.test(sh.text(colName(c) + r))) { const out = []; for (let k = c + 1; k <= c + 8; k++) { const v = sh.get(colName(k) + r); if (v !== "" && v != null) out.push(v); } return out; } return []; };
    const nameVals = labelled(/^team member/i), monthVals = labelled(/^month/i);
    let month = monthVals.map(String).join(" ").trim();
    if (monthVals.length && typeof monthVals[0] === "number" && monthVals[0] > 20000) { const d = new Date(EPOCH + monthVals[0] * 86400000); month = d.toLocaleDateString("en-ZA", { month: "long", year: "numeric", timeZone: "UTC" }); }
    const out = { file: fileName || "", name: String(nameVals[0] || "").trim(), month, entries: [], warnings: [] };
    const get = (k, r) => map[k] ? sh.get(map[k] + r) : "";
    const txt = (k, r) => { const v = get(k, r); return v === "" || v == null ? "" : String(v).trim(); };
    let lastDate = null, lastPlo = "", blanks = 0;
    for (let r = hr + 1; r <= Math.min(sh.lastUsedRow(), hr + 600); r++) {
      const s = time(get("start", r)), e = time(get("end", r));
      const rawMin = get("minutes", r), rawDur = get("duration", r);
      let minutes = null;
      if (s != null && e != null) { let d = e - s; if (d < 0) d += 1; minutes = Math.round(d * 1440); }
      else if (typeof rawMin === "number" && rawMin > 0) minutes = Math.round(rawMin);
      else if (typeof rawDur === "number" && rawDur > 0) minutes = Math.round(rawDur * 1440);
      const dt = date(get("date", r)); if (dt != null) lastDate = dt;
      const plo = txt("plo", r); if (plo) lastPlo = plo;
      const firstCell = sh.text("A" + r) + sh.text("B" + r) + sh.text("C" + r) + sh.text("D" + r);
      if (/^total/i.test(sh.text((map.end || "H") + r)) || /^total/i.test(firstCell)) break;
      if (!minutes) { if (s != null || e != null) out.warnings.push(`Row ${r}: a start or end time is missing, so this row is left out.`); continue; }
      if (/^example$/i.test(plo)) continue;
      const c = category(txt("category", r));
      const entry = { row: r, date: lastDate, plo: lastPlo, cat: c.cat, known: c.known, code: txt("code", r), desc: txt("desc", r), start: s, end: e, minutes };
      if (!entry.cat) out.warnings.push(`Row ${r}: no activity category, so ${hm(minutes)} cannot be claimed.`);
      else if (!c.known) out.warnings.push(`Row ${r}: "${entry.cat}" is not a support category in the claim criteria.`);
      if (entry.date == null) out.warnings.push(`Row ${r}: no date.`);
      if (minutes > 12 * 60) out.warnings.push(`Row ${r}: ${hm(minutes)} in one session. Check the start and end times.`);
      out.entries.push(entry); blanks = 0;
    }
    // overlapping sessions on the same day
    const byDay = {}; out.entries.forEach(x => { if (x.date != null && x.start != null) (byDay[x.date] = byDay[x.date] || []).push(x); });
    Object.values(byDay).forEach(list => { list.sort((a, b) => a.start - b.start); for (let i = 1; i < list.length; i++) { const p = list[i - 1]; const pe = p.end < p.start ? p.end + 1 : p.end; if (list[i].start < pe - 1e-9) out.warnings.push(`Rows ${p.row} and ${list[i].row} overlap on ${nice(list[i].date)}.`); } });
    if (!out.entries.length) out.warnings.push("No time entries with a start and end time were found.");
    return out;
  }

  // one line per support category, in the order of the PDD Support Claim criteria
  function claimLines(entries, from, to) {
    const inPeriod = x => (from == null || (x.date != null && x.date >= from)) && (to == null || (x.date != null && x.date <= to));
    const groups = new Map();
    entries.filter(x => x.cat && inPeriod(x)).forEach(x => {
      const g = groups.get(x.cat) || { cat: x.cat, known: x.known, start: null, end: null, minutes: 0, items: new Map(), plos: new Set() };
      g.minutes += x.minutes; if (x.date != null) { g.start = g.start == null ? x.date : Math.min(g.start, x.date); g.end = g.end == null ? x.date : Math.max(g.end, x.date); }
      const key = x.code || x.desc || "Other"; g.items.set(key, (g.items.get(key) || 0) + x.minutes); if (x.plo) g.plos.add(x.plo);
      groups.set(x.cat, g);
    });
    const order = T().categories; const rank = c => { const i = order.indexOf(c); return i < 0 ? 999 : i; };
    return [...groups.values()].sort((a, b) => rank(a.cat) - rank(b.cat)).map((g, i) => ({
      nr: i + 1, cat: g.cat, known: g.known, start: g.start, end: g.end, minutes: g.minutes, hours: g.minutes / 60,
      task: g.known ? g.cat.replace(/^\d{3}_/, "") : g.cat, items: [...g.items.entries()], plos: [...g.plos]
    }));
  }
  const outside = (entries, from, to) => entries.filter(x => x.cat && ((from != null && (x.date == null || x.date < from)) || (to != null && (x.date == null || x.date > to))));

  // fills a blank T08 for one developer
  async function fill(wb, d) {
    const S = T(); const ts = await wb.sheet(S.sheet);
    ts.set(S.cells.name, d.name || ""); ts.set(S.cells.month, d.month || ""); if (d.year) ts.set(S.cells.year, +d.year);
    ts.set(S.cells.course, d.course || "");
    const li = await wb.sheet(S.lists);
    if (li) {
      (d.codes || []).forEach((c, i) => li.set(S.listCodes + (i + 2), c));
      (d.plos || []).forEach((p, i) => li.set(S.listPlos + (i + 2), p));
    }
    const me = await wb.sheet(S.elements);
    if (me) (d.elements || []).slice(0, 100).forEach((x, i) => {
      const r = S.elementsFirstRow + i;
      me.set("A" + r, x.code); me.set("B" + r, x.resource || ""); me.set("C" + r, x.module || ""); me.set("D" + r, x.tool || "");
      if (typeof x.due === "number") me.set("E" + r, x.due); if (typeof x.planned === "number") me.set("F" + r, x.planned);
      me.set("I" + r, x.status || "");
    });
    return wb;
  }
  return { read, claimLines, outside, fill, category, time, date, iso, nice, hm };
})();
if (typeof module !== "undefined") module.exports = Timesheets;
