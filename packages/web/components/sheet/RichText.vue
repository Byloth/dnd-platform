<script lang="ts" setup>
    import DOMPurify from "dompurify";
    import { Marked } from "marked";

    /**
     * Content text as Markdown (paragraphs, emphasis, lists, tables, headings). Packages arrive from users'
     * files, so two independent layers keep anything executable out: the Markdown renderer never passes raw
     * HTML through (it is shown as text) and keeps only http(s), mailto and relative links; DOMPurify then
     * sanitises the result. The one place in the application that renders HTML.
     */
    const props = defineProps<{ text: string }>();

    const escape = (text: string): string => text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const SAFE_LINK = /^(https?:|mailto:|[./#]|[^:]*$)/i;

    const markdown = new Marked({
        async: false,
        gfm: true,
        renderer: {
            html({ text })
            {
                return escape(text);
            },
            link({ href, tokens })
            {
                const label = this.parser.parseInline(tokens);

                return SAFE_LINK.test(href.trim()) ? `<a href="${escape(href)}" rel="noopener">${label}</a>` : label;
            },
            image({ text })
            {
                return escape(text);
            }
        }
    });

    const html = computed((): string =>
    {
        const rendered = markdown.parse(props.text) as string;
        const purify = typeof window === "undefined" ? undefined : DOMPurify(window);

        return purify?.isSupported ?
            purify.sanitize(rendered, { USE_PROFILES: { html: true }, FORBID_TAGS: ["style", "img", "form"] }) :
            rendered;
    });
</script>

<template>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="rich-text" v-html="html"></div>
</template>

<style lang="scss" scoped>
    .rich-text
    {
        line-height: var(--leading-text);

        :deep(p)
        {
            margin: 0 0 var(--space-2);
        }
        :deep(p:last-child)
        {
            margin-bottom: 0;
        }
        :deep(strong)
        {
            color: var(--color-ink);
        }
        :deep(h1), :deep(h2), :deep(h3), :deep(h4), :deep(h5), :deep(h6)
        {
            font-family: var(--font-text);
            font-size: var(--text-md);
            letter-spacing: 0;
            margin: var(--space-3) 0 var(--space-1);
        }
        :deep(ul), :deep(ol)
        {
            margin: 0 0 var(--space-2);
            padding-left: var(--space-5);
        }
        :deep(table)
        {
            border-collapse: collapse;
            display: block;
            font-size: var(--text-sm);
            margin: var(--space-2) 0;
            max-width: 100%;
            overflow-x: auto;
        }
        :deep(th), :deep(td)
        {
            border-bottom: 1px solid var(--color-border);
            padding: var(--space-1) var(--space-3);
            text-align: left;
            vertical-align: top;
        }
        :deep(th)
        {
            color: var(--color-ink-muted);
        }
    }
</style>
