// ============================================================================
// PDD Course Design Hub: settings
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

  // ---- Learning design review (UDL and the Moodle course flow) ----
  // The wording of every suggestion. {words}, {tab}, {verb}, {acr} and {avg} are filled in by the review.
  review: {
    author: "Learning design review",
    limits: { topicWords: 450, paragraphWords: 120, sentenceWords: 25 },
    knownAcronyms: ["CTLI", "WCED", "PDD", "DCES", "PLO", "SME", "TBC", "QA", "LP", "URL", "PDF", "MS", "AM", "PM", "DT", "SA"],
    howToReview1: "This page lists every suggestion. In the document, added sections are tracked changes highlighted in yellow, and advice is in comments in the margin.",
    howToReview2: "In Word: Review → Next to go through each change, then Accept or Reject. Read each comment, make the change you agree with, then delete the comment.",
    howToReview3: "When you are done, save the draft and add it to the PDD Course Design Hub as the approved draft. You can leave this page in: the Hub ignores everything before the first heading.",
    tabStarters: {
      "Course Description": ["[Welcome participants in one or two sentences: who this course is for and why it matters for their school.]", "[What participants will be able to do after the course.]", "[How long it takes and how it is delivered.]"],
      "Learning Objectives": ["By the end of this course, you will be able to:", "• [Observable action, e.g. plan …]", "• [Observable action, e.g. apply …]", "• [Observable action, e.g. evaluate …]"],
      "Course Structure": ["[List the modules in order, with the time each takes and what participants submit.]"],
      "Badging & Certification": ["[What participants must complete to earn the badge and certificate, and how to claim them.]"],
      "Navigation & Online Learning Tips": ["• Move through the modules in order using the tiles on the course page.", "• Each module starts with an overview and ends with key takeaways.", "• Your progress is saved: you can stop and come back at any time.", "• Use the help forum if anything does not work."],
      "References and additional reading material": ["[List the sources used and any optional further reading, with descriptive links.]"]
    },
    overviewStarter: ["By the end of this module, you will be able to:", "• [Observable outcome 1]", "• [Observable outcome 2]", "Why it matters: [one sentence linking the module to participants' schools].", "Time to complete: [e.g. 2 hours]"],
    knowledgeCheckStarter: ["[Question 1 about the key idea of this module?]", "a) [Option]", "b) [Option]", "c) [Option]", "[Correct answer and a one-sentence explanation shown as feedback]"],
    reflectionStarter: ["[A prompt that asks participants to connect this module to their own school, e.g. What will you try first at your school, and why?]"],
    summaryStarter: ["• [Key takeaway 1]", "• [Key takeaway 2]", "• [Key takeaway 3]", "Next: [what comes in the next module, or what to do at school this week]."],
    messages: {
      tabMissingTitle: "Add the {tab} tab", tabMissing: "Every CTLI Moodle course page has six tabs. A starter for {tab} has been added for the writer to complete.",
      tabThinTitle: "Complete the {tab} tab", tabThin: "The {tab} tab only has a heading. Add the content participants need here.",
      welcomeTitle: "Open with a welcome", welcome: "Recruit interest from the start: say who the course is for, why it matters to their school, and how long it takes (UDL: welcome and relevance).",
      verbTitle: "Use an observable verb", verb: "\"{verb}\" cannot be seen or measured. Use a verb participants can show, such as explain, plan, apply, compare or evaluate (UDL: set meaningful goals).",
      overviewTitle: "Add a module overview", overview: "Start the module with its outcomes, why it matters and the time to complete, so participants can plan (Moodle flow: overview first; UDL: set goals).",
      timeTitle: "Give the time to complete", time: "Add how long this module takes (for example 2 hours) so participants can plan their time (UDL: planning and strategy).",
      mediaTitle: "Offer the content in more than one way", media: "This module is text only. Add a short video, infographic or interactive resource for the key idea (UDL: multiple means of representation).",
      relevanceTitle: "Connect to participants' schools", relevance: "Add an example, case or scenario from a South African school so participants see why this matters to them (UDL: relevance, value and authenticity).",
      kcTitle: "Add a knowledge check", kc: "A short, ungraded knowledge check with feedback helps participants check their understanding before moving on (UDL: mastery-oriented feedback).",
      reflectTitle: "Add a reflection", reflect: "A reflective post asks participants to apply the module to their own practice (UDL: reflection and self-assessment).",
      summaryTitle: "Close with key takeaways", summary: "End the module with three key takeaways and what comes next (Moodle flow: summary last; UDL: highlight big ideas).",
      feedbackTitle: "Add the course feedback and badge", feedback: "End the course with a short feedback survey and the badge or certificate claim (Moodle flow: course close).",
      choiceTitle: "Offer a choice of format", choice: "Let participants choose how to show their learning: written, audio or video, a presentation or an infographic (UDL: multiple means of action and expression).",
      criteriaTitle: "Add success criteria", criteria: "Add success criteria or a short rubric so participants know what a good submission looks like (UDL: self-monitoring).",
      chunkTitle: "Chunk this topic", chunk: "This topic has {words} words. Break it into short sections with sub-headings, or move detail into an accordion or a download (UDL: perception and comprehension).",
      sentenceTitle: "Shorten the sentences", sentence: "Sentences here average {avg} words. Aim for about 20 or fewer, in plain language (UDL: language and symbols).",
      paraTitle: "Break up this paragraph", para: "This paragraph has {words} words. Split it into two or three shorter paragraphs or a list (UDL: perception).",
      linkTitle: "Use descriptive link text", link: "Link text should say where the link goes, not show the web address or say \"click here\" (accessibility, WCAG 2.4.4).",
      altTitle: "Add alt text to this image", alt: "Describe what the image shows for screen-reader users, or mark it as decorative (accessibility, WCAG 1.1.1).",
      tableTitle: "Introduce this table", table: "Add a one-sentence summary before the table and make sure the first row is a header row (accessibility and UDL: representation).",
      acronymTitle: "Write out {acr}", acronym: "Write {acr} in full the first time it is used, with the short form in brackets (UDL: clarify vocabulary)."
    }
  },

  // ---- Programme team: units, Programme Co-ordinators and people lists ----
  // These are the starting lists everyone sees. Anyone can add names in the dashboard
  // ("Edit team lists"); to make a change permanent for the whole team, update it here.
  teams: {
    units: [
      { name: "Leadership Academy", coordinators: ["Nobomoi Mdingi", "Christo Davids"] },
      { name: "Teacher Practice Improvement", coordinators: ["Natasha Fouche", "Magdalena Benn", "Brandon Arendse", "Adele Smith", "Gaironesa Daniels"] },
      { name: "EDULIS", coordinators: ["Lynette Prent", "Tamaryn Petersen", "Cleopatra Pienaar"] }
    ],
    people: {
      writers: ["Content developer (TBC)", "Gizelle Simpson"],
      developers: ["Content developer (TBC)"],
      pdd: ["Wazeer Small", "Gershwin Knozer", "Marchelle Fester", "Anita van Vuuren", "Gizelle Simpson", "Kurt Minnaar"],
      qa: ["Kurt Minnaar", "Gershwin Knozer", "Anita van Vuuren", "Sharlene Ackerman", "Marchelle Fester", "Gizelle Simpson"]
    }
  },

  // ---- Where things go in the Resource Creation Sheet (T06) ----
  // The Hub finds each Resource Creation column by its heading in row 2, so columns can move
  // without breaking it. The letters are only used if a heading cannot be found.
  sheet: {
    rc: "Resource Creation", rcFirstRow: 3, rcLastRow: 300, rcHeaderRow: 2,
    rcHeaders: { code: /^item code/i, programme: /^programme/i, type: /^item type/i, source: /^main source/i, element: /^source element/i,
                 resource: /^resource$/i, module: /^module$/i, description: /^description/i, devTime: /^(development time|duration)/i,
                 palette: /colour palette/i, due: /^due date/i, status: /^overall status/i, writer: /^writer/i, notes: /^notes/i,
                 vid: /visual instructional designer|^vid$/i, tools: /^digital tools/i, vid2: /visual instructional designer|^vid$/i,
                 product: /^product type/i, done: /^done/i, logged: /^time logged/i },
    rcCols: { code: "A", programme: "B", type: "C", source: "D", element: "E", resource: "F", module: "G", description: "H", devTime: "I",
              palette: "J", due: "K", status: "L", writer: "M", notes: "Q", vid: "S", tools: "T", vid2: "AB", product: "AC", done: "AU" },
    qb: "Question Bank", qbFirstRow: 2,
    snippets: "Snippets", snFirstRow: 5,
    blueprint: "Design Blueprint", blueprintCells: { course: "D6", programme: "D7", unit: "D8", palette: "D9", dces: "D11", coordinator: "D13" },
    // Data tab: where each list lives (rows 2 to 60), and the units table (unit names in row 1, co-ordinators below)
    data: "Data", dataProgrammes: "H", dataWriters: "C",
    dataLists: { writers: "C", developers: "D", pdd: "F", qa: "G" },
    dataUnits: { firstCol: "Q", lastCol: "Z", lastRow: 41 },
    projectPlan: "Project Plan",
    startStatus: "Not started",
    timeLog: "Time Log", timeLogFirstRow: 5, timeLogLastRow: 1504,
    links: "Project Links"   // Google Drive links for the project (PDD tools → New project fills it)
  },

  // ---- Timesheets (T08) and the PDD Support Claim ----
  // Activity categories exactly as they appear in the PDD Support Claim criteria (support category).
  // Rates and personal details stay in the claim sheet: the Hub only carries time and categories.
  timesheet: {
    categories: [
      "101_Research design and execution", "102_Research analysis and reporting", "103_Monitoring and impact study for internal use",
      "104_PDD team meetings", "105_Administration", "106_Data clean-up", "107_Reporting and feedback",
      "108_Design and Development coordination", "109_System coordination", "110_Quality assurance coordination",
      "111_Source, vet or compile", "112_Checks, edit and update", "113_Uploads/Downloads", "114_After Care and Follow-up support",
      "115_Subject matter expert (SME) support", "116_Subject matter expert (SME) content writing",
      "117_Programme design and construction (Learning design)", "118_Digital design and construction (Learning design)",
      "119_Multi-media design (Basic)", "120_Multi-media design (Intermediate)", "121_Multi-media design (Advanced)",
      "122_User experience design (UX)", "123_Training and Workshop facilitation", "124_Speaker", "125_Language editing",
      "126_Quality assurance", "127_PDD workstream facilitation"
    ],
    // where the Hub writes in a new T08 timesheet
    sheet: "Timesheet", firstRow: 6, lastRow: 105,
    cells: { name: "G2", month: "G3", year: "I3", course: "G4" },
    elements: "My elements", elementsFirstRow: 6,
    lists: "Lists", listCodes: "C", listPlos: "D",
    // headings the Hub looks for when it reads a completed timesheet (old or new layout)
    headers: { no: /^no\.?$/i, date: /^date$/i, plo: /^plo/i, category: /^activity cat/i, code: /^item code/i, desc: /^item desc/i,
               start: /^start/i, end: /^end/i, duration: /^duration/i, minutes: /^minutes/i }
  },

  // ---- Canva master templates shown in the Hub for each palette (thumbnails in assets/templates) ----
  // [file name start, label]. The palette code is the first word of the palette name (P1 … P10, WCG, FRE).
  templateKinds: [
    ["Banner", "Banner"], ["Course_Tile", "Course tile"], ["Infographic", "Infographic"], ["Process", "Process"],
    ["Graph", "Graph"], ["Master_Video", "Video"], ["Element_Kit", "Element kit"]
  ]
};
if (typeof module !== "undefined") module.exports = SORTER_CONFIG;
