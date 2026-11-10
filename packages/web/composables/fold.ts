/**
 * A chosen option folding its list (docs/phase-1/14-wizard-steps-revision.md): once an option is chosen and the
 * step has something after it (the subspecies, the class's choices), the list shows the chosen card only, with
 * "Change", and the next group's heading takes the focus. Coming back to the step finds it folded; the expert's
 * dense page never folds.
 */
export function useFold(chosen: () => string | undefined, hasNext: () => boolean, expert: () => boolean)
{
    const opened = ref(false);
    const folded = computed(() => !expert() && !opened.value && (chosen() !== undefined) && hasNext());
    /** What comes next: a heading, or a group holding one (`tabindex="-1"`), focused when the list folds. */
    const next = ref<HTMLElement>();
    /** The "Change" button, focused again when the list folds back without a new choice. */
    const toggle = ref<{ $el?: HTMLElement }>();

    watch(chosen, async (now, before) =>
    {
        if ((now === undefined) || (now === before)) { return; }
        opened.value = false;
        await nextTick();
        if (!folded.value || !next.value) { return; }
        // The heading itself, or the first one inside the group that comes next.
        const heading = next.value.matches("[tabindex='-1']") ?
            next.value :
            next.value.querySelector<HTMLElement>("[tabindex='-1']");
        heading?.focus();
    });

    /** Opens the list again, to change the choice. */
    const open = (): void => { opened.value = true; };
    /** Folds the list again, keeping the choice. */
    const close = async (): Promise<void> =>
    {
        opened.value = false;
        await nextTick();
        toggle.value?.$el?.focus();
    };

    return { folded, opened, open, close, next, toggle };
}
