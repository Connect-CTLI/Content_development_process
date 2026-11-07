/**
 * PDD tools for the Resource Creation Sheet (T06) in Google Sheets.
 *
 * Adds a "PDD tools" menu with:
 *   - Team lists and co-ordinators: add, rename, remove or reorder the people in the dropdowns
 *     (writers, content developers / Visual Instructional Designers, PDD QA agents, Delivery Unit QA,
 *     programmes, digital tools) and the units with their Programme Co-ordinators.
 *   - Fresh copy for a new course: makes a copy of this sheet with the course rows cleared,
 *     keeping all team lists, units and co-ordinators.
 *   - New project in Google Drive: makes a folder for the course in "PDD Projects" (next to the template
 *     folder) with Phase A to D folders, its own copies of T01 to T05 and of this sheet, a Timesheets
 *     folder, and every link in the Project Links tab. Use it from the master T06 in the template folder.
 *   - Timesheet for a developer: in a project's sheet, makes that developer's T08 timesheet for a month
 *     in the project's Timesheets folder, with their item codes and elements filled in.
 *
 * For Google Docs and Sheets copies (not Word and Excel), turn on the Drive API once:
 * Apps Script → Services (+) → Drive API → Add.
 *
 * Set up once: Extensions → Apps Script → delete what is there → paste this whole file → Save.
 * Reload the sheet; the PDD tools menu appears. The first time you use it, Google asks you to allow it.
 * Everyone who can edit the sheet can use the menu.
 */

// Where each list lives in the Data tab (column letter). Rows 2 to 60 hold the names.
var LISTS = [
  { key: "writers", label: "Writers / SMEs", col: "C" },
  { key: "developers", label: "Content developers / Visual Instructional Designers", col: "D" },
  { key: "pdd", label: "PDD QA agents", col: "F" },
  { key: "qa", label: "Delivery Unit QA agents", col: "G" },
  { key: "programmes", label: "Programmes", col: "H" },
  { key: "tools", label: "Digital tools", col: "E" }
];
var DATA = "Data";
var FIRST_ROW = 2, LAST_ROW = 60;
var UNIT_FIRST_COL = 17, UNIT_COLS = 10, UNIT_ROWS = 40;   // Q1:Z1 unit names, co-ordinators below
var BLUEPRINT = "Design Blueprint", UNIT_CELL = "D8", COORD_CELL = "D13";

function onOpen() {
  SpreadsheetApp.getUi().createMenu("PDD tools")
    .addItem("Team lists and co-ordinators", "showTeamLists")
    .addSeparator()
    .addItem("Fresh copy for a new course", "freshCopy")
    .addSeparator()
    .addItem("New project in Google Drive…", "showNewProject")
    .addItem("Timesheet for a developer…", "showTimesheet")
    .addToUi();
}

// Clear the Programme Co-ordinator when the unit changes to one they are not in.
function onEdit(e) {
  var sh = e.range.getSheet();
  if (sh.getName() !== BLUEPRINT || e.range.getA1Notation() !== UNIT_CELL) return;
  var coord = sh.getRange(COORD_CELL).getValue();
  if (coord && getUnits_().filter(function (u) { return u.name === e.value && u.people.indexOf(coord) >= 0; }).length === 0) {
    sh.getRange(COORD_CELL).clearContent();
    SpreadsheetApp.getActive().toast("Choose a Programme Co-ordinator for " + e.value + " in " + COORD_CELL + ".", "PDD tools");
  }
}

function showTeamLists() {
  var html = HtmlService.createHtmlOutput(SIDEBAR_HTML).setTitle("Team lists and co-ordinators");
  SpreadsheetApp.getUi().showSidebar(html);
}

