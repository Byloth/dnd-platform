<script lang="ts" setup>
    import { AlertHandler as BaseHandler } from "@byloth/vuert";

    import AlertBox from "@/components/ui/AlertBox.vue";
    import AppButton from "@/components/ui/AppButton.vue";

    // The tone of a vuert alert type (`error` → danger) and of an action type (`alternative` → a link-looking button).
    const getTheme = (type: string) =>
    {
        if (type === "error") { return "danger"; }
        if (type === "alternative") { return "link"; }

        return type;
    };
</script>

<template>
    <BaseHandler v-slot="{ alert, customComponent, isOpen, queue, resolve, reject }" class="alert-handler">
        <Transition appear
                    name="alert-handler__alert"
                    mode="out-in">
            <AlertBox v-if="alert"
                      v-show="isOpen"
                      class="alert-handler__alert"
                      :theme="getTheme(alert.type)"
                      :title="alert.title"
                      :icon="alert.icon"
                      :dismissible="alert.dismissible"
                      @dismiss="resolve">
                <div v-if="customComponent">
                    <Component :is="customComponent"
                               :alert="alert"
                               :queue="queue"
                               :resolve="resolve"
                               :reject="reject" />
                </div>
                <p v-else class="alert-handler__message">
                    {{ alert.message }}
                </p>
                <div v-if="alert.actions?.length" class="alert-handler__actions">
                    <AppButton v-for="action in alert.actions"
                               :key="action.id"
                               :theme="getTheme(action.type)"
                               small
                               @click="resolve(action)">
                        {{ action.label }}
                    </AppButton>
                </div>
            </AlertBox>
        </Transition>
    </BaseHandler>
</template>

<style lang="scss" scoped>
    .alert-handler
    {
        inset: calc(var(--navigation-bar-height) + var(--space-4)) var(--space-4) auto;
        margin: 0 auto;
        max-width: 36rem;
        pointer-events: none;
        position: fixed;
        z-index: 20;

        &__alert
        {
            pointer-events: auto;
        }

        &__message
        {
            margin: 0;
            white-space: pre-wrap;
        }

        &__actions
        {
            display: flex;
            flex-direction: row-reverse;
            gap: var(--space-2);
            margin-top: var(--space-3);
        }
    }

    .alert-handler__alert-enter-from,
    .alert-handler__alert-leave-to
    {
        opacity: 0;
        transform: translateY(-1.5rem);
    }
    .alert-handler__alert-enter-active,
    .alert-handler__alert-leave-active
    {
        transition: opacity var(--duration) var(--easing), transform var(--duration) var(--easing);
    }
</style>
