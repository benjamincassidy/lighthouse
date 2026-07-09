---
title: Lighthouse vs. Other Plugins
description: How Lighthouse compares to other long-form writing plugins for Obsidian
---

Obsidian has a genuinely good crop of long-form writing plugins now, and none of them are wrong — they're built for different writers. This page is an honest comparison, not a sales pitch, so you can figure out which one actually fits how you work.

## At a glance

| Plugin | Version | Last release | File format | Best for |
| --- | --- | --- | --- | --- |
| **Lighthouse** | 1.3.0 | Jul 2026 | Plain markdown | Novelists, academics, and technical writers who want a focused, Ulysses-style workspace without leaving Obsidian |
| [Longform](https://github.com/kevboh/longform) | 2.1.0 | Mar 2025 | Plain markdown | Writers who want the original, most established scene/project organizer |
| [Inkswell](https://github.com/leethobbit/obsidian-inkswell-plugin) | 1.6.0 | Jul 2026 | Plain markdown | Plotters and series writers who want a full planning pipeline — beat sheets, story bible, revision audits |
| [Books](https://github.com/jdsimcoe/obsidian-books) | 0.2.3 | Jun 2026 | Plain markdown | Writers who want a spine-style chapter organizer with manuscript styling and a research sidebar |
| [Folio](https://github.com/danigarvire/Folio) | 1.1.2 | Jul 2026 | Plain markdown | Screenwriters and long-form writers who need Final Draft (`.fdx`) export |
| [Colophon](https://github.com/davidgolding/obsidian-colophon) | 2.3.1 | Jul 2026 | Proprietary `.colophon` format | Writers who want a word-processor feel and don't mind leaving plain markdown behind |
| [Book Smith](https://github.com/yeban8090/book-smith) | 1.0.5 | Jul 2025 | Plain markdown | Writers who want Pomodoro focus sessions and mobile sync alongside organization |

*Versions and release dates reflect each plugin's GitHub release history as of mid-2026 — check the linked repo for the current state.*

## Where Lighthouse fits

If Longform is the established incumbent, Lighthouse is the alternative for people who found it to be more than they wanted to keep track of. That's not a knock on Longform — it's a capable, mature tool, and if its model of scenes, drafts, and compile steps clicks for how you think, it's worth using. But plenty of writers just want something closer to Ulysses: a clean two-pane workspace, a goal ring, a deadline, and nothing else competing for attention. That's the gap Lighthouse is built for.

A few things set it apart from the rest of the field specifically:

- **It's the only one of these built for academic and technical writers, not just fiction.** Lighthouse ships with real CSL citation support — a per-project bibliography, 10 bundled citation styles, and the ability to download thousands more — alongside the usual novel/screenplay use cases. If you're writing a thesis or coordinating technical docs, none of the other plugins here are aimed at you; Lighthouse is.
- **Export goes through Typst, not just Pandoc.** PDF output is properly typeset rather than a markdown-to-PDF print job, plus DOCX and EPUB via Pandoc with style presets and paper sizes.
- **The workspace fully takes over, then gives itself back.** One command replaces Obsidian's file explorer with the Library/Inspector pair for the duration of a writing session; exiting restores the native explorer automatically. It's meant to feel like a dedicated app while you're in it, and like plain Obsidian the moment you're not.
- **Files never leave markdown.** Unlike Colophon's `.colophon` format, everything Lighthouse touches stays a normal `.md` file in your vault — no proprietary format, no lock-in, nothing that breaks if you stop using the plugin.

Where Lighthouse doesn't try to compete: it has no story-bible or beat-sheet system like Inkswell, no screenplay export like Folio, and no built-in Pomodoro timer like Book Smith. If those are what you need, one of those tools will serve you better.