// ---------- called from the sidebar ----------
function getAll() {
  var d = data_();
  var lists = LISTS.map(function (l) {
    var vals = d.getRange(l.col + FIRST_ROW + ":" + l.col + LAST_ROW).getValues().map(function (r) { return String(r[0]).trim(); }).filter(String);
    return { key: l.key, label: l.label, items: vals };
  });
  return { lists: lists, units: getUnits_() };
}
function saveList(key, items) {
  var l = LISTS.filter(function (x) { return x.key === key; })[0];
  if (!l) throw new Error("Unknown list");
  items = clean_(items);
  if (items.length > LAST_ROW - FIRST_ROW + 1) throw new Error("A list can hold up to " + (LAST_ROW - FIRST_ROW + 1) + " names.");
  var rng = data_().getRange(l.col + FIRST_ROW + ":" + l.col + LAST_ROW);
  var out = []; for (var i = 0; i <= LAST_ROW - FIRST_ROW; i++) out.push([items[i] || ""]);
  rng.setValues(out);
  return getAll();
}
function saveUnits(units) {
  units = (units || []).filter(function (u) { return u && String(u.name).trim(); }).slice(0, UNIT_COLS);
  var vals = [];
  for (var r = 0; r <= UNIT_ROWS; r++) {
    var row = [];
    for (var c = 0; c < UNIT_COLS; c++) {
      var u = units[c];
      if (r === 0) row.push(u ? String(u.name).trim() : "");
      else row.push(u ? (clean_(u.people)[r - 1] || "") : "");
    }
    vals.push(row);
  }
  data_().getRange(1, UNIT_FIRST_COL, UNIT_ROWS + 1, UNIT_COLS).setValues(vals);
  return getAll();
}

// ---------- fresh copy for a new course ----------
function freshCopy() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.prompt("Fresh copy for a new course", "Name for the new sheet (for example: T06 LP3 Digital Competency 2):", ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var name = res.getResponseText().trim() || "T06 Resource Creation Sheet (new course)";
  var src = SpreadsheetApp.getActive();
  var file = DriveApp.getFileById(src.getId());
  var copy = SpreadsheetApp.openById(file.makeCopy(name).getId());
  clearRows_(copy.getSheetByName("Resource Creation"), 3, 2);         // keep column A (item code) and the DONE formula
  clearRows_(copy.getSheetByName("Question Bank"), 2, 1);
  clearRows_(copy.getSheetByName("Snippets"), 5, 2);
  var bp = copy.getSheetByName(BLUEPRINT);
  if (bp) bp.getRange("D6:D13").clearContent();
  var pp = copy.getSheetByName("Project Plan");
  if (pp) pp.getDataRange().getFormulas().forEach(function (row, i) {
    row.forEach(function (f, j) { var cell = pp.getRange(i + 1, j + 1); if (!f && cell.getBackground().toLowerCase() === "#fff4cc") cell.clearContent(); });
  });
  var url = copy.getUrl();
  ui.showModalDialog(HtmlService.createHtmlOutput('<p style="font-family:Arial">The new sheet is ready, with every team list kept.</p><p><a href="' + url + '" target="_blank" style="font-family:Arial">Open ' + name + '</a></p>').setWidth(380).setHeight(140), "Fresh copy made");
}
// clears values (not formulas, formats or dropdowns) from row `first` down, starting at column `fromCol`
function clearRows_(sh, first, fromCol) {
  if (!sh || sh.getLastRow() < first) return;
  var rng = sh.getRange(first, fromCol, sh.getLastRow() - first + 1, sh.getLastColumn() - fromCol + 1);
  var f = rng.getFormulas();
  var v = rng.getValues().map(function (row, i) { return row.map(function (x, j) { return f[i][j] ? f[i][j] : ""; }); });
  rng.setValues(v);
}

// ---------- helpers ----------
function data_() { var d = SpreadsheetApp.getActive().getSheetByName(DATA); if (!d) throw new Error("There is no Data tab."); return d; }
function clean_(items) { var seen = {}; return (items || []).map(function (x) { return String(x).trim(); }).filter(function (x) { if (!x || seen[x.toLowerCase()]) return false; seen[x.toLowerCase()] = true; return true; }); }
function getUnits_() {
  var v = data_().getRange(1, UNIT_FIRST_COL, UNIT_ROWS + 1, UNIT_COLS).getValues(); var out = [];
  for (var c = 0; c < UNIT_COLS; c++) {
    var name = String(v[0][c]).trim(); if (!name) continue;
    var people = []; for (var r = 1; r <= UNIT_ROWS; r++) { var p = String(v[r][c]).trim(); if (p) people.push(p); }
    out.push({ name: name, people: people });
  }
  return out;
}

