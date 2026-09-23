<script lang="ts" setup>
    // The characters page: until the user's own characters (M1.5), the site's demo characters, each linking its sheet.

    const { t } = useI18n();
    const { list } = useCharacters();

    const { data: characters, status } = await useAsyncData("characters", () => list());
</script>

<template>
    <div id="characters-page" class="page container">
        <h1>{{ t("characters.heading") }}</h1>
        <p>{{ t("characters.intro") }}</p>
        <p v-if="status === 'pending'" role="status">
            {{ t("characters.loading") }}
        </p>
        <p v-else-if="status === 'error'" role="alert">
            {{ t("characters.failed") }}
        </p>
        <section v-else aria-labelledby="characters-demo-heading">
            <h2 id="characters-demo-heading">
                {{ t("characters.demos") }}
            </h2>
            <ul class="characters">
                <li v-for="character in characters" :key="character.id">
                    <NuxtLink :to="{ name: 'characters-id', params: { id: character.id } }" class="character">
                        <strong>{{ character.name }}</strong>
                        <span>{{ character.summary }}</span>
                    </NuxtLink>
                </li>
            </ul>
        </section>
    </div>
</template>

<style lang="scss" scoped>
    #characters-page
    {
        min-height: 100dvh;
        padding-bottom: 2em;
        padding-top: calc(var(--navigation-bar-height) + 1em);

        .characters
        {
            display: grid;
            gap: 0.75em;
            grid-template-columns: repeat(auto-fill, minmax(16em, 1fr));
            list-style: none;
            padding: 0px;
        }

        .character
        {
            background-color: var(--bs-body-bg);
            border: 1px solid var(--bs-border-color);
            border-radius: 0.5em;
            display: flex;
            flex-direction: column;
            min-height: 44px;
            padding: 1em;
            text-decoration: none;
        }
    }
</style>
