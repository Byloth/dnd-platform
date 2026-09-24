/**
 * The icons the interface uses, by name: inline SVG from Font Awesome's solid set, imported one by one so only
 * these reach the bundle (no webfont, no stylesheet). A name missing here renders nothing; add it when used.
 */

import {
    faBolt,
    faChevronDown,
    faChevronLeft,
    faChevronRight,
    faCircle,
    faCircleCheck,
    faCircleXmark,
    faDiceD20,
    faFeather,
    faFileArrowUp,
    faGlobe,
    faHandFist,
    faHardDrive,
    faHeart,
    faLightbulb,
    faLinkSlash,
    faLock,
    faRotateLeft,
    faSliders,
    faSpinner,
    faStar,
    faThumbtack,
    faTrash,
    faTriangleExclamation,
    faXmark
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";

const _icons: readonly IconDefinition[] = [
    faBolt,
    faChevronDown,
    faChevronLeft,
    faChevronRight,
    faCircle,
    faCircleCheck,
    faCircleXmark,
    faDiceD20,
    faFeather,
    faFileArrowUp,
    faGlobe,
    faHandFist,
    faHardDrive,
    faHeart,
    faLightbulb,
    faLinkSlash,
    faLock,
    faRotateLeft,
    faSliders,
    faSpinner,
    faStar,
    faThumbtack,
    faTrash,
    faTriangleExclamation,
    faXmark
];

export const ICONS: Readonly<Record<string, IconDefinition>> =
    Object.fromEntries(_icons.map((icon) => [icon.iconName, icon]));
