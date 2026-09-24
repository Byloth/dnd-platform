/**
 * Accessibility helpers of the component tests (docs/phase-1/07-testing-accessibility-performance.md): axe-core
 * over a rendered screen, keyboard operability of its controls, and its accessible tree reduced to the roles and
 * names of landmarks, headings and controls.
 *
 * happy-dom has no layout, so the axe rules that need one cannot run here: colour contrast is tested on the
 * theme tokens (contrast.test.ts), and "label in name" (WCAG 2.5.3, experimental in axe) by
 * `expectKeyboardOperable` on the text of each named control; Lighthouse runs both in a real browser. The
 * page-level rules (one main landmark, a level-one heading, the document title and language) belong to the whole
 * document, not to a component: Lighthouse checks them on the generated site, the tests the document's language.
 */

import axe from "axe-core";
import { expect } from "vitest";

const DISABLED_RULES = [
    "color-contrast",
    "region",
    "landmark-one-main",
    "page-has-heading-one",
    "bypass",
    "document-title",
    "html-has-lang"
];

/** Whatever the test mounted: a Vue wrapper or its element. */
type Rendered = { readonly element: Element } | Element;

function _element(rendered: Rendered): Element
{
    return rendered instanceof Element ? rendered : rendered.element;
}

/** No violation of the WCAG 2.1 A and AA rules axe can check without layout. */
export async function expectNoAxeViolations(rendered: Rendered): Promise<void>
{
    const element = _element(rendered);
    expect(element.isConnected, "mount with attachTo: document.body").toBe(true);

    const results = await axe.run(element, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
        rules: Object.fromEntries(DISABLED_RULES.map((rule) => [rule, { enabled: false }])),
        resultTypes: ["violations"]
    });
    const violations = results.violations.map((v) =>
        `${v.id}: ${v.help}\n${v.nodes.map((n) => `    ${n.html}`).join("\n")}`);

    expect(violations).toEqual([]);
}

const NATIVE_CONTROLS = "a[href], button, input, select, textarea, summary";
const INTERACTIVE_ROLES = ["button", "link", "tab", "checkbox", "radio", "switch", "menuitem", "option", "slider"];

/**
 * Every control is in the tab order the document gives it (no positive tabindex), and a control built from a
 * non-native element with an interactive role can take focus: tabindex 0, or -1 inside a group that keeps one
 * member at 0 (roving focus, as in a tab list). A control named by aria-label holds its shown text in the name.
 */
export function expectKeyboardOperable(rendered: Rendered): void
{
    const element = _element(rendered);
    const problems: string[] = [];

    for (const node of element.querySelectorAll("[tabindex]"))
    {
        if (Number(node.getAttribute("tabindex")) > 0) { problems.push(`positive tabindex: ${node.outerHTML}`); }
    }

    const selector = INTERACTIVE_ROLES.map((role) => `[role="${role}"]`).join(", ");
    for (const node of element.querySelectorAll(selector))
    {
        if (node.matches(NATIVE_CONTROLS)) { continue; }

        const tabindex = node.getAttribute("tabindex");
        const roving = tabindex === "-1" &&
            [...(node.parentElement?.children ?? [])].some((sibling) => sibling.getAttribute("tabindex") === "0");
        if (tabindex !== "0" && !roving) { problems.push(`not focusable: ${node.outerHTML}`); }
    }

    // Label in name: a control named by aria-label says what it shows, as it shows it (speech input users say it).
    for (const node of element.querySelectorAll(`${NATIVE_CONTROLS}, ${selector}`))
    {
        const name = node.getAttribute("aria-label");
        const shown = _text(node);
        if (name !== null && shown && !_text(name).toLowerCase()
            .includes(shown.toLowerCase()))
        {
            problems.push(`name "${name}" does not hold the text shown, "${shown}": ${node.outerHTML}`);
        }
    }

    expect(problems).toEqual([]);
}

/** Text as shown: whitespace collapsed; for an element, all its text (happy-dom cannot tell what is visible). */
function _text(source: Element | string): string
{
    return (typeof source === "string" ? source : source.textContent ?? "").replace(/\s+/g, " ").trim();
}

export interface AccessibleNode { readonly role: string, readonly name: string }

const TREE_ROLES: Readonly<Record<string, string>> = {
    "a[href]": "link",
    "button": "button",
    "h1": "heading",
    "h2": "heading",
    "h3": "heading",
    "h4": "heading",
    "header": "banner",
    "footer": "contentinfo",
    "main": "main",
    "nav": "navigation",
    "section[aria-labelledby], section[aria-label]": "region",
    "input, select, textarea": "control"
};

/** Text for the ear: aria-hidden parts left out, whitespace collapsed. */
function _spoken(node: Node): string
{
    if (node.nodeType === node.TEXT_NODE) { return node.textContent ?? ""; }
    if (node instanceof Element && node.getAttribute("aria-hidden") === "true") { return ""; }

    return [...node.childNodes].map(_spoken).join("");
}

/** The accessible name: aria-label, then aria-labelledby, then the content as it is read. */
export function accessibleName(node: Element): string
{
    const label = node.getAttribute("aria-label");
    if (label) { return label; }

    const labelledBy = node.getAttribute("aria-labelledby");
    const text = labelledBy ?
        labelledBy.split(/\s+/).map((id) => node.ownerDocument.getElementById(id))
            .map((target) => (target ? _spoken(target) : ""))
            .join(" ") :
        _spoken(node);

    return text.replace(/\s+/g, " ").trim();
}

/** The element with an accessible name, among those the selector matches; undefined when none has it. */
export function byName(rendered: Rendered, name: string, selector = "button"): HTMLElement | undefined
{
    return [..._element(rendered).querySelectorAll<HTMLElement>(selector)].find((n) => accessibleName(n) === name);
}

/** The landmarks, headings and controls of a screen, in document order, as roles and accessible names. */
export function accessibleTree(rendered: Rendered): AccessibleNode[]
{
    const element = _element(rendered);
    const selector = Object.keys(TREE_ROLES).join(", ");

    return [...element.querySelectorAll(selector)].map((node) =>
    {
        const [, role] = Object.entries(TREE_ROLES).find(([s]) => node.matches(s))!;

        return { role: node.getAttribute("role") ?? role, name: accessibleName(node) };
    });
}
