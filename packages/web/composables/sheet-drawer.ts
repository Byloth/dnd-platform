import type { InjectionKey } from "vue";

import type { DerivedValue } from "@byloth/dnd-platform-engine";

/** What the sheet's explanation drawer shows: a value, its label and how it reads on the sheet. */
export interface DrawerRequest
{
    readonly label: string;
    readonly shown: string;
    readonly value: DerivedValue;
}

/** Opens the explanation drawer of the sheet around it (provided by SheetView). */
export type OpenDrawer = (request: DrawerRequest) => void;

export const OPEN_DRAWER: InjectionKey<OpenDrawer> = Symbol("sheet-drawer");

/** The drawer's opener, or a no-op outside a sheet. */
export function useSheetDrawer(): OpenDrawer
{
    return inject(OPEN_DRAWER, () => undefined);
}
