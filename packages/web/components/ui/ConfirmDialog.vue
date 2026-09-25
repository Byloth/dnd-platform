<script lang="ts" setup>
    import AppButton from "@/components/ui/AppButton.vue";
    import FontAwesome from "@/components/ui/FontAwesome.vue";

    /**
     * A question that needs an answer before something is done (docs/13-ux-and-accessibility.md): a native
     * <dialog>, modal, focus kept inside, Esc and the backdrop cancel. The safe answer is the one focused first.
     */
    const props = withDefaults(defineProps<{
        open: boolean;
        title: string;
        confirm: string;
        cancel: string;
        danger?: boolean;
    }>(), { danger: false });
    const emit = defineEmits<{ confirm: [], cancel: [] }>();

    const dialog = ref<HTMLDialogElement>();
    const safe = ref<InstanceType<typeof AppButton>>();

    watch(() => props.open, async (isOpen) =>
    {
        await nextTick();
        if (isOpen && !dialog.value?.open)
        {
            dialog.value?.showModal();
            (safe.value?.$el as HTMLElement | undefined)?.focus();
        }
        else if (!isOpen && dialog.value?.open) { dialog.value.close(); }
    });

    // Esc, the backdrop and "cancel" all come through the dialog's own close.
    const onClose = (): void =>
    {
        if (props.open) { emit("cancel"); }
    };
</script>

<template>
    <dialog ref="dialog"
            class="confirm-dialog"
            aria-labelledby="confirm-dialog-title"
            @close="onClose"
            @click.self="dialog?.close()">
        <div class="confirm-dialog__panel">
            <h2 id="confirm-dialog-title" class="confirm-dialog__title">
                <FontAwesome v-if="danger"
                             class="confirm-dialog__icon"
                             icon="triangle-exclamation"
                             aria-hidden="true" />
                {{ title }}
            </h2>
            <div class="confirm-dialog__body">
                <slot></slot>
            </div>
            <div class="confirm-dialog__actions">
                <AppButton ref="safe"
                           theme="secondary"
                           outline
                           @click="dialog?.close()">
                    {{ cancel }}
                </AppButton>
                <AppButton :theme="danger ? 'danger' : 'primary'" @click="emit('confirm')">
                    {{ confirm }}
                </AppButton>
            </div>
        </div>
    </dialog>
</template>

<style lang="scss" scoped>
    .confirm-dialog
    {
        background: transparent;
        border: 0;
        color: var(--color-ink);
        max-width: min(32rem, calc(100% - 2 * var(--space-4)));
        padding: 0;
        width: 100%;

        &::backdrop
        {
            backdrop-filter: blur(2px);
            background-color: var(--backdrop);
        }

        &__panel
        {
            background-color: var(--color-surface-raised);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-3);
            padding: var(--space-5);
        }

        &__title
        {
            align-items: center;
            display: flex;
            font-size: var(--text-xl);
            gap: var(--space-2);
            margin: 0 0 var(--space-3);
        }

        &__icon
        {
            color: var(--color-damage);
        }

        &__body
        {
            color: var(--color-ink);

            :deep(p)
            {
                margin: 0 0 var(--space-2);
            }
        }

        &__actions
        {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-3);
            justify-content: flex-end;
            margin-top: var(--space-5);
        }
    }
</style>
