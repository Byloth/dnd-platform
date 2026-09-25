import { choiceKind, useChoiceOptions } from "@/composables/choice-options";

/**
 * "Changes that invalidate later choices list what will be reset before confirming" (docs/07-character-creation.md,
 * editing after creation): while a stored character is edited, replacing its species, subspecies, class or
 * background first names the answers it would forget, and waits for the player. Creating a character changes at
 * once, as before; so does a change that forgets nothing.
 */
export function useResetConfirmation()
{
    const wizard = useWizardStore();
    const { t, locale } = useI18n();

    const pending = shallowRef<{ readonly names: readonly string[], readonly run: () => void }>();
    /** Bumped when a change is kept back, so the radios show the choice that stands again. */
    const revision = ref(0);

    /** How step 6 would name the choice an answer belongs to ("Cleric, Skills"). */
    const nameOf = (key: string): string =>
    {
        if (!wizard.character || !wizard.packageSet) { return key; }
        const sheet = useEngine().sheet(wizard.character, wizard.sources, { language: locale.value }).sheet;
        const choice = sheet.choices.find((c) => c.key === key);
        if (!choice) { return key; }
        const { name, root } = useChoiceOptions(wizard.packageSet, sheet, locale.value, t).owner(choice);
        const title = name === root ? t(`wizard.choices.titles.${choiceKind(choice)}`) : name;

        return `${root}, ${title}`;
    };

    /** Runs a change now, or once confirmed when it would forget answers of these entities. */
    const change = (run: () => void, replaced: readonly (string | undefined)[]): void =>
    {
        const keys = wizard.editing ? wizard.answersOf(replaced) : [];
        if (!keys.length)
        {
            run();

            return;
        }
        pending.value = { names: keys.map(nameOf), run: run };
    };

    const confirm = (): void =>
    {
        pending.value?.run();
        pending.value = undefined;
    };
    const cancel = (): void =>
    {
        pending.value = undefined;
        revision.value += 1;
    };

    return { pending, revision, change, confirm, cancel };
}
