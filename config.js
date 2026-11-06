// ============================================================================
// Course Draft Sorter: settings
// ----------------------------------------------------------------------------
// This is the file to edit when the rules change. Edit it on GitHub (open the
// file, click the pencil icon, make the change, then "Commit changes"). The
// live tool updates a minute or two later.
// Keep the punctuation as it is: text goes inside "quotes", items are separated
// by commas, and lists sit inside [square brackets].
// ============================================================================
var SORTER_CONFIG = {

  // ---- Resource types (the "Item Type (code)" list in the Data tab of T06) ----
  types: [
    ["V", "Video"], ["IG", "Infographic"], ["IR", "Interactive resource"], ["G", "Guide"],
    ["InfoSet", "Information set"], ["Art", "Article"], ["Res", "Research"], ["Text", "Text"],
    ["T&D", "Teaching and Demonstration"], ["Scena", "Scenarios"], ["PPT", "PowerPoint"],
    ["IP", "Interactive Presentation"], ["ME", "Moodle Element"], ["IMG", "Image"], ["GR", "Graph"],
    ["S", "Slide"], ["Icon", "Icon"], ["T", "Table"], ["A", "Accordion"], ["Au", "Audio"],
    ["VO", "Voice over"], ["B", "Buttons"], ["GS", "Google Slide"], ["Pod", "Podcast"],
    ["WB", "Workbook"], ["Cap", "Captions"], ["SB", "Storyboard & script"]
  ],

  // ---- Colour palettes: name (as in the Data tab), primary and highlight colour ----
  palettes: [
    ["P1 ICT and LA", "#007DBA", "#FFC600"],
    ["P2 Leadership Academy", "#00A1A3", "#D73828"],
    ["P3 FET and LA", "#890C58", "#007DBA"],
    ["P4 Inclusive Education and LA", "#D73828", "#00A1A3"],
    ["P5 Foundation Phase", "#5B7F95", "#8FAD15"],
    ["P6 Intersen and Senior Phase", "#8FAD15", "#FFC600"],
    ["P7 Teacher Practice Improvement", "#C8126E", "#00A1A3"],
    ["P8 PDD", "#007DBA", "#FFC600"],
    ["P9 CTLI Director", "#001489", "#FFC600"],
    ["P10 EDULIS", "#C4D600", "#D73828"],
    ["WCG Guideline", "#001489", "#FFC600"],
    ["FRE Future Ready Education", "#007DBA", "#D73828"]
  ],

  // ---- Course page: sections before Module 1 are matched to these six tabs ----
  // The words after each tab name are the headings that belong in that tab.
  courseTabs: [
    ["Course Description", /programme overview|course description|requirement|areas of development|overview/i],
    ["Learning Objectives", /learning objective|objectives|outcome/i],
    ["Course Structure", /course structure|^modules$|delivery|duration|facilitator|mentor|time to meet|assignments? and activit|schedule/i],
    ["Badging & Certification", /badg|certif/i],
    ["Navigation & Online Learning Tips", /^content$|navigat|tips|how to use|online learning/i],
    ["References and additional reading material", /reference|reading/i]
  ],

  // ---- Activities: bold lines in the draft that start a new resource ----
  // match = words to look for; code = the resource type it becomes;
  // question = what goes into the Question Bank ("None" = nothing).
  activities: [
    { match: /assignment|task\b|project/i, kind: "Assignment", code: "ME", tool: "Moodle", question: "None" },
    { match: /reflect|forum|discussion|post\b/i, kind: "Forum / reflection", code: "ME", tool: "Moodle", question: "Reflection" },
    { match: /knowledge check|quiz|check your|self-check|test your/i, kind: "Knowledge check", code: "ME", tool: "Moodle", question: "Knowledge check" },
    { match: /^download/i, kind: "Download", code: "G", tool: "Google Docs", question: "None" },
    { match: /infographic/i, kind: "Infographic", code: "IG", tool: "Canva", question: "None" },
    { match: /video/i, kind: "Video", code: "V", tool: "Canva", question: "None" },
    { match: /scenario|case study/i, kind: "Scenario", code: "Scena", tool: "Moodle", question: "None" }
  ],

  // ---- Links in the draft that are resources in their own right ----
  links: [
    { match: /genial/i, kind: "Interactive resource", code: "IR", tool: "Genially" },
    { match: /youtu|vimeo/i, kind: "Video", code: "V", tool: "YouTube" },
    { match: /canva\.com/i, kind: "Canva resource", code: "IG", tool: "Canva" }
  ],

  // ---- Suggested elements (guidance only: the developers decide what to build) ----
  // Each rule: when = which resources it applies to; suggest = [type code, why].
  suggestions: [
    { when: it => it.code === "Text" && it.words > 250, suggest: [["IG", "Infographic of the key points"], ["IR", "Interactive resource to break up a long reading"]] },
    { when: it => it.code === "Text" && it.words > 120 && it.words <= 250, suggest: [["IG", "Infographic of the key points"], ["V", "Short explainer video"]] },
    { when: it => it.code === "T", suggest: [["A", "Accordion in Moodle"], ["IG", "Infographic of the table"]] },
    { when: it => it.kind === "Assignment", suggest: [["G", "Task guide with steps and rubric"]] },
    { when: it => it.kind === "Forum / reflection" || it.kind === "Knowledge check", suggest: [["IG", "Prompt card for the activity"]] },
    { when: it => it.code === "V", suggest: [["SB", "Storyboard & script"], ["VO", "Voice over"], ["Cap", "Captions"]] },
    { when: it => it.code === "IR", suggest: [["SB", "Storyboard & script"]] }
  ],

  // ---- Where things go in the Resource Creation Sheet (T06) ----
  // Only change these if the columns in T06 move.
  sheet: {
    rc: "Resource Creation", rcFirstRow: 3, rcLastRow: 300,
    rcCols: { code: "A", programme: "B", type: "C", source: "D", element: "E", resource: "F", module: "G", description: "H",
              palette: "I", due: "J", status: "K", writer: "L", notes: "P", vid: "R", tools: "S", vid2: "AA", product: "AB",
              link: "O", product_link: "AC", done: "AT" },
    // Columns the developers fill in when they choose their elements. The sorter never writes in these.
    developerCols: ["R", "S", "AA", "AB"],
    qb: "Question Bank", qbFirstRow: 2,
    snippets: "Snippets", snFirstRow: 5,
    blueprint: "Design Blueprint", blueprintCells: { course: "D6", programme: "D7", palette: "D9", dces: "D11" },
    data: "Data", dataProgrammes: "H", dataWriters: "C",
    projectPlan: "Project Plan",
    startStatus: "Not started"
  }
};
if (typeof module !== "undefined") module.exports = SORTER_CONFIG;
