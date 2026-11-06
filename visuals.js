// Course Draft Sorter: small visual examples of each kind of element, drawn in the chosen palette.
// Add or change a drawing by editing the matching entry below (SVG, 120 x 76).
const VISUALS = (() => {
  const N = "#001489", G = "#A6BBC8", W = "#FFFFFF", L = "#EEF2F6";
  const frame = (inner, p) => `<rect x="0.5" y="0.5" width="119" height="75" rx="6" fill="${W}" stroke="${G}"/><rect x="0.5" y="0.5" width="119" height="9" rx="4" fill="${N}"/>${inner}`;
  const lines = (x, y, n, w, gap = 6) => Array.from({ length: n }, (_, i) => `<rect x="${x}" y="${y + i * gap}" width="${i === n - 1 ? w * 0.6 : w}" height="2.6" rx="1.3" fill="${G}"/>`).join("");
  const draw = {
    IG: (p, h) => frame(`<text x="10" y="21" font-size="7" font-weight="700" fill="${N}" font-family="Arial">KEY POINTS</text>
      ${[0, 1, 2].map(i => `<circle cx="${20 + i * 38}" cy="38" r="9" fill="${i === 1 ? h : p}"/><text x="${20 + i * 38}" y="41" font-size="8" font-weight="700" text-anchor="middle" fill="${W}" font-family="Arial">${i + 1}</text>${lines(9 + i * 38, 52, 3, 22, 5)}`).join("")}`, p),
    IR: (p, h) => frame(`<rect x="8" y="15" width="104" height="54" rx="4" fill="${L}"/><path d="M8 58 L40 34 L62 50 L82 38 L112 58 V69 H8Z" fill="${p}" opacity=".35"/>
      ${[[30, 30], [66, 44], [94, 26]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="7" fill="${i === 1 ? h : p}"/><path d="M${x - 3} ${y}h6M${x} ${y - 3}v6" stroke="${W}" stroke-width="1.8"/>`).join("")}
      <rect x="70" y="52" width="38" height="13" rx="2" fill="${W}" stroke="${p}"/>${lines(73, 56, 2, 30, 4)}`, p),
    V: (p, h) => frame(`<rect x="8" y="15" width="104" height="48" rx="4" fill="${p}"/><circle cx="60" cy="39" r="11" fill="${W}" opacity=".95"/><path d="M56 33 L66 39 L56 45Z" fill="${p}"/>
      <rect x="8" y="67" width="104" height="3" rx="1.5" fill="${G}"/><rect x="8" y="67" width="40" height="3" rx="1.5" fill="${h}"/><circle cx="48" cy="68.5" r="3" fill="${h}"/>`, p),
    A: (p, h) => frame(`${[0, 1, 2, 3].map(i => `<rect x="8" y="${15 + i * 14 + (i > 1 ? 14 : 0)}" width="104" height="11" rx="3" fill="${i === 1 ? p : L}" stroke="${i === 1 ? p : G}"/><text x="13" y="${23 + i * 14 + (i > 1 ? 14 : 0)}" font-size="6.5" font-weight="700" fill="${i === 1 ? W : N}" font-family="Arial">Topic ${i + 1}</text><path d="M104 ${19 + i * 14 + (i > 1 ? 14 : 0)} l3 3 l3 -3" stroke="${i === 1 ? W : N}" fill="none" stroke-width="1.3"/>`).join("")}
      <rect x="12" y="44" width="96" height="11" fill="${W}"/>${lines(14, 45.5, 2, 88, 4.5)}`, p),
    G: (p, h) => frame(`<rect x="22" y="14" width="76" height="58" rx="2" fill="${W}" stroke="${G}"/><rect x="22" y="14" width="76" height="10" fill="${p}"/><text x="27" y="21.5" font-size="6" font-weight="700" fill="${W}" font-family="Arial">TASK GUIDE</text>
      ${[0, 1, 2].map(i => `<rect x="27" y="${29 + i * 13}" width="7" height="7" rx="1.5" fill="${i === 0 ? h : W}" stroke="${p}"/>${lines(38, 30 + i * 13, 2, 52, 4)}`).join("")}`, p),
    SB: (p, h) => frame(`${[0, 1, 2, 3, 4, 5].map(i => { const x = 8 + (i % 3) * 36, y = 15 + Math.floor(i / 3) * 29; return `<rect x="${x}" y="${y}" width="32" height="17" rx="2" fill="${i === 0 ? p : L}" stroke="${G}"/><text x="${x + 2}" y="${y + 7}" font-size="5" font-weight="700" fill="${i === 0 ? W : N}" font-family="Arial">${i + 1}</text>${lines(x, y + 20, 2, 30, 3.5)}`; }).join("")}`, p),
    VO: (p, h) => frame(`<circle cx="22" cy="42" r="10" fill="${p}"/><rect x="19" y="35" width="6" height="10" rx="3" fill="${W}"/><path d="M17 42a5 5 0 0 0 10 0M22 47v3" stroke="${W}" fill="none" stroke-width="1.3"/>
      ${Array.from({ length: 18 }, (_, i) => { const hh = 6 + Math.abs(Math.sin(i * 1.7)) * 22; return `<rect x="${40 + i * 4}" y="${42 - hh / 2}" width="2.4" height="${hh}" rx="1.2" fill="${i < 7 ? h : G}"/>`; }).join("")}`, p),
    Cap: (p, h) => frame(`<rect x="8" y="15" width="104" height="54" rx="4" fill="${p}"/><rect x="22" y="52" width="76" height="12" rx="2" fill="${N}" opacity=".85"/>${lines(28, 55, 2, 64, 4).replace(new RegExp(G, "g"), W)}<rect x="94" y="19" width="14" height="9" rx="2" fill="${W}"/><text x="101" y="26" font-size="5.5" font-weight="700" text-anchor="middle" fill="${N}" font-family="Arial">CC</text>`, p),
    T: (p, h) => frame(`<rect x="8" y="15" width="104" height="10" fill="${p}"/>${[0, 1, 2, 3].map(i => `<rect x="8" y="${25 + i * 11}" width="104" height="11" fill="${i % 2 ? L : W}" stroke="${G}" stroke-width=".5"/>`).join("")}<path d="M42 15v54M78 15v54" stroke="${G}" stroke-width=".6"/>`, p),
    Text: (p, h) => frame(`<rect x="10" y="15" width="50" height="5" rx="2" fill="${p}"/>${lines(10, 26, 6, 100, 7)}`, p),
    ME: (p, h) => frame(`<text x="10" y="21" font-size="6.5" font-weight="700" fill="${N}" font-family="Arial">Moodle activity</text>${lines(10, 25, 2, 100, 5)}
      <rect x="10" y="37" width="100" height="18" rx="2" fill="${W}" stroke="${G}"/><rect x="80" y="60" width="30" height="10" rx="3" fill="${p}"/><text x="95" y="67" font-size="5.5" font-weight="700" text-anchor="middle" fill="${W}" font-family="Arial">Submit</text>`, p),
    Scena: (p, h) => frame(`<rect x="10" y="15" width="62" height="16" rx="6" fill="${L}"/>${lines(15, 20, 2, 52, 5)}<rect x="48" y="35" width="62" height="16" rx="6" fill="${p}" opacity=".9"/>${lines(53, 40, 2, 52, 5).replace(new RegExp(G, "g"), W)}
      <rect x="10" y="57" width="46" height="12" rx="3" fill="${W}" stroke="${h}" stroke-width="1.5"/><rect x="64" y="57" width="46" height="12" rx="3" fill="${W}" stroke="${G}"/><text x="33" y="65" font-size="5.5" text-anchor="middle" fill="${N}" font-family="Arial">Choice A</text><text x="87" y="65" font-size="5.5" text-anchor="middle" fill="${N}" font-family="Arial">Choice B</text>`, p),
    GR: (p, h) => frame(`${[18, 30, 24, 40, 34].map((v, i) => `<rect x="${16 + i * 19}" y="${68 - v}" width="12" height="${v}" rx="2" fill="${i === 3 ? h : p}"/>`).join("")}<path d="M10 68H112" stroke="${G}"/>`, p),
    B: (p, h) => frame(`${[0, 1, 2, 3].map(i => `<rect x="${10 + (i % 2) * 52}" y="${17 + Math.floor(i / 2) * 27}" width="48" height="21" rx="5" fill="${i === 0 ? h : p}"/>${lines(16 + (i % 2) * 52, 26 + Math.floor(i / 2) * 27, 1, 30).replace(new RegExp(G, "g"), W)}`).join("")}`, p),
    IP: (p, h) => frame(`<rect x="8" y="15" width="104" height="48" rx="3" fill="${L}" stroke="${G}"/><rect x="14" y="21" width="44" height="5" rx="2" fill="${p}"/>${lines(14, 31, 4, 40, 6)}<rect x="66" y="21" width="40" height="36" rx="3" fill="${p}" opacity=".3"/><circle cx="86" cy="39" r="6" fill="${h}"/><path d="M83 39h6M86 36v6" stroke="${W}" stroke-width="1.6"/>${[0, 1, 2, 3].map(i => `<circle cx="${50 + i * 7}" cy="68" r="2" fill="${i === 1 ? p : G}"/>`).join("")}`, p),
    Pod: (p, h) => frame(`<rect x="10" y="16" width="40" height="40" rx="5" fill="${p}"/><circle cx="30" cy="34" r="9" fill="none" stroke="${W}" stroke-width="2"/><circle cx="30" cy="34" r="3" fill="${h}"/>${lines(58, 20, 3, 50, 7)}<rect x="10" y="63" width="100" height="3" rx="1.5" fill="${G}"/><rect x="10" y="63" width="30" height="3" rx="1.5" fill="${h}"/>`, p),
    WB: (p, h) => frame(`<rect x="14" y="14" width="44" height="58" rx="2" fill="${W}" stroke="${G}"/><rect x="62" y="14" width="44" height="58" rx="2" fill="${W}" stroke="${G}"/><rect x="14" y="14" width="44" height="8" fill="${p}"/>${lines(18, 27, 5, 36, 7)}${[0, 1, 2].map(i => `<rect x="66" y="${20 + i * 17}" width="36" height="12" rx="1" fill="${L}" stroke="${G}" stroke-dasharray="2 1.5"/>`).join("")}`, p)
  };
  const alias = { InfoSet: "IG", Art: "Text", Res: "Text", "T&D": "V", PPT: "IP", GS: "IP", S: "IP", IMG: "IR", Icon: "B", Au: "VO" };
  const fallback = (p, h) => frame(`<rect x="10" y="16" width="100" height="52" rx="4" fill="${L}"/><circle cx="60" cy="42" r="12" fill="${p}"/>`, p);
  const ABOUT = {
    IG: "One screen of key points, steps or numbers, laid out visually.", IR: "A picture or diagram with hotspots learners click to reveal more.",
    V: "A short explainer video, built from a storyboard and script.", A: "Collapsible headings in Moodle: learners open one part at a time.",
    G: "A downloadable guide or task sheet with steps, checklists or a rubric.", SB: "Scene-by-scene plan: visuals, narration and on-screen text.",
    VO: "Recorded narration for a video or interactive resource.", Cap: "Captions or a transcript so every video is accessible.",
    T: "A styled table in Moodle.", Text: "A Moodle reading page: headings, short paragraphs and lists.", ME: "A Moodle activity: forum, assignment, quiz or choice.",
    Scena: "A short scenario with choices and feedback.", GR: "A chart or graph of data from the content.", B: "Buttons or tiles that link to topics or resources.",
    IP: "Slides learners click through, with hotspots or reveals.", Pod: "An audio episode or conversation.", WB: "A workbook with spaces for learners to write."
  };
  function svg(code, p, h, label) {
    const fn = draw[code] || draw[alias[code]] || fallback;
    return `<svg viewBox="0 0 120 76" width="120" height="76" role="img" aria-label="${label || "Example of " + code}" xmlns="http://www.w3.org/2000/svg">${fn(p || "#007DBA", h || "#FFC600")}</svg>`;
  }
  return { svg, about: c => ABOUT[c] || ABOUT[alias[c]] || "", codes: Object.keys(ABOUT) };
})();