var SIDEBAR_HTML = '<!doctype html><html><head><base target="_top"><style>' +
  'body{font-family:Arial,sans-serif;font-size:13px;color:#14204a;margin:12px}' +
  'h2{font-size:14px;color:#001489;margin:16px 0 6px}select,input,textarea{font:inherit;width:100%;box-sizing:border-box;padding:6px;border:1px solid #a6bbc8;border-radius:6px}' +
  'textarea{height:150px}button{font:inherit;font-weight:bold;background:#001489;color:#fff;border:0;border-radius:6px;padding:8px 12px;margin-top:6px;cursor:pointer}' +
  'button.sec{background:#fff;color:#007dba;border:1px solid #007dba}.hint{color:#55607e;font-size:12px;margin:4px 0}.msg{color:#1e6b1e;font-weight:bold;min-height:1.2em;margin-top:6px}' +
  '.unit{border:1px solid #d7dee8;border-radius:8px;padding:8px;margin-bottom:8px}.row{display:flex;gap:6px}</style></head><body>' +
  '<h2>Team lists</h2><select id="list"></select><p class="hint">One name per line. Changes update the dropdowns in every tab.</p><textarea id="items"></textarea>' +
  '<button onclick="saveList()">Save list</button>' +
  '<h2>Units and Programme Co-ordinators</h2><p class="hint">Choose the unit in the Design Blueprint tab (D8); the Programme Co-ordinator dropdown (D13) then shows only that unit\'s co-ordinators.</p>' +
  '<div id="units"></div><div class="row"><button class="sec" onclick="addUnit()">Add a unit</button><button onclick="saveUnits()">Save units</button></div>' +
  '<p class="msg" id="msg"></p>' +
  '<script>var state=null;' +
  'function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c]})}' +
  'function show(s){state=s;var sel=document.getElementById("list");var cur=sel.value;sel.innerHTML=s.lists.map(function(l){return "<option value=\\""+l.key+"\\">"+esc(l.label)+"</option>"}).join("");if(cur)sel.value=cur;fill();' +
  'document.getElementById("units").innerHTML=s.units.map(function(u,i){return unitHtml(u,i)}).join("")}' +
  'function unitHtml(u,i){return "<div class=\\"unit\\"><input class=\\"un\\" value=\\""+esc(u.name)+"\\" placeholder=\\"Unit name\\"><textarea class=\\"up\\" style=\\"height:90px;margin-top:6px\\" placeholder=\\"One co-ordinator per line\\">"+esc(u.people.join("\\n"))+"</textarea><p class=\\"hint\\">Clear the unit name to remove the unit.</p></div>"}' +
  'function fill(){var k=document.getElementById("list").value;var l=state.lists.filter(function(x){return x.key===k})[0];document.getElementById("items").value=l?l.items.join("\\n"):""}' +
  'document.getElementById("list").addEventListener("change",fill);' +
  'function busy(t){document.getElementById("msg").textContent=t}' +
  'function fail(e){busy("");alert(e.message||e)}' +
  'function saveList(){busy("Saving…");var k=document.getElementById("list").value;var items=document.getElementById("items").value.split("\\n");google.script.run.withSuccessHandler(function(s){show(s);busy("Saved.")}).withFailureHandler(fail).saveList(k,items)}' +
  'function addUnit(){document.getElementById("units").insertAdjacentHTML("beforeend",unitHtml({name:"",people:[]},0))}' +
  'function saveUnits(){busy("Saving…");var names=document.querySelectorAll(".un"),ppl=document.querySelectorAll(".up");var u=[];for(var i=0;i<names.length;i++)u.push({name:names[i].value,people:ppl[i].value.split("\\n")});google.script.run.withSuccessHandler(function(s){show(s);busy("Saved.")}).withFailureHandler(fail).saveUnits(u)}' +
  'google.script.run.withSuccessHandler(show).withFailureHandler(fail).getAll();</script></body></html>';

// =====================================================================================
// Google Drive: a folder for every project, with its own copies of the templates
// =====================================================================================
// The master templates are the PDD_SOP_and_Templates folder in Drive (this sheet sits in its
// "Resource Creation Sheet" folder). New project folders go into a "PDD Projects" folder next to it.
// To keep Word and Excel templates as Google Docs and Sheets, turn on the Drive API once:
// Apps Script → Services (+) → Drive API → Add. Without it the copies stay as Word and Excel files.

