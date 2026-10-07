<script lang="ts" setup>
    /** The flag of the United Kingdom, for English (docs/phase-1/09-interface-revisions.md): drawn, never an emoji. */
    const id = useId();
</script>

<template>
    <svg class="flag"
         viewBox="7.5 0 45 30"
         aria-hidden="true"
         focusable="false"
         xmlns="http://www.w3.org/2000/svg">
        <clipPath :id="`${id}-diagonals`">
            <path d="M30 15h30v15zv15h-30zh-30v-15zv-15h30z" />
        </clipPath>
        <rect width="60"
              height="30"
              fill="#012169" />
        <path d="M0 0l60 30m0-30L0 30"
              stroke="#FFFFFF"
              stroke-width="6" />
        <path d="M0 0l60 30m0-30L0 30"
              :clip-path="`url(#${id}-diagonals)`"
              stroke="#C8102E"
              stroke-width="4" />
        <path d="M30 0v30M0 15h60"
              stroke="#FFFFFF"
              stroke-width="10" />
        <path d="M30 0v30M0 15h60"
              stroke="#C8102E"
              stroke-width="6" />
    </svg>
</template>
