# Phase 1 — The screen-reader pass (to run, M1.8b)

**Status: waiting for a person with the device.** Everything else of the accessibility pass is automated ([m1.8b-report.md](m1.8b-report.md)); this part needs someone to listen. One sitting of about an hour covers it, and it also covers the passes of M1.3 and M1.4 that were never run ([../07-testing-accessibility-performance.md](../07-testing-accessibility-performance.md), "The manual pass").

## Who and with what

- One person who is comfortable with at least one screen reader, or willing to learn the few gestures below. The owner is fine.
- At least **two** of the three, ideally all of them: **VoiceOver** on an iPhone (or a Mac with Safari), **TalkBack** on an Android phone with Chrome, **NVDA** on Windows with Chrome or Firefox.
- The published site, at the version noted in the results.

## The few commands needed

| Action | VoiceOver (iPhone) | TalkBack (Android) | NVDA (Windows) |
|---|---|---|---|
| Turn on | Settings › Accessibility › VoiceOver, or triple-click the side button if set | hold both volume keys 3 s | Ctrl+Alt+N |
| Next / previous item | swipe right / left | swipe right / left | ↓ / ↑ (browse mode) |
| Activate | double-tap | double-tap | Enter or Space |
| Landmarks list | rotor (two-finger twist) › Landmarks, swipe up/down | swipe up then right › Landmarks | Insert+F7 › Landmarks |
| Headings | rotor › Headings | reading controls › Headings | H / Shift+H |
| Read from here | two-finger swipe down | (menu) Read from next item | Insert+↓ |
| Stop speech | two-finger tap | tap with two fingers | Ctrl |

## The steps

For each step: what to do, what should be heard, then **ok**, **problem** (with what was heard instead) or **n/a**.

### A. Characters page (`/`)

1. Open the landmarks list. *Expected*: the navigation (named "Main"), the main content, the footer.
2. Read the page from the top. *Expected*: the title "Characters", the introduction, "Create a character" button, "Blank sheet (PDF)" button, then the demo characters, each as a link with its name and classes.
3. Language: open Settings in the bar, change the language to Italian and back. *Expected*: the settings open and close with an activation; the page reads in Italian with Italian pronunciation.

### B. A sheet (`/characters/fixture-cleric-l5`)

1. Landmarks. *Expected*: one region per section of the sheet, named by its title ("Abilities", "Skills", "Attacks"…).
2. Read from the top. *Expected*: the character's name first; values as "label, value" ("Armor Class, 18"); skills as "Perception, +7"; an attack as "Mace, To hit +3".
3. A resource. *Expected*: "2 of 2 Channel Divinity" (n of m), never "2 slash 2".
4. Activate a value (Armor Class). *Expected*: a dialog opens and says it is the explanation of Armor Class; the lines are read in words; the close button has a name. Close it: focus back on Armor Class.
5. Icons. *Expected*: no icon is read on its own; the export, PDF and delete buttons are read by their names.
6. Help level: change it to "Expert" in Settings. *Expected*: the explanations are shorter; nothing else changes order.

### C. Creating a character (`/characters/new`)

1. Step 0. *Expected*: "Step 1 of 10", the heading "Content", the step's text, the choices as radio buttons or checkboxes with their descriptions, "Next".
2. Next. *Expected*: the new step's heading is announced (focus on it).
3. The step indicator. *Expected*: each step's button says its name and whether it is done, current or to do.
4. Species: choose one. *Expected*: the choice is announced as selected; its traits are readable.
5. Abilities: the standard array. *Expected*: each score's control says the ability and the value; "Roll for me" says what it does.
6. Review: an unanswered choice. *Expected*: the issue is read with a link to its step.
7. Save with a name. *Expected*: the sheet opens and its name is read.

### D. Compendium (`/compendium`)

1. Search "fire". *Expected*: the search field has a name; the number of results is announced.
2. Open a spell. *Expected*: its name as the heading, then level and school, then each line ("Casting time, 1 action").
3. A creature (`/compendium/creatures`, any). *Expected*: the stat block reads as a list of labelled values, the abilities as "Strength, 16, +3".

### E. Packages (`/packages`)

1. The load area. *Expected*: the heading "Add a package", then "Choose files" read as a button or file input, with the hint about .zip and .json files.
2. A package card. *Expected*: name, version, origin, languages; the remove button names the package.
3. Working folder (Chrome/Edge on a computer only). *Expected*: "Choose a folder"; after connecting, "Connected to the folder …" and the list of changes.

### F. Files and dialogs

1. Export a stored character from the characters page. *Expected*: the dialog says its title ("Export …"), the checkbox has its label, focus starts on "Close"; Escape closes it and focus returns to the export button.
2. Delete a stored character. *Expected*: the dialog's title "Delete …?", focus on "Keep the character"; Escape closes it.
3. The update alert (a character made with an older SRD). *Expected*: its heading "The rules were updated", each change as a sentence, "Got it".

### G. Themes

Repeat B.2 in the dark theme and with "High contrast". *Expected*: nothing becomes unreadable (this is also checked automatically; here it is about what the person sees while listening).

## Results

| Step | VoiceOver | TalkBack | NVDA | Notes |
|---|---|---|---|---|
| A.1 | | | | |
| A.2 | | | | |
| A.3 | | | | |
| B.1 | | | | |
| B.2 | | | | |
| B.3 | | | | |
| B.4 | | | | |
| B.5 | | | | |
| B.6 | | | | |
| C.1 | | | | |
| C.2 | | | | |
| C.3 | | | | |
| C.4 | | | | |
| C.5 | | | | |
| C.6 | | | | |
| C.7 | | | | |
| D.1 | | | | |
| D.2 | | | | |
| D.3 | | | | |
| E.1 | | | | |
| E.2 | | | | |
| E.3 | | | | |
| F.1 | | | | |
| F.2 | | | | |
| F.3 | | | | |
| G | | | | |

Run by: · Date: · Site version: · Devices and browsers:

Each problem found becomes an issue with the step, the screen reader and what was heard; the fixes are listed in [m1.8b-report.md](m1.8b-report.md).