var LINKS = "Project Links", LINKS_FIRST = 5, LINKS_LAST = 60;
var PROJECTS_FOLDER_NAME = "PDD Projects";
var TEMPLATE_RE = /^T0[1-5]_/;                 // Word templates copied into each project
var SKIP_FOLDER_RE = /^T07_Canva/;             // linked from the master folder, not copied
var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function showNewProject() {
  var units = getUnits_();
  var html = HtmlService.createHtmlOutput(NEW_PROJECT_HTML.replace("__UNITS__", JSON.stringify(units)).replace("__DCES__", JSON.stringify(listOf_("pdd"))))
    .setWidth(460).setHeight(560);
  SpreadsheetApp.getUi().showModalDialog(html, "New project in Google Drive");
}

// the master folder: the first folder above this sheet that has the Phase A folder in it
function masterFolder_() {
  var id = PropertiesService.getDocumentProperties().getProperty("MASTER_FOLDER_ID");
  if (id) return DriveApp.getFolderById(id);
  var f = DriveApp.getFileById(SpreadsheetApp.getActive().getId()).getParents();
  var folder = f.hasNext() ? f.next() : null;
  for (var up = 0; folder && up < 4; up++) {
    var kids = folder.getFolders();
    while (kids.hasNext()) { var k = kids.next(); if (/^Phase A/.test(k.getName()) && k.searchFiles("title contains 'T01_'").hasNext()) { var t = k.searchFiles("title contains 'T01_'"); while (t.hasNext()) if (/^T01_/.test(t.next().getName())) return folder; } }
    var p = folder.getParents(); folder = p.hasNext() ? p.next() : null;
  }
  throw new Error("New project works from the master T06 in the template pack folder in Drive (its Resource Creation Sheet folder). Open that sheet and try again.");
}
function projectsFolder_(master) {
  var id = PropertiesService.getDocumentProperties().getProperty("PROJECTS_FOLDER_ID");
  if (id) return DriveApp.getFolderById(id);
  var p = master.getParents(); var parent = p.hasNext() ? p.next() : DriveApp.getRootFolder();
  var it = parent.getFoldersByName(PROJECTS_FOLDER_NAME);
  return it.hasNext() ? it.next() : parent.createFolder(PROJECTS_FOLDER_NAME);
}

