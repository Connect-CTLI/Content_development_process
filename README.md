# PDD Course Design Hub

A one-page tool for CTLI Programme Design & Development (PDD). It turns a course draft into resources in the Resource Creation Sheet (T06).

Everything runs in the browser. Drafts and sheets are never uploaded or stored.

## What it does

1. **Reads the course draft (.docx)** and sorts it into the six Moodle course page tabs, modules, topics and resources, with a snippet of content for each resource.
2. **Fills the Resource Creation Sheet (.xlsx)** that you add. It writes into the sheet itself, so the columns always line up:
   - **Resource Creation:** one row per resource, from the first empty row. It fills programme, type, main source, source element, resource, module, description, palette, PDD QA 1 due date, status, writer and notes. Column A builds the item code.
   - **Question Bank:** a row for every reflection and knowledge check.
   - **Snippets:** the content for every resource, matched by programme + main source + source element.
   - **Design Blueprint:** course name, programme, palette and DCES.
   - **Project Plan:** counts, milestones and progress fill themselves from the tracker.
3. **Downloads** the filled sheet, and all snippets as a Word document.
4. **Developer packs:** once the developers have chosen their elements, add the updated sheet. Pick a developer and download a Word document of their rows and content snippets, and their timesheet (T08) for the month.
5. **Timesheets and claims:** add the completed timesheets. The Hub works out the claim lines for the PDD Support Claim (support category, start and end date, total minutes, task description) and logs the time against each element in the sheet's Time Log tab.
6. **Canva master templates per palette:** choosing a palette shows the banner, course tile, infographic, process, graph, video and element kit templates in that palette.

The developers choose the elements they build in Resource Creation (Visual Instructional Designer, digital tools, VID and product type). The Hub never writes in those columns. Its "suggested elements" are ideas only, shown with visual examples and noted in the Snippets tab.

## Use it

Open the GitHub Pages link for this repository (Settings → Pages shows it). The blank Resource Creation Sheet (T06) is already loaded.

1. **Programme team:** choose the unit and its Programme Co-ordinator, and the DCES.
   - To add or change people, open **Edit team lists and co-ordinators**. You can edit:
     - units and their Programme Co-ordinators
     - writers
     - content developers / Visual Instructional Designers
     - PDD QA agents
     - Delivery Unit QA agents

     Changes are saved in your browser and written into the Data tab of every sheet the Hub fills or downloads.
2. **Add the original course draft.** The Hub runs a learning design review against Universal Design for Learning (engagement, representation, action and expression), accessibility and the CTLI Moodle course flow.
3. **Learning design review:** each suggestion is shown beside the original text. **Download the reviewed draft (Word):** added sections are tracked changes highlighted in yellow and advice is in comments in the margin. Accept or reject each one in Word.
4. **Add the approved draft** (or use the draft with every suggestion accepted, or the original as it is). To fill an existing T06 instead of the blank one, drop it in the sheet box.
5. **Course set-up:**
   - **Course code:** `Programme_MainSource`, for example `LP3_Comp2`. Item codes come out as `LP3Text_Comp2.1.2`.
   - Course name, palette and writer.
   - **PDD QA 1 due date:** the first due date for every row.
6. **Check the snippets**, then click **Confirm and fill the Resource Creation Sheet**.
7. **Download** the filled sheet and the snippets. Share the sheet with the developers. They choose their elements in Resource Creation and check the **Duration to develop (hh:mm)** for each (it starts at a typical duration for the item type).
8. **Developer packs:** add the sheet with their choices and pick a developer. You get three downloads:
   - **Their content pack (Word):** a personal summary (elements, duration to develop, first and last due dates, tools, palette, Programme Co-ordinator and DCES), their elements by due date, a checklist and the content for each element.
   - **Their sheet:** a copy of T06 with only their rows showing.
   - **Their timesheet (T08):** choose the month first. It has their name, their item codes in the dropdown and a My elements tab with the time planned for each element.
9. **Timesheets and claims:** drop in one or more completed timesheets (T08, or the older content developer timesheet: the Hub finds the columns by their headings). It uses the sheet from step 8 or 7, or drop a different one.
   - Set the claim period, then check the warnings for each developer (rows without a category or date, missing times, overlapping sessions, item codes that are not in the sheet).
   - **Copy the claim lines** and paste them into the PDD Support Claim (Claim Form, from row 24), or click a cell to copy one value.
   - **Download the Resource Creation Sheet with the time logged:** the Time Log tab, the Time logged (hh:mm) column (AV) and planned vs logged time on the Project Plan. Adding the same developer's month again replaces their earlier rows.
   - **Download the claim summary (Word)** to keep with the claim.

   Rates, ID and PERSAL numbers stay in the claim sheet. Never put them in a timesheet or in this repository.

