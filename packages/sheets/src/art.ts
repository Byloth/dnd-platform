/**
 * The platform's own marks, drawn in code: the d20 emblem, the frame of a box with its title set in the border,
 * and the small ornaments. Nothing here is taken from any publisher's sheet.
 */

import type { Color } from "pdf-lib";

import type { Pen } from "./pen.js";
import { ACCENT, BRASS, HAIRLINE, INK, PAPER, roundedRect, RULE, TINT } from "./pen.js";

// ---- the emblem ------------------------------------------------------------------------

/**
 * A d20 seen face on, in a double ring: the outer hexagon, the central face with its "20", and the nine edges
 * that join them.
 */
export function emblem(pen: Pen, cx: number, cy: number, radius: number, options: { ring?: boolean } = {}): void
{
    const ring = options.ring ?? true;
    if (ring)
    {
        pen.circle(cx, cy, radius, { fill: PAPER, stroke: ACCENT, width: radius * 0.06 });
        pen.circle(cx, cy, radius * 0.87, { stroke: BRASS, width: radius * 0.018 });
        // Four brass studs on the ring, at the cardinal points.
        for (const angle of [0, 90, 180, 270])
        {
            const a = (angle * Math.PI) / 180;
            const x = cx + (Math.cos(a) * radius * 0.935);
            const y = cy + (Math.sin(a) * radius * 0.935);
            const k = radius * 0.05;
            pen.path(`M ${x} ${y - k} L ${x + k} ${y} L ${x} ${y + k} L ${x - k} ${y} Z`, { fill: BRASS });
        }
    }

    const R = radius * (ring ? 0.66 : 1);
    const at = (deg: number, r: number): [number, number] =>
        [cx + (Math.cos((deg * Math.PI) / 180) * r), cy + (Math.sin((deg * Math.PI) / 180) * r)];
    const hex = [-90, -30, 30, 90, 150, 210].map((d) => at(d, R));
    const [T, UR, LR, B, LL, UL] = hex as [number, number][] as [
        [number, number], [number, number], [number, number], [number, number], [number, number], [number, number]
    ];
    const inner = R * 0.56;
    const it = at(-90, inner);
    const ir = at(30, inner);
    const il = at(150, inner);

    const p = (q: [number, number]): string => `${q[0].toFixed(2)} ${q[1].toFixed(2)}`;
    // The faces around the centre, lightly tinted so the die reads as a solid.
    pen.path(`M ${p(T)} L ${p(UR)} L ${p(LR)} L ${p(B)} L ${p(LL)} L ${p(UL)} Z`, { fill: TINT });
    pen.path(`M ${p(it)} L ${p(ir)} L ${p(B)} L ${p(il)} Z`, { fill: rgbMix(TINT, HAIRLINE, 0.35) });
    pen.path(`M ${p(it)} L ${p(ir)} L ${p(il)} Z`, { fill: PAPER });

    const edges = [
        [it, T], [it, UL], [it, UR], [il, UL], [il, LL], [il, B], [ir, UR], [ir, LR], [ir, B]

    ] as const;
    const stroke = R * 0.045;
    for (const [a, b] of edges) { pen.path(`M ${p(a)} L ${p(b)}`, { stroke: ACCENT, width: stroke * 0.8 }); }
    pen.path(`M ${p(it)} L ${p(ir)} L ${p(il)} Z`, { stroke: ACCENT, width: stroke });
    const outline = `M ${p(T)} L ${p(UR)} L ${p(LR)} L ${p(B)} L ${p(LL)} L ${p(UL)} Z`;
    pen.path(outline, { stroke: ACCENT, width: stroke * 1.4 });

    const size = R * 0.34;
    pen.text("20", cx, cy + (R * 0.14), { font: pen.fonts.display, size: size, color: ACCENT, align: "center" });
}

function rgbMix(a: Color, b: Color, t: number): Color
{
    const ca = a as unknown as { red: number, green: number, blue: number };
    const cb = b as unknown as { red: number, green: number, blue: number };

    return {
        type: "RGB",
        red: ca.red + ((cb.red - ca.red) * t),
        green: ca.green + ((cb.green - ca.green) * t),
        blue: ca.blue + ((cb.blue - ca.blue) * t)

    } as unknown as Color;
}

// ---- ornaments ------------------------------------------------------------------------

export function diamond(pen: Pen, cx: number, cy: number, k: number, color: Color = ACCENT): void
{
    pen.path(`M ${cx} ${cy - k} L ${cx + k} ${cy} L ${cx} ${cy + k} L ${cx - k} ${cy} Z`, { fill: color });
}

/** A thin rule with a diamond in the middle, to divide a box. */
export function divider(pen: Pen, x: number, y: number, width: number): void
{
    const mid = x + (width / 2);
    pen.line(x, y, mid - 5, y, HAIRLINE, 0.5);
    pen.line(mid + 5, y, x + width, y, HAIRLINE, 0.5);
    diamond(pen, mid, y, 1.8, BRASS);
}

// ---- frames ------------------------------------------------------------------------

export interface FrameOptions
{
    /** Title set in the top border, between two diamonds. */
    readonly title?: string;
    /** Title set in the bottom border instead. */
    readonly caption?: string;
    readonly fill?: Color;
    readonly radius?: number;
}

/** The box of the sheet: an ink line and a hairline inside it, rounded, with its title in the border. */
export function frame(pen: Pen, x: number, y: number, w: number, h: number, options: FrameOptions = {}): void
{
    const r = options.radius ?? 4;
    pen.path(roundedRect(x, y, w, h, r), { fill: options.fill ?? PAPER, stroke: RULE, width: 0.8 });
    pen.path(roundedRect(x + 2, y + 2, w - 4, h - 4, Math.max(1, r - 1.5)), { stroke: HAIRLINE, width: 0.4 });
    if (options.title) { borderTitle(pen, options.title, x + (w / 2), y, w - 8, options.fill ?? PAPER); }
    if (options.caption) { borderTitle(pen, options.caption, x + (w / 2), y + h, w - 8, options.fill ?? PAPER); }
}

/** A title centred on a border line, the line broken behind it, a diamond on each side. */
export function borderTitle(
    pen: Pen, title: string, cx: number, y: number, maxWidth: number, background: Color = PAPER
): void
{
    const font = pen.fonts.display;
    const size = 6.6;
    const tracking = 0.45;
    const label = title.toUpperCase();
    let width = font.widthOfTextAtSize(label, size) + (tracking * (label.length - 1));
    const scale = Math.min(1, (maxWidth - 16) / width);
    width *= scale;
    const half = (width / 2) + 7;
    pen.path(`M ${cx - half} ${y - 4} H ${cx + half} V ${y + 4} H ${cx - half} Z`, { fill: background });
    diamond(pen, cx - half + 2.2, y, 1.7);
    diamond(pen, cx + half - 2.2, y, 1.7);
    pen.text(label, cx, y + (pen.capHeight(font, size * scale) / 2), {
        font: font, size: size * scale, color: ACCENT, align: "center", tracking: tracking * scale
    });
}

/** A small label under a line or a box: Atkinson in small capitals, muted. */
export function smallLabel(pen: Pen, label: string, x: number, y: number, options: {
    align?: "left" | "center" | "right"; maxWidth?: number; color?: Color; size?: number;
} = {}): void
{
    pen.text(label.toUpperCase(), x, y, {
        font: pen.fonts.textBold,
        size: options.size ?? 5.4,
        color: options.color ?? INK,
        align: options.align ?? "left",
        tracking: 0.35,
        ...(options.maxWidth !== undefined ? { maxWidth: options.maxWidth } : {})
    });
}