// called from the New project dialog
function createProject(form) {
  var code = String(form.code || "").trim(), name = String(form.name || "").trim();
  if (!code || !name) throw new Error("Add the course code and the course name.");
  var master = masterFolder_(), root = projectsFolder_(master);
  var title = code + " – " + name;
  if (root.getFoldersByName(title).hasNext()) throw new Error("There is already a project folder called " + title + " in " + root.getName() + ".");
  var proj = root.createFolder(title);
  var links = [["Project folder", "All", proj.getUrl(), root.getName()]];
  var notes = [];
  // the SOP and the Canva templates stay in the master folder and are linked
  var sop = master.getFilesByName("SOP_PDD_Design_Process.docx");
  if (!sop.hasNext()) sop = master.searchFiles("title contains 'SOP_PDD_Design_Process'");
  if (sop.hasNext()) links.push(["SOP: PDD design process", "All", sop.next().getUrl(), "Master copy"]);
  var phases = master.getFolders(), found = [];
  while (phases.hasNext()) found.push(phases.next());
  found.sort(function (a, b) { return a.getName() < b.getName() ? -1 : 1; });
  found.forEach(function (ph) {
    var n = ph.getName(); if (!/^Phase [A-D]/.test(n)) return;
    var letter = n.charAt(6);
    var mine = proj.createFolder(n);
    links.push(["Phase " + letter + " folder", "Phase " + letter, mine.getUrl(), ""]);
    var files = ph.getFiles();
    while (files.hasNext()) {
      var f = files.next();
      if (!TEMPLATE_RE.test(f.getName())) continue;
      var copy = copyTemplate_(f, mine, code, notes);
      fillDoc_(copy, form);
      links.push([labelFor_(f.getName()), "Phase " + letter, copy.getUrl(), ""]);
    }
    var subs = ph.getFolders();
    while (subs.hasNext()) { var s = subs.next(); if (SKIP_FOLDER_RE.test(s.getName())) links.push(["T07 Canva master templates", "Phase B", s.getUrl(), "Master copy: build from these only"]); }
  });
  // this sheet: a cleared copy, with the project details filled in
  var rcsFolder = proj.createFolder("Resource Creation Sheet");
  var ts = rcsFolder.createFolder("Timesheets");
  var sheetFile = DriveApp.getFileById(SpreadsheetApp.getActive().getId()).makeCopy(code + "_T06_Resource_Creation_Sheet", rcsFolder);
  var ss = SpreadsheetApp.openById(sheetFile.getId());
  clearCourse_(ss);
  var bp = ss.getSheetByName(BLUEPRINT);
  if (bp) { bp.getRange("D6").setValue(name); bp.getRange("D7").setValue(code.split("_")[0]); bp.getRange(UNIT_CELL).setValue(form.unit || ""); bp.getRange("D11").setValue(form.dces || ""); bp.getRange(COORD_CELL).setValue(form.coord || ""); if (form.palette) bp.getRange("D9").setValue(form.palette); }
  links.push(["T06 Resource Creation Sheet (this sheet)", "All", ss.getUrl(), ""]);
  links.push(["Timesheets folder (T08)", "Phase B", ts.getUrl(), "PDD tools → Timesheet for a developer saves timesheets here"]);
  var t08 = findInMaster_(master, /^T08_Developer_Timesheet/);
  if (t08) links.push(["T08 master timesheet", "Phase B", t08.getUrl(), "Master copy: used by Timesheet for a developer"]);
  writeLinks_(ss, links);
  return { url: proj.getUrl(), sheet: ss.getUrl(), title: title, notes: notes };
}

