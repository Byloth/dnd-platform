import { JSONStorage } from "@byloth/core";
import { defineStore } from "pinia";

/**
 * The visitor's consent to the usage statistics (DEC-22, docs/phase-1/12-analytics.md): asked once, opt-in,
 * remembered in this browser and changeable at any time. `unset` and `denied` both mean nothing is loaded and
 * nothing is sent. Kept apart from the preferences: it is a legal choice, not a matter of taste.
 */

export type Consent = "unset" | "granted" | "denied";

export const CONSENT_KEY = "consent";

interface StoredConsent
{
    readonly analytics: Consent;
    readonly decidedAt?: string;
}

const ALLOWED: readonly Consent[] = ["unset", "granted", "denied"];

export const useConsentStore = defineStore("consent", () =>
{
    const storage = new JSONStorage();
    const stored = storage.get<Partial<StoredConsent>>(CONSENT_KEY);

    const analytics = ref<Consent>(ALLOWED.includes(stored?.analytics as Consent) ? stored!.analytics! : "unset");
    const decidedAt = ref<string | undefined>(stored?.decidedAt);

    const _decide = (value: Consent): void =>
    {
        analytics.value = value;
        decidedAt.value = value === "unset" ? undefined : new Date().toISOString();

        if (value === "unset") { storage.delete(CONSENT_KEY); }
        else { storage.set(CONSENT_KEY, { analytics: value, decidedAt: decidedAt.value }); }
    };

    const grant = (): void => _decide("granted");
    const deny = (): void => _decide("denied");
    /** Forgets the choice, so the banner asks again. */
    const reset = (): void => _decide("unset");

    return { analytics, decidedAt, grant, deny, reset };
});
