<script lang="ts" setup>
    const { t, locale, locales, setLocale } = useI18n();

    const onLanguage = (event: Event): void =>
    {
        void setLocale((event.target as HTMLSelectElement).value as typeof locale.value);
    };
</script>

<template>
    <nav class="navigation-bar" :aria-label="t('nav.sheet')">
        <div class="container row">
            <div class="col">
                <RouterLink :to="{ name: 'index' }" class="link bold">
                    {{ t("app.title") }}
                </RouterLink>
            </div>
            <div class="col right">
                <label class="link">
                    <span class="visually-hidden">{{ t("nav.language") }}</span>
                    <select :value="locale" @change="onLanguage">
                        <option v-for="l in locales"
                                :key="l.code"
                                :value="l.code">
                            {{ l.name }}
                        </option>
                    </select>
                </label>
            </div>
        </div>
    </nav>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/variables";

    .navigation-bar
    {
        background-color: rgba(#FFF, 0.5);
        box-shadow: 0px 0px 1em rgba(0, 0, 0, 0.25);
        backdrop-filter: blur(10px);
        position: fixed;
        top: 0px;
        width: 100%;
        z-index: 1;

        .col.right
        {
            text-align: right;
        }

        .link
        {
            display: inline-block;
            padding: 0.75em 1.5em;

            &.bold
            {
                font-weight: bold;
            }
        }

        & > .container.row
        {
            align-items: center;
            height: var(--navigation-bar-height);
            margin-left: auto;
            margin-right: auto;
        }
    }
</style>