// copies a Word or Excel template, as a Google Doc or Sheet when the Drive API service is on
function copyTemplate_(file, folder, code, notes) {
  var base = file.getName().replace(/\.(docx|xlsx)$/i, "");
  var newName = code + "_" + base;
  var mime = file.getMimeType();
  var target = /wordprocessingml/.test(mime) ? MimeType.GOOGLE_DOCS : /spreadsheetml/.test(mime) ? MimeType.GOOGLE_SHEETS : null;
  if (target && typeof Drive !== "undefined") {
    try { // Drive API v3
      var r = Drive.Files.copy({ name: newName, parents: [folder.getId()], mimeType: target }, file.getId(), { supportsAllDrives: true });
      return DriveApp.getFileById(r.id);
    } catch (e) {
      try { // Drive API v2
        var r2 = Drive.Files.copy({ title: newName, parents: [{ id: folder.getId() }], mimeType: target }, file.getId(), { convert: true, supportsAllDrives: true });
        return DriveApp.getFileById(r2.id);
      } catch (e2) { notes.push("Could not convert " + base + ": " + e2.message); }
    }
  } else if (target && notes.indexOf("drive") < 0) {
    notes.push("drive");
  }
  return file.makeCopy(newName, folder);
}
// fills "Programme: ____" and "Course: ____" at the top of each Google Doc
function fillDoc_(file, form) {
  if (file.getMimeType() !== MimeType.GOOGLE_DOCS) return;
  try {
    var doc = DocumentApp.openById(file.getId()); var prog = String(form.code).split("_")[0];
    var parts = [doc.getBody()]; var h = doc.getHeader(); if (h) parts.push(h);
    parts.forEach(function (p) {
      p.replaceText("Programme: _{3,}", "Programme: " + prog);
      p.replaceText("Course: _{3,}", "Course: " + form.name);
      p.replaceText("\\[course name\\]", form.name);
    });
    doc.saveAndClose();
  } catch (e) {}
}
function labelFor_(fileName) {
  var m = /^(T0\d)_(.*?)(\.(docx|xlsx))?$/.exec(fileName); if (!m) return fileName;
  var words = { T01: "Programme Design & Content Pack", T02: "Resource Writing & Script", T03: "Course Build & Resource Pack", T04: "Course Test & Release", T05: "Evaluation, Review & Change Log" };
  return m[1] + " " + (words[m[1]] || m[2].replace(/_/g, " "));
}
function findInMaster_(master, re) {
  var stack = [master];
  while (stack.length) {
    var f = stack.pop(); var files = f.getFiles();
    while (files.hasNext()) { var x = files.next(); if (re.test(x.getName())) return x; }
    var subs = f.getFolders(); while (subs.hasNext()) { var s = subs.next(); if (!SKIP_FOLDER_RE.test(s.getName())) stack.push(s); }
  }
  return null;
}
function clearCourse_(ss) {
  clearRows_(ss.getSheetByName("Resource Creation"), 3, 2);
  clearRows_(ss.getSheetByName("Question Bank"), 2, 1);
  clearRows_(ss.getSheetByName("Snippets"), 5, 2);
  clearRows_(ss.getSheetByName("Time Log"), 5, 1);
  var bp = ss.getSheetByName(BLUEPRINT); if (bp) bp.getRange("D6:D13").clearContent();
}
// writes links into the Project Links tab: a row whose label matches is updated, others are added below
function writeLinks_(ss, links) {
  var sh = ss.getSheetByName(LINKS);
  if (!sh) { sh = ss.insertSheet(LINKS); sh.getRange("A4:D4").setValues([["What", "Phase / stage", "Link (Google Drive)", "Notes"]]).setFontWeight("bold").setBackground("#001489").setFontColor("#ffffff"); sh.getRange("A2").setValue("Project Links").setFontSize(16).setFontWeight("bold").setFontColor("#001489"); }
  var rng = sh.getRange(LINKS_FIRST, 1, LINKS_LAST - LINKS_FIRST + 1, 4); var vals = rng.getValues();
  links.forEach(function (l) {
    var i = -1;
    for (var k = 0; k < vals.length; k++) if (String(vals[k][0]).trim().toLowerCase() === l[0].toLowerCase()) { i = k; break; }
    if (i < 0) for (var k2 = 0; k2 < vals.length; k2++) if (!String(vals[k2][0]).trim()) { i = k2; break; }
    if (i < 0) return;
    vals[i][0] = l[0]; vals[i][1] = l[1]; vals[i][2] = l[2]; if (l[3]) vals[i][3] = l[3];
  });
  rng.setValues(vals);
}
function readLinks_(ss) {
  var sh = ss.getSheetByName(LINKS); var out = {}; if (!sh) return out;
  sh.getRange(LINKS_FIRST, 1, LINKS_LAST - LINKS_FIRST + 1, 3).getValues().forEach(function (r) { if (r[0] && r[2]) out[String(r[0]).trim()] = String(r[2]).trim(); });
  return out;
}
function listOf_(key) {
  var l = LISTS.filter(function (x) { return x.key === key; })[0]; if (!l) return [];
  try { return data_().getRange(l.col + FIRST_ROW + ":" + l.col + LAST_ROW).getValues().map(function (r) { return String(r[0]).trim(); }).filter(String); } catch (e) { return []; }
}

