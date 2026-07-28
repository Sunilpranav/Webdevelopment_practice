# The Reading Room — a personal book notebook

A small, self-contained web app for keeping your own reading log: books you want to read,
books you're reading, and books you've finished — each with your notes, a rating, and
optionally a link to the actual book file on your computer.

## Files

```
index.html   — the page structure (content, layout)
style.css    — all visual styling (the library card-catalog look)
script.js    — all the behavior (adding/editing/deleting cards, saving, search, etc.)
README.md    — this file
```

All three files must stay in the **same folder** — `index.html` links to `style.css`
and `script.js` by filename, so if you move one without the others, the page will
load with no styling or no functionality.

## How to use it

1. Put all three files in one folder on your computer.
2. Double-click `index.html` (or right-click → Open with → your browser).
3. Click **"+ New card"** to add your first book.

That's it — no install, no server, no account needed.

## Adding a book

Fill in the form:
- **Title / Author** — filled in for you automatically if you attach a PDF or EPUB
  that has that information saved inside it (see below). You can always type or
  edit these yourself.
- **Shelf / Genre**, **Status**, **Pages**, **Date note**, **Rating**, **Your notes**
  — all optional except title/author (which default to "Untitled" / "Unknown author"
  if left blank, so saving never gets blocked).
- **Book file on your laptop (optional)** — attach the actual PDF/EPUB/etc. so you
  can reopen it later straight from its card.

Click a card (or "Read full note →") to open the full reading view for long notes,
and use the pencil/✕ icons on a card to edit or delete it.

## Saving and storage — please read this part

This app saves your books using your **browser's own local storage**, tied to this
specific file, in this specific browser, on this specific computer.

- ✅ Saves reliably when you open `index.html` directly in a normal browser tab
  (double-click it, or drag it into Chrome/Firefox/Edge).
- ⚠️ Will **not** save permanently if viewed only inside a locked-down preview panel
  (for example, a chat app's built-in file preview) — you'll see a warning banner at
  the top of the page if this is the case. Download the files and open them for real
  to fix this.
- There's a status banner under the header at all times telling you which mode you're
  in, so you never have to guess.

There is no cloud sync — your data lives only in this browser, on this device. If you
switch computers or browsers, your list won't follow automatically (see "Backing up
your data" below for a manual option).

## About attaching book files

For privacy and security reasons, browsers do not allow *any* website or local page
to remember the location of a file on your computer between visits. Because of this:

- The first time you open a book file each browsing session, you'll be asked to
  locate it again — the app remembers the *filename* so you know which file to pick,
  but not where it lives on disk.
- Once you've picked it that session, clicking "Open" again reopens it instantly —
  until you close the tab/browser, at which point you'll need to locate it once more
  next time.
- This app does not copy or store the file's contents — it's a quick launcher, not
  a backup. Keep your actual book files wherever you normally keep them.

**Automatic title/author detection** works for:
- **PDF** — reads the document's built-in metadata (if the PDF has it filled in).
- **EPUB** — reads the book's title/author from its internal catalog file.
- Other formats (`.txt`, `.doc`, `.mobi`, `.azw3`) don't carry this information in a
  way a browser can read, so the app falls back to using the filename instead.

## Backing up or moving your data

Since everything is stored locally in your browser, there's currently no built-in
export/import button. If you'd like one (to back up your shelf to a file, or move it
to a new computer), just ask — it's a small addition.

## Ideas for later

A few things that could be added if useful:
- Tags/keywords for cross-genre searching (e.g. "reread," "book club," "translated")
- Cover thumbnails pulled from EPUB files
- Export your whole shelf as one file you can back up or transfer
