# Course Draft Sorter

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
4. **Developer packs:** once the developers have chosen their elements, add the updated sheet. Pick a developer and download a Word document of their rows and content snippets.

The developers choose the elements they build in Resource Creation (Visual Instructional Designer, digital tools, VID and product type). The sorter never writes in those columns. Its "suggested elements" are ideas only, shown with visual examples and noted in the Snippets tab.

## Use it

Open the GitHub Pages link for this repository (Settings → Pages shows it), then:

1. **Add the course draft and the Resource Creation Sheet (T06).** Or click **Start from a blank T06**.
2. **Fill in the course set-up:**
   - **Course code:** `Programme_MainSource`, for example `LP3_Comp2`. Item codes come out as `LP3Text_Comp2.1.2`.
   - Course name, colour palette, writer, DCES.
   - **PDD QA 1 due date:** the first due date, used for every row.
3. **Check the snippets.** Untick anything that should not go into the sheet, then click **Confirm and fill the Resource Creation Sheet**.
4. **Download the sheet** and the snippets.
5. **Developer packs:** when the developers have made their choices, add that sheet in step 5. Choose the developer and download their pack.

**Starting the next course:**

- **Next course in this same sheet** (step 4): keeps the filled sheet, palette, writer and DCES, and clears the draft, course code, course name and due date. The new course's rows go below the last one.
- **Reset the sorter** (step 1) or **Reset everything** (step 4): empties the sorter. Click twice to confirm, so nothing is cleared by accident. Download the filled sheet first.

If the course code is already in the sheet, the sorter warns you. You can replace those rows, with their snippets and questions, or use a different code.

The draft must use the Course Draft template's heading styles:

- Heading 1 for each module, starting "Module".
- Heading 2 for each topic.
- Bold lines for activities ("Assignment:", "Reflective post:", "Knowledge check:").

## Change it on GitHub (no Claude, no installs)

Open a file on github.com, click the **pencil** icon, edit, then click **Commit changes**. GitHub Pages updates within a few minutes.

| To change… | Edit |
|---|---|
| Resource types, palettes, activity words, link rules, suggested elements, course page tabs | `config.js` |
| Which columns the sorter writes to in T06 | `config.js` → `sheet` |
| Wording on the page | `index.html` |
| Colours and layout | `styles.css` |
| The visual examples | `visuals.js` |
| The blank T06 offered by **Start from a blank T06** | upload a new `templates/T06_Resource_Creation_Sheet.xlsx` (Add file → Upload files, same name) |
| The example draft | upload a new `examples/sample-course-draft.docx` |

The other files (`parser.js`, `workbook.js`, `worddoc.js`, `app.js`) do the work and rarely need changes.

To test a change before others see it, make it in a Codespace (Code → Codespaces → Create codespace on main). The tool opens in a preview tab on port 8000. Refresh the preview after each edit, then commit and push.

## Publish with GitHub Pages (once)

1. Settings → Pages → Build and deployment → **Deploy from a branch**.
2. Choose branch **main** and folder **/ (root)** → Save.

GitHub Pages sites are public. That is fine here: the repository holds no CTLI content (the example draft is made up), and files added to the tool never leave the browser. **Do not commit real course drafts or filled sheets to this repository.**

## Google Drive

- **Drafts in Google Docs:** File → Download → Microsoft Word (.docx), then drop the file in.
- **Sheet in Google Sheets:** File → Download → Microsoft Excel (.xlsx). After filling it, upload the downloaded file back to Drive: File → Import → Replace spreadsheet, or upload and open with Google Sheets.
- With **Google Drive for desktop**, Drive folders appear on your computer, so you can choose and save files there directly.
- Opening and saving straight from Drive inside the tool needs a Google Cloud project with the Google Picker and Drive APIs. IT would need to create an OAuth client ID and API key for this site's address. This can be added later in `app.js` without changing anything else.