// ---------- a timesheet (T08) for one developer, saved in the project's Timesheets folder ----------
function showTimesheet() {
  var ss = SpreadsheetApp.getActive(); var rc = ss.getSheetByName("Resource Creation");
  if (!rc) throw new Error("Use this in a project's Resource Creation Sheet.");
  var names = {}; var v = rc.getRange(3, 1, Math.max(1, rc.getLastRow() - 2), 47).getValues();
  v.forEach(function (r) { [r[18], r[27]].forEach(function (x) { String(x || "").split(/\s*[;,\/&]\s*|\s+and\s+/).forEach(function (n) { n = n.trim(); if (n) names[n] = 1; }); }); });
  var list = Object.keys(names).sort();
  if (!list.length) { SpreadsheetApp.getUi().alert("No developer names in the Visual Instructional Designer columns yet. The developers choose their elements first."); return; }
  var now = new Date();
  var html = HtmlService.createHtmlOutput(TIMESHEET_HTML.replace("__DEVS__", JSON.stringify(list)).replace("__MONTH__", Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM"))).setWidth(380).setHeight(300);
  SpreadsheetApp.getUi().showModalDialog(html, "Timesheet for a developer");
}
function makeTimesheet(who, month) {
  var ss = SpreadsheetApp.getActive(); var links = readLinks_(ss);
  var folderUrl = links["Timesheets folder (T08)"]; var masterUrl = links["T08 master timesheet"];
  if (!folderUrl) throw new Error("This sheet has no Timesheets folder link in the Project Links tab. Make the project with PDD tools → New project, or paste the folder link there.");
  var folder = DriveApp.getFolderById(idFromUrl_(folderUrl));
  var t08 = masterUrl ? DriveApp.getFileById(idFromUrl_(masterUrl)) : findInMaster_(masterFolder_(), /^T08_Developer_Timesheet/);
  if (!t08) throw new Error("The T08 Developer Timesheet was not found in the template folder.");
  var y = +month.slice(0, 4), m = +month.slice(5, 7);
  var name = who + "_Content_Developer_Timesheet_" + MONTHS[m - 1].slice(0, 3) + " " + y;
  var notes = [];
  var copy = copyTemplate_(t08, folder, "", notes); copy.setName(name);
  if (copy.getMimeType() !== MimeType.GOOGLE_SHEETS) throw new Error("Turn on the Drive API service (Apps Script → Services → Drive API) so the timesheet can be made as a Google Sheet. The Excel copy is in the Timesheets folder.");
  var t = SpreadsheetApp.openById(copy.getId());
  var bp = ss.getSheetByName(BLUEPRINT); var course = bp ? bp.getRange("D6").getValue() : ""; var unit = bp ? bp.getRange(UNIT_CELL).getValue() : "";
  var sh = t.getSheetByName("Timesheet");
  sh.getRange("G2").setValue(who); sh.getRange("G3").setValue(MONTHS[m - 1]); sh.getRange("I3").setValue(y); sh.getRange("G4").setValue([unit, course].filter(String).join(" · "));
  var rc = ss.getSheetByName("Resource Creation"); var v = rc.getRange(3, 1, Math.max(1, rc.getLastRow() - 2), 47).getValues();
  var mine = v.filter(function (r) { return r[1] && [r[18], r[27]].some(function (x) { return String(x || "").split(/\s*[;,\/&]\s*|\s+and\s+/).map(function (n) { return n.trim(); }).indexOf(who) >= 0; }); });
  mine.sort(function (a, b) { return (a[10] || 9e15) - (b[10] || 9e15); });
  var lists = t.getSheetByName("Lists");
  if (lists && mine.length) {
    lists.getRange(2, 3, mine.length, 1).setValues(mine.map(function (r) { return [r[0]]; }));
    var plos = [course].concat(mine.map(function (r) { return r[1]; })).filter(function (x, i, a) { return x && a.indexOf(x) === i; });
    lists.getRange(2, 4, plos.length, 1).setValues(plos.map(function (p) { return [p]; }));
  }
  if (lists && links["PDD Support Claim"]) lists.getRange("G2").setValue(links["PDD Support Claim"]);
  var me = t.getSheetByName("My elements");
  if (me && mine.length) me.getRange(6, 1, Math.min(100, mine.length), 6).setValues(mine.slice(0, 100).map(function (r) {
    return [r[0], r[5], r[6], [r[19], r[28]].filter(String).join(", "), r[10] || "", r[8] === "" ? "" : r[8]];
  }));
  writeLinks_(ss, [["Timesheet: " + who + " (" + MONTHS[m - 1].slice(0, 3) + " " + y + ")", "Phase B", t.getUrl(), ""]]);
  return { url: t.getUrl(), name: name, count: mine.length };
}
function idFromUrl_(url) { var m = /[-\w]{25,}/.exec(url); if (!m) throw new Error("Not a Google Drive link: " + url); return m[0]; }

var DIALOG_CSS = '<style>body{font-family:Arial,sans-serif;font-size:13px;color:#14204a;margin:4px}label{display:block;font-weight:bold;margin:10px 0 4px}' +
  'input,select{font:inherit;width:100%;box-sizing:border-box;padding:7px;border:1px solid #a6bbc8;border-radius:6px}' +
  'button{font:inherit;font-weight:bold;background:#001489;color:#fff;border:0;border-radius:6px;padding:9px 14px;margin-top:14px;cursor:pointer}' +
  '.hint{color:#55607e;font-size:12px;margin:4px 0}.msg{margin-top:10px;font-weight:bold}.ok{color:#1e6b1e}.bad{color:#a1271b}a{color:#007dba}</style>';
var NEW_PROJECT_HTML = '<!doctype html><html><head><base target="_top">' + DIALOG_CSS + '</head><body>' +
  '<p class="hint">Makes a folder for the course in PDD Projects (next to the template folder), with the Phase A to D folders, its own copies of T01 to T05 and this Resource Creation Sheet, a Timesheets folder, and every link in the Project Links tab.</p>' +
  '<label>Course code</label><input id="code" placeholder="e.g. LP3_Comp2"><p class="hint">Programme_main source, as in the Hub</p>' +
  '<label>Course name</label><input id="name" placeholder="e.g. Digital Competency 2">' +
  '<label>Unit</label><select id="unit"></select><label>Programme Co-ordinator</label><select id="coord"></select>' +
  '<label>DCES (project lead)</label><input id="dces" list="dl"><datalist id="dl"></datalist>' +
  '<button id="go" onclick="go()">Create the project</button><div class="msg" id="msg"></div>' +
  '<script>var U=__UNITS__,D=__DCES__;var u=document.getElementById("unit"),c=document.getElementById("coord");' +
  'u.innerHTML="<option value=\\"\\">Choose a unit</option>"+U.map(function(x){return "<option>"+x.name+"</option>"}).join("");' +
  'document.getElementById("dl").innerHTML=D.map(function(x){return "<option value=\\""+x+"\\">"}).join("");' +
  'function co(){var x=U.filter(function(y){return y.name===u.value})[0];c.innerHTML="<option value=\\"\\">Choose</option>"+(x?x.people:[]).map(function(p){return "<option>"+p+"</option>"}).join("")}u.onchange=co;co();' +
  'function go(){var m=document.getElementById("msg");var f={code:document.getElementById("code").value,name:document.getElementById("name").value,unit:u.value,coord:c.value,dces:document.getElementById("dces").value};' +
  'document.getElementById("go").disabled=true;m.className="msg";m.textContent="Creating the folders and copying the templates. This takes about a minute…";' +
  'google.script.run.withSuccessHandler(function(r){var n=r.notes.indexOf("drive")>=0?"<p class=\\"hint\\">The templates were copied as Word files. To get Google Docs, turn on the Drive API service (Apps Script → Services → Drive API).</p>":"";' +
  'm.className="msg ok";m.innerHTML="Done: "+r.title+"<br><a href=\\""+r.url+"\\" target=\\"_blank\\">Open the project folder</a><br><a href=\\""+r.sheet+"\\" target=\\"_blank\\">Open its Resource Creation Sheet</a>"+n})' +
  '.withFailureHandler(function(e){document.getElementById("go").disabled=false;m.className="msg bad";m.textContent=e.message||e}).createProject(f)}</script></body></html>';
var TIMESHEET_HTML = '<!doctype html><html><head><base target="_top">' + DIALOG_CSS + '</head><body>' +
  '<label>Developer</label><select id="who"></select><label>Month</label><input id="month" type="month" value="__MONTH__">' +
  '<p class="hint">Saved in this project\'s Timesheets folder with the developer\'s item codes and elements filled in. Share it with the developer.</p>' +
  '<button id="go" onclick="go()">Make the timesheet</button><div class="msg" id="msg"></div>' +
  '<script>document.getElementById("who").innerHTML=__DEVS__.map(function(x){return "<option>"+x+"</option>"}).join("");' +
  'function go(){var m=document.getElementById("msg");document.getElementById("go").disabled=true;m.className="msg";m.textContent="Making the timesheet…";' +
  'google.script.run.withSuccessHandler(function(r){m.className="msg ok";m.innerHTML=r.name+" ("+r.count+" elements)<br><a href=\\""+r.url+"\\" target=\\"_blank\\">Open the timesheet</a>";document.getElementById("go").disabled=false})' +
  '.withFailureHandler(function(e){document.getElementById("go").disabled=false;m.className="msg bad";m.textContent=e.message||e}).makeTimesheet(document.getElementById("who").value,document.getElementById("month").value)}</script></body></html>';
