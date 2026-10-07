# Phase 1 — The newcomer usability test: protocol (2026-10-06, confirmed 2026-10-07)

**Status: confirmed by the owner on 2026-10-07, as drafted** (M1.8's confirmation point, [../08-workplan.md](../08-workplan.md)). Recruiting may start; the sessions and the report are M1.8c.

## Purpose

The last gate of Phase 1 ([../07-testing-accessibility-performance.md](../07-testing-accessibility-performance.md)), and a done criterion of the phase ([../../16-roadmap.md](../../16-roadmap.md)): a person who has never played builds a level 1 character in under fifteen minutes, without asking anyone what a word means, and can then say what the numbers on their sheet mean. The test measures the product, not the person: a failure is a finding, not a blocker. The report says where the minutes went and Phase 2 opens with the fixes.

## Participants

- **At least three**, five if they can be found: with five, most of the problems a small test can find show up.
- **Never played** D&D or any tabletop role-playing game. Having played video games with "classes" and "levels" is fine and is noted.
- **Adults** (18 or over) who agree to the conditions below. Friends and relatives are fine, as long as they have not seen the site before.
- **Their own phone**, with their usual browser. A spread of phones (Android and iPhone) and of languages (Italian and English) is welcome; the interface language is the one their browser picks.

## Before the session

- The site is the published one (GitHub Pages) at the version under test, noted in the report (`v0.3.x`, commit).
- The participant's browser has never opened the site, or its data has been cleared: no character, no package, the help level at its default ("newcomer").
- One facilitator, who reads the script, keeps time and takes notes. A second observer is optional.
- A stopwatch, the note sheet below, and nothing else on the table: no rulebook, no dice.

## The session (about 30 minutes)

1. **Welcome and consent** (2 min): the facilitator reads the opening of the script and asks for consent.
2. **The task** (up to 20 min): "create a character you would like to play". The clock starts when the participant first touches the site and stops when the character is saved (the sheet opens). At fifteen minutes the facilitator notes the step reached; at twenty they stop the task, kindly, wherever it is.
3. **The five numbers** (5 min): on the participant's own sheet, the facilitator points to five values, one at a time, and asks "what does this number mean?". The participant may use the site (open the explanation, read the help) but not the facilitator.
4. **Debrief** (3 min): three open questions, then thanks.

## Rules for the facilitator

- **Observe, do not help.** No hints, no explaining a word, no "try the button above". If the participant asks, the answer is "What would you do if I weren't here?". The participant's question itself is written down: it is the most useful data of the session.
- **Think aloud.** The participant is asked to say what they are thinking while they use the site; when they fall silent for a while, the facilitator only says "What are you thinking?".
- **Stop only** when the participant asks to stop, is clearly distressed, or reaches twenty minutes.
- **No judgement**, of the person or of the site: no "well done", no "that's a bug".

## The five numbers

Chosen so that each is on every level 1 sheet, whatever the class, and each tests a different kind of explanation:

| # | Value | A good answer contains |
|---|---|---|
| 1 | Hit points | how much harm the character can take before falling |
| 2 | Armor Class | how hard the character is to hit |
| 3 | One ability modifier (the highest) | what the ability is about and that the number is added to rolls |
| 4 | One skill (a proficient one) | what the skill is used for and that the number is added to a d20 |
| 5 | The first attack's bonus to hit, or the spell save DC for a caster without attacks | that it is added to the attack roll, or what the enemy must beat |

Each answer is scored **yes** (the meaning, in the participant's words), **partly** (the right area, missing the "added to a roll" or "what it protects from"), or **no**. Whether they opened the explanation to answer is noted too.

## What to note

Per participant, on one sheet:

- phone, browser, interface language, prior experience with games;
- **time**: total, and on each step of the wizard (the step names on screen);
- **questions asked aloud** and **words that stopped them** (verbatim);
- **errors**: a step left and come back to, a choice undone, a wrong button, a moment of being lost (what they were looking for);
- whether they used "ideas" (archetypes), "Roll for me", the explanations, the help;
- the five answers, scored;
- quotes from the think-aloud and from the debrief that explain the numbers above.

## Consent and privacy

- Participation is voluntary and can stop at any moment, without giving a reason.
- **No names** in any document of the repository: participants are P1, P2, P3…; the note sheets with names, if any, stay with the facilitator and are destroyed after the report.
- No recording of faces or voices. A screen recording is used only if the participant agrees explicitly, it stays on the facilitator's device, and it is deleted after the report.
- The character the participant made stays on their phone; they may delete it (Delete on the sheet) or keep it.

## The report

`docs/phase-1/usability/report.md`, written after the last session:

1. **Summary**: how many participants, how many finished within fifteen minutes, the median time, the share of correct answers to the five numbers; whether the gate passed.
2. **Per participant** (P1…): phone and language, time per step, the five scores, the main moments.
3. **Findings**, ordered by how many participants met them and how badly they were stopped: what happened, where (screen, step), the words used, a proposed fix.
4. **What went well**: what to keep.
5. **Phase 2 openers**: the fixes the findings call for, each with the finding it answers.

## The script (Italian, read by the facilitator)

> **Benvenuto/a.** Grazie di essere qui. Stiamo provando un sito che aiuta chi non ha mai giocato a Dungeons & Dragons a creare il proprio personaggio. Non stiamo mettendo alla prova te: stiamo mettendo alla prova il sito. Se qualcosa non è chiaro, è colpa del sito, ed è proprio quello che ci serve scoprire.
>
> Ti chiederò di usare il sito dal tuo telefono e di dire ad alta voce quello che pensi mentre lo usi: cosa stai cercando, cosa ti aspetti, cosa ti confonde. Io non potrò aiutarti né rispondere alle domande, ma prenderò nota di tutto quello che chiedi, perché è molto utile.
>
> Non registriamo il tuo nome, né la tua voce, né il tuo viso. Puoi fermarti quando vuoi, senza dare spiegazioni. Ti va di cominciare?
>
> **Il compito.** Apri questo indirizzo: [indirizzo]. Crea un personaggio che ti piacerebbe interpretare. Hai tutto il tempo che ti serve. Quando il personaggio è salvato, dimmelo.
>
> *(Se chiede aiuto:)* Cosa faresti se io non fossi qui?
> *(Se resta in silenzio a lungo:)* A cosa stai pensando?
> *(A venti minuti:)* Va benissimo così, fermiamoci qui: ci hai già mostrato moltissimo.
>
> **I cinque numeri.** Adesso guardiamo la scheda del tuo personaggio. Ti indicherò alcuni numeri: per ciascuno, dimmi con parole tue che cosa significa. Puoi usare il sito, se vuoi.
> *(Per ognuno dei cinque:)* Che cosa significa questo numero?
>
> **Per finire.** Tre domande veloci:
> 1. Che cosa ti è sembrato più facile?
> 2. In che momento ti sei sentito/a più perso/a?
> 3. Se dovessi spiegare il sito a un amico, che cosa gli diresti?
>
> Grazie davvero: ci hai aiutato tantissimo.

The English version, for participants whose interface is in English, says the same in the same order.

## Open points for the owner

The protocol was confirmed as drafted; these three are settled by the owner while recruiting, and the report says how.

- The number of participants (three is the minimum; five is better) and who recruits them.
- Whether a screen recording is wanted at all, with explicit consent, or notes only.
- Whether to run one session first as a pilot, to tune the script and the five numbers, before the others.
