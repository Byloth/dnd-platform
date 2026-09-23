/** Content text as Markdown, sanitised: formatting survives, anything executable does not. */

import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";

import RichText from "@/components/sheet/RichText.vue";

describe("RichText", () =>
{
    it("keeps safe links", async () =>
    {
        const wrapper = await mountSuspended(RichText, { props: { text: "See [the SRD](https://example.com/srd)." } });

        expect(wrapper.find("a").attributes("href")).toBe("https://example.com/srd");
    });

    it("renders emphasis, lists and tables", async () =>
    {
        const text = "**Bold** and _italic_.\n\n- one\n- two\n\n| Level | Die |\n|---|---|\n| 1 | d6 |";
        const wrapper = await mountSuspended(RichText, { props: { text: text } });

        expect(wrapper.find("strong").text()).toBe("Bold");
        expect(wrapper.find("em").text()).toBe("italic");
        expect(wrapper.findAll("li").length).toBe(2);
        expect(wrapper.find("table td").text()).toBe("1");
    });

    it("strips scripts, event handlers and images from a package's text", async () =>
    {
        const text = "Hi <script>alert(1)</script><a href=\"javascript:alert(1)\" onclick=\"x()\">link</a>" +
            "<img src=x onerror=\"alert(1)\"> [click](javascript:alert(1)) ![x](http://example.com/x.png)";
        const wrapper = await mountSuspended(RichText, { props: { text: text } });
        const html = wrapper.html();

        expect(html).not.toContain("<script");
        expect(wrapper.findAll("a").length).toBe(0);
        expect(wrapper.find("[onclick]").exists()).toBe(false);
        expect(wrapper.find("[onerror]").exists()).toBe(false);
        expect(wrapper.find("[href^='javascript']").exists()).toBe(false);
        expect(html).not.toContain("<img");
    });
});
