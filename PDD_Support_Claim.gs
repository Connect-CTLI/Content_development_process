/**
 * PDD Support Claim: fill the claim lines from a developer's timesheet (T08).
 *
 * Adds a "PDD claim" menu to the PDD Support Claim workbook with:
 *   - Fill the Claim Form from a timesheet: paste the link to the developer's timesheet (a Google Sheet).
 *     It copies the lines with minutes from the timesheet's Claim lines tab into the Claim Form
 *     (from row 24): Support Category, Start Date, End Date, Total Minutes and Task description summary.
 *     The values are copied, not linked, so a submitted claim does not change if the timesheet changes.
 *   - Clear the claim lines.
 * Rates, totals and personal details are not touched: the claim sheet's own formulas work out the payment.
 *
 * Set up once (someone with edit access to the claim workbook):
 * Extensions → Apps Script → paste this whole file → Save → reload the workbook.
 * The first time you use the menu, Google asks you to allow it.
 * A timesheet in Excel (.xlsx): open it from Drive and use File → Save as Google Sheets first.
 */

var CLAIM = {
  sheet: "Claim Form",
  firstRow: 24, lastRow: 42,                       // the task lines on the Claim Form
  cols: { cat: "B", start: "I", end: "L", minutes: "N", task: "P" },
  dateFormat: "d/m/yyyy"
};
var TS = { tab: "Claim lines", firstRow: 6, lastRow: 60, nameTab: "Timesheet", nameCell: "G2", monthCell: "G3", yearCell: "I3" };

function onOpen() {
  SpreadsheetApp.getUi().createMenu("PDD claim")
    .addItem("Fill the Claim Form from a timesheet…", "fillFromTimesheet")
    .addItem("Clear the claim lines", "clearClaimLines")
    .addToUi();
}

function fillFromTimesheet() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.prompt("Fill the Claim Form from a timesheet",
    "Paste the link to the developer's timesheet (Google Sheets).\nThe Claim Form lines from row " + CLAIM.firstRow + " are replaced.", ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var url = res.getResponseText().trim();
  var m = /[-\w]{25,}/.exec(url);
  if (!m) { ui.alert("That is not a Google Sheets link."); return; }
  var ts;
  try { ts = SpreadsheetApp.openById(m[0]); }
  catch (e) { ui.alert("The timesheet could not be opened. Check that it is a Google Sheet (not .xlsx) and that you have access to it.\n\n" + e.message); return; }
  var cl = ts.getSheetByName(TS.tab);
  if (!cl) { ui.alert("This file has no '" + TS.tab + "' tab. Use the T08 Developer Timesheet."); return; }
  var vals = cl.getRange(TS.firstRow, 2, TS.lastRow - TS.firstRow + 1, 6).getValues();   // B:G = category, start, end, minutes, hours, task
  var lines = vals.filter(function (r) { return r[0] && Number(r[3]) > 0; })
    .map(function (r) { return { cat: r[0], start: r[1], end: r[2], minutes: Number(r[3]), task: r[5] || String(r[0]).replace(/^\d{3}_/, "") }; });
  if (!lines.length) { ui.alert("The timesheet has no claimable minutes yet (its Claim lines tab is empty)."); return; }
  var max = CLAIM.lastRow - CLAIM.firstRow + 1;
  if (lines.length > max) { ui.alert("The timesheet has " + lines.length + " claim lines but the Claim Form has room for " + max + "."); return; }
  var who = "", month = "";
  var tsh = ts.getSheetByName(TS.nameTab);
  if (tsh) { who = tsh.getRange(TS.nameCell).getDisplayValue(); month = [tsh.getRange(TS.monthCell).getDisplayValue(), tsh.getRange(TS.yearCell).getDisplayValue()].join(" ").trim(); }
  var form = SpreadsheetApp.getActive().getSheetByName(CLAIM.sheet);
  if (!form) { ui.alert("There is no '" + CLAIM.sheet + "' tab in this workbook."); return; }
  var total = lines.reduce(function (a, l) { return a + l.minutes; }, 0);
  var ok = ui.alert("Fill the Claim Form",
    (who ? who + (month ? ", " + month : "") + "\n" : "") + lines.length + " line" + (lines.length === 1 ? "" : "s") + ", " + total + " minutes (" + (total / 60).toFixed(2) + " hours).\n\n" +
    lines.map(function (l) { return "• " + l.cat + ": " + l.minutes + " min"; }).join("\n") +
    "\n\nCheck that the claimant chosen on the claim is " + (who || "the developer") + ". Replace the claim lines?", ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;
  var formulas = [];
  for (var r0 = CLAIM.firstRow; r0 < CLAIM.firstRow + lines.length; r0++)
    ["cat", "start", "end", "minutes", "task"].forEach(function (k) { if (form.getRange(CLAIM.cols[k] + r0).getFormula()) formulas.push(CLAIM.cols[k] + r0); });
  if (formulas.length) { ui.alert("These Claim Form cells have formulas, so nothing was changed: " + formulas.slice(0, 10).join(", ") + (formulas.length > 10 ? " …" : "") + ".\nAsk the claim sheet's owner whether the lines should be typed there, or change CLAIM.cols at the top of the script."); return; }
  clearLines_(form);
  lines.forEach(function (l, i) {
    var r = CLAIM.firstRow + i;
    form.getRange(CLAIM.cols.cat + r).setValue(l.cat);
    setDate_(form.getRange(CLAIM.cols.start + r), l.start);
    setDate_(form.getRange(CLAIM.cols.end + r), l.end);
    form.getRange(CLAIM.cols.minutes + r).setValue(l.minutes);
    form.getRange(CLAIM.cols.task + r).setValue(l.task);
  });
  SpreadsheetApp.getActive().toast(lines.length + " claim lines filled from " + ts.getName() + ".", "PDD claim", 6);
}

function clearClaimLines() {
  var ui = SpreadsheetApp.getUi();
  if (ui.alert("Clear the claim lines", "Clear Support Category, dates, minutes and task description in rows " + CLAIM.firstRow + " to " + CLAIM.lastRow + "?", ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  var form = SpreadsheetApp.getActive().getSheetByName(CLAIM.sheet); if (form) clearLines_(form);
}

// clears only the cells the timesheet fills, and only where they hold values (formulas are kept)
function clearLines_(form) {
  for (var r = CLAIM.firstRow; r <= CLAIM.lastRow; r++) {
    ["cat", "start", "end", "minutes", "task"].forEach(function (k) {
      var c = form.getRange(CLAIM.cols[k] + r);
      if (!c.getFormula()) c.clearContent();
    });
  }
}
function setDate_(cell, v) {
  if (v instanceof Date) { cell.setValue(v).setNumberFormat(CLAIM.dateFormat); }
  else if (v !== "" && v != null) cell.setValue(v);
}