**Starting the next course:** use **Next course in this same sheet** (step 5), or **Reset** to empty the Hub. Reset needs a second click to confirm, so download the filled sheet first.

If the course code is already in the sheet, the Hub warns you. You can replace those rows, with their snippets and questions, or use a different code.

The Hub finds each Resource Creation column by its heading in row 2, so it works with older sheets and keeps working if columns move.

The draft must use the Course Draft template's heading styles:

- Heading 1 for each module, starting "Module".
- Heading 2 for each topic.
- Bold lines for activities ("Assignment:", "Reflective post:", "Knowledge check:").

## Change it on GitHub (no Claude, no installs)

Open a file on github.com, click the **pencil** icon, edit, then click **Commit changes**. GitHub Pages updates within a few minutes.

| To change… | Edit |
|---|---|
| Starting team lists: units, Programme Co-ordinators, writers, developers, QA agents | `config.js` → `teams` (or use **Copy the lists for GitHub** in the dashboard and paste over it) |
| Resource types, palettes, activity words, link rules, suggested elements, course page tabs | `config.js` |
| Which columns the Hub writes to in T06 | `config.js` → `sheet` |
| Learning design review: the wording of every suggestion and the limits (words per topic, paragraph and sentence) | `config.js` → `review` |
| Learning design review: the checks themselves | `udl.js` |
| Support categories for timesheets and claims, and the timesheet cells the Hub fills | `config.js` → `timesheet` |
| How completed timesheets are read and claim lines worked out | `timesheet.js` |
| The blank timesheet | upload a new `templates/T08_Developer_Timesheet.xlsx` |
| The Canva template pictures for each palette | upload JPGs to `assets/templates/`, named like `Banner_P7.jpg` (the kinds are listed in `config.js` → `templateKinds`) |
| Wording on the page | `index.html` |
| Colours and layout | `styles.css` |
| The visual examples | `visuals.js` |
| The blank T06 offered by **Start from a blank T06** | upload a new `templates/T06_Resource_Creation_Sheet.xlsx` (Add file → Upload files, same name) |
| The example draft | upload a new `examples/sample-course-draft.docx` |

The other files (`parser.js`, `workbook.js`, `worddoc.js`, `timesheet.js`, `app.js`) do the work and rarely need changes.

To test a change before others see it, make it in a Codespace (Code → Codespaces → Create codespace on main). The tool opens in a preview tab on port 8000. Refresh the preview after each edit, then commit and push.

## Publish with GitHub Pages (once)

1. Settings → Pages → Build and deployment → **Deploy from a branch**.
2. Choose branch **main** and folder **/ (root)** → Save.

GitHub Pages sites are public. That is fine here: the repository holds no CTLI content (the example draft is made up), and files added to the tool never leave the browser. **Do not commit real course drafts or filled sheets to this repository.**

## Team lists in Google Sheets (Apps Script)

If the team keeps T06 in Google Sheets, add `apps-script/T06_Team_Lists.gs` to the sheet once:

1. Open the sheet → **Extensions → Apps Script**.
2. Delete what is there, paste the whole file, and click **Save**.
3. Reload the sheet.

A **PDD tools** menu appears with two options:

- **Team lists and co-ordinators:** a side panel to add, rename or remove people and units. It updates every dropdown.
- **Fresh copy for a new course:** copies the sheet with the course rows cleared and every team list kept.

The first time you use it, Google asks you to allow it.

## Google Drive

- **Drafts in Google Docs:** File → Download → Microsoft Word (.docx), then drop the file in.
- **Sheet in Google Sheets:** File → Download → Microsoft Excel (.xlsx). After filling it, upload the downloaded file back to Drive: File → Import → Replace spreadsheet, or upload and open with Google Sheets.
- With **Google Drive for desktop**, Drive folders appear on your computer, so you can choose and save files there directly.
- Opening and saving straight from Drive inside the tool needs a Google Cloud project with the Google Picker and Drive APIs. IT would need to create an OAuth client ID and API key for this site's address. This can be added later in `app.js` without changing anything else.
