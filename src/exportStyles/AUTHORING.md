# Lighthouse Export Style Authoring Guide

Lighthouse uses standard CSS files for export styles. This guide explains how to create your own styles and where to place them.

---

## Where to put your styles

Create a folder called `.lighthouse/export-styles/` inside your vault. Place any `.css` files there and Lighthouse will discover them automatically when you open the Export dialog.

```
YourVault/
└── .lighthouse/
    └── export-styles/
        ├── my-novel-style.css
        └── my-novel-style.png   ← optional thumbnail (220×160 px)
```

> **Note:** The `.lighthouse` folder is hidden on most operating systems. Use your file manager's "show hidden files" option, or create the folder from the command line.

---

## CSS template

Every export style is a single `.css` file. Wrap all your rules in an `@media print {}` block — Lighthouse strips this wrapper for the on-screen style preview and keeps it for actual PDF output.

```css
/* my-novel-style.css */

@media print {

  /* ── Page setup ────────────────────────────────── */
  @page {
    size: 5.5in 8.5in;          /* width × height — use 'A4', 'Letter', etc. */
    margin: 0.9in 0.75in;       /* top/bottom  left/right */
  }

  /* ── Base typography ─────────────────────────── */
  .markdown-preview-view {
    font-family: 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #000;
    background: #fff;
  }

  /* ── Paragraphs ──────────────────────────────── */
  .markdown-preview-view p {
    margin: 0;
    text-indent: 1.5em;         /* first-line indent — drop for academic styles */
  }

  /* No indent after a heading or section break */
  .markdown-preview-view h1 + p,
  .markdown-preview-view h2 + p,
  .markdown-preview-view hr + p {
    text-indent: 0;
  }

  /* ── Headings ────────────────────────────────── */
  .markdown-preview-view h1 {
    font-size: 14pt;
    font-weight: normal;
    font-style: italic;
    text-align: center;
    margin: 0 0 2em;

    /* Page break before each chapter heading */
    page-break-before: always;
    padding-top: 2in;
  }

  /* Don't break the first chapter */
  .markdown-preview-view h1:first-of-type {
    page-break-before: avoid;
  }

  .markdown-preview-view h2 {
    font-size: 12pt;
    text-align: center;
    margin: 1.5em 0 0.5em;
  }

  /* ── Scene breaks (---) ──────────────────────── */
  .markdown-preview-view hr {
    border: none;
    text-align: center;
    margin: 1.5em auto;
  }

  /* Replace the horizontal rule with a typographic ornament */
  .markdown-preview-view hr::after {
    content: '* * *';
    font-size: 10pt;
    letter-spacing: 0.5em;
  }

  /* ── Block quotes ────────────────────────────── */
  .markdown-preview-view blockquote {
    margin: 1em 1.5in;
    font-size: 10pt;
    font-style: italic;
  }

  /* ── Lists ───────────────────────────────────── */
  .markdown-preview-view ul,
  .markdown-preview-view ol {
    margin: 0.5em 0 0.5em 1.5em;
  }

  /* ── Code ────────────────────────────────────── */
  .markdown-preview-view code,
  .markdown-preview-view pre {
    font-family: 'Courier New', monospace;
    font-size: 9pt;
  }

  /* ── Tables ──────────────────────────────────── */
  .markdown-preview-view table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
    font-size: 10pt;
  }

  .markdown-preview-view th,
  .markdown-preview-view td {
    padding: 0.3em 0.5em;
    border-bottom: 0.5pt solid #000;
  }

  .markdown-preview-view th {
    font-weight: 700;
    border-top: 1pt solid #000;
  }

  /* ── Page numbers ────────────────────────────── */
  @page {
    @bottom-center {
      content: counter(page);
      font-family: inherit;
      font-size: 9pt;
    }
  }

  /* Suppress page number on first page */
  @page :first {
    @bottom-center { content: '' }
  }

}
```

---

## Key CSS selectors

| Selector | What it styles |
|---|---|
| `@page { size: … }` | Paper size and margins |
| `.markdown-preview-view` | Root element — font, size, line-height |
| `.markdown-preview-view p` | Body paragraphs |
| `.markdown-preview-view h1` | Chapter headings (level 1) |
| `.markdown-preview-view h2` | Scene or section headings (level 2) |
| `.markdown-preview-view hr` | Scene breaks (`---` in Markdown) |
| `.markdown-preview-view blockquote` | Block quotes |
| `.markdown-preview-view table` | Tables |

---

## Common patterns

### Page break before each chapter

Use `h1` for chapter titles — Lighthouse (and the `novel-trade` built-in style) automatically adds a page break **before** each `h1`:

```css
.markdown-preview-view h1 {
  page-break-before: always;
  padding-top: 2in;           /* push title down the page */
}
```

### Scene break ornament

Convert the horizontal rule `---` into a centered typographic ornament:

```css
.markdown-preview-view hr {
  border: none;
  text-align: center;
}
.markdown-preview-view hr::after {
  content: '✦';              /* or '* * *', '—  —  —', etc. */
}
```

### Block paragraphs (academic / report style)

Replace first-line indent with spacing between paragraphs:

```css
.markdown-preview-view p {
  text-indent: 0;
  margin: 0.5em 0;
}
```

### Double spacing (manuscript standard)

```css
.markdown-preview-view {
  line-height: 2;
}
```

---

## Adding a thumbnail

Place a PNG file with the same base name as your CSS file in the same directory:

```
my-novel-style.css
my-novel-style.png   ← 220 × 160 px recommended
```

Lighthouse will display the image as a thumbnail in the Export style gallery. If no PNG is found, the gallery card shows a placeholder initial instead.

---

## Page size reference

| Value | Description |
|---|---|
| `letter` | 8.5×11 in (US Letter) |
| `A4` | 210×297 mm |
| `5.5in 8.5in` | Trade paperback |
| `6in 9in` | Standard US hardcover |
| `4.25in 6.87in` | Mass market paperback |

---

## Tips

- **Test first:** Export a short document to PDF to check layout before finalising your style.
- **Font availability:** PDF output uses Electron's Chromium renderer, so web-safe system fonts (Georgia, Palatino, Times New Roman, Courier New) are most reliable. Google Fonts can be added via `@import url(…)` if you have internet access.
- **Dark mode:** Add `@media (prefers-color-scheme: dark) {}` rules if you also want a dark on-screen preview — the `@media print` rules are used only for PDF.
- **`!important` sparingly:** Obsidian's own styles have high specificity. If a rule isn't applying, increase selector specificity before reaching for `!important`.
