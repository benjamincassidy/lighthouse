# Lighthouse — Future Features

Features planned for after [FEATURES.md](FEATURES.md) is complete. These are longer-horizon ideas that will make Lighthouse the undisputed writing app for serious authors.

---

## 1. Snapshots (Scene-Level Version Control)

Writers are terrified of ruining a good scene during a rewrite. Scrivener has "Snapshots" but they are clunky and hard to access. Ulysses has nothing.

- [ ] Add a camera icon to the active file header in the Project Explorer. Clicking it saves the current state of that file as a timestamped snapshot.
- [ ] Store snapshots outside the vault content (e.g. a hidden plugin-managed folder) so they never appear in search or sync as regular notes.
- [ ] Add a "History" tab to the right sidebar. When a file is active, it lists all snapshots for that file with their timestamps.
- [ ] "Restore" button on any snapshot replaces the current file contents (with a confirmation prompt).
- [ ] "Compare" button shows a diff view between the snapshot and the current version.

---

## 2. Auto-Surfacing Story Bible (Context Pane)

Writers constantly have to break flow to look up character details — eye color, backstory, relationships. Obsidian already has all this information linked; Lighthouse should surface it automatically.

- [ ] Add a "Reference" tab to the right sidebar (shared with or adjacent to the Inspector from FEATURES.md).
- [ ] As the writer types, scan the current paragraph for `[[wiki links]]` and named aliases that resolve to files inside the active project's Source folders.
- [ ] Automatically display the contents of those linked character/location/reference sheets inline in the sidebar — no clicking required.
- [ ] Update in real time as the cursor moves between paragraphs.
- [ ] Allow the writer to pin a reference card so it stays visible even when the cursor moves away.

---

## 3. Dialogue Focus Mode

Editing dialogue is a different cognitive mode from editing prose. Writers need to isolate it to check rhythm, read it aloud, and catch unnatural speech patterns.

- [ ] Add a "Dialogue Focus" toggle to the Command Palette.
- [ ] When active, dim all text in the editor except content inside quotation marks (`"…"`). Everything outside quotes fades to a low opacity.
- [ ] Support both straight quotes (`"`) and curly/smart quotes (`"…"`).
- [ ] Configurable dimming opacity in settings.
- [ ] Coexist gracefully with the paragraph/sentence Focus Mode from the Zen Mode feature.

---

## 4. Corkboard View (Canvas Integration)

Scrivener's Corkboard — index cards representing scenes, draggable for restructuring — is one of its most beloved features. Obsidian has Canvas; Lighthouse should bridge the two automatically.

- [ ] Add a "Corkboard" button to folder rows in the Project Explorer.
- [ ] Clicking it auto-generates an Obsidian Canvas file for that folder, populated with one card per note. Each card displays the file's `synopsis:` frontmatter field as its body text.
- [ ] If no `synopsis:` field exists, show the first non-frontmatter line of the file.
- [ ] Cards are arranged in the current custom sort order.
- [ ] **Killer feature:** When the writer drags cards into a new order on the Canvas, Lighthouse detects the change and updates the project's custom sort order in the Project Explorer to match.

---

## 5. Writing Sprints (Pomodoro / NaNoWriMo Gamification)

Novelists live by writing sprints — timed bursts of focused drafting. Neither Scrivener nor Ulysses has native sprint tooling. This is a wide-open opportunity.

- [ ] Add a Sprint Timer control to the Writing Stats panel.
- [ ] Writer sets a duration (default: 20 minutes) and clicks Start.
- [ ] A countdown timer appears prominently (in the stats panel and optionally as a subtle overlay at the top of the editor).
- [ ] On start, record the current project word count as the sprint baseline.
- [ ] On completion, calculate words written during the sprint and show a celebratory `Notice`: "Sprint complete! You wrote 642 words."
- [ ] Log completed sprints (date, duration, words written) to a Sprint History section on the Dashboard.
- [ ] Display a Sprint History chart on the Dashboard showing output per sprint over time.

---

## 6. Rolling Daily Goals (Adaptive Velocity)

Current goal behavior: if the daily target is 1,000 words and the writer writes 1,500, tomorrow's target is still 1,000. For writers with deadlines, leftover words should reduce future targets — and missed days should redistribute the debt.

- [ ] When a writer exceeds their daily target, carry the surplus forward: tomorrow's required count is reduced proportionally to keep the deadline on track.
- [ ] When a writer misses a day, redistribute the missed words across the remaining days rather than showing an impossible catch-up number.
- [ ] Show tomorrow's adjusted target on the Dashboard alongside today's actual pace.
- [ ] Add a "Streak" calendar to the Dashboard (GitHub-style green squares) showing consecutive days the writer hit their adjusted target. Missing a day breaks the streak.
- [ ] Allow the writer to mark a day as a planned day off without breaking the streak or redistributing words.

*Note: Builds on the Deadline & Velocity feature in FEATURES.md (#15). Implement after that foundation is in place.*

---

## 7. Project-Scoped Find & Replace

A standard Obsidian vault-wide find and replace is dangerous across a large knowledge base — searching for a character's name might change unrelated notes. Writers changing a main character's name in chapter 40 need a safe, scoped operation.

- [ ] Add a "Project Replace" command to the Command Palette.
- [ ] The search operates only on files within the active project's Content folders — never the full vault.
- [ ] UI: find field, replace field, case-sensitive toggle, whole-word toggle, preview of all matches with file names and context.
- [ ] "Replace All" button applies the replacement across all matched files after a confirmation prompt.
- [ ] If Snapshots (feature #1 above) is implemented, offer to auto-snapshot all affected files before replacing.
- [ ] Show a summary after completion: "Replaced 47 instances across 12 files."
