<script lang="ts" setup>
    import { AlertHandler as BaseHandler } from "@byloth/vuert";

    import AlertBox from "@/components/ui/AlertBox.vue";
    import AppButton from "@/components/ui/AppButton.vue";

    const getTheme = (type: string) =>
    {
        if (type === "error") { return "danger"; }
        if (type === "alternative") { return "link"; }

        return type;
    };
</script>

<template>
    <BaseHandler v-slot="{ alert, customComponent, isOpen, queue, resolve, reject }"
                 class="alerts-handler container">
        <Transition appear
                    name="alert"
                    mode="out-in">
            <AlertBox v-if="alert"
                      v-show="isOpen"
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
                <pre v-else>{{ alert.message }}</pre>
                <template v-if="alert.actions?.length">
                    <hr />
                    <div class="alert-actions">
                        <AppButton v-for="action in alert.actions"
                                   :key="action.id"
                                   :theme="getTheme(action.type)"
                                   small
                                   @click="resolve(action)">
                            {{ action.label }}
                        </AppButton>
                    </div>
                </template>
            </AlertBox>
        </Transition>
    </BaseHandler>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/variables";

    .alerts-handler
    {
        bottom: 0px;
        left: 0px;
        margin-top: var(--navigation-bar-height);
        padding-top: 1em;
        pointer-events: none;
        position: fixed;
        right: 0px;
        top: 0px;
        z-index: 5;

        & > .alert
        {
            pointer-events: auto;

            pre
            {
                font-family: inherit;
                margin: 0px;
                white-space: pre-wrap;
            }

            & > .alert-actions
            {
                display: flex;
                flex-direction: row-reverse;

                & > .btn
                {
                    margin-left: 0.5em;
                }
            }

            &.alert-enter-from,
            &.alert-leave-to
            {
                opacity: 0;
                transform: translateY(-2.5em);
            }
            &.alert-enter-active,
            &.alert-leave-active
            {
                transition: opacity variables.$transition-duration variables.$transition-timing-function,
                            transform variables.$transition-duration variables.$transition-timing-function;
            }
            &.alert-enter-to,
            &.alert-leave-from
            {
                opacity: 1;
                transform: translateY(0px);
            }
        }
    }
</style>
