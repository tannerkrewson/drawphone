import { Point, PencilBrush, Path, util } from "fabric";
import { encode, decode } from "@mapbox/polyline";
import { deflateSync, inflateSync, strFromU8, strToU8 } from "fflate";
import simplify from "simplify-js";

export const DRAWING_SIZE = 600;
export type Stroke = { color: string; width: number; points: string };

export class RecordingBrush extends PencilBrush {
    record(): Stroke {
        return {
            color: this.color,
            width: this.width,
            points: encode(
                simplify(this._points, 1, true).map(({ x, y }) => [x, y]),
                0,
            ),
        };
    }
}

export function encodeDrawing(strokes: Stroke[]) {
    return deflateSync(strToU8(JSON.stringify(strokes)), { level: 9 });
}

export function decodeDrawing(bytes: Uint8Array): Stroke[] {
    return JSON.parse(strFromU8(inflateSync(bytes)));
}

function pathCommands({ points, color, width }: Stroke) {
    if (
        !/^#[a-f0-9]{6}$/i.test(color) ||
        !Number.isInteger(width) ||
        width < 1 ||
        width > 60 ||
        typeof points !== "string" ||
        /[^?-~]/.test(points)
    ) {
        throw new Error("Invalid drawing stroke.");
    }
    const samples = decode(points, 0).map(([x, y]) => new Point(x, y));
    if (!samples.length || samples.some(({ x, y }) => !Number.isFinite(x) || !Number.isFinite(y))) {
        throw new Error("Invalid drawing points.");
    }
    if (samples.length === 1) samples.push(samples[0]);
    return util.getSmoothPathFromPoints(samples, width / 1000);
}

export function rebuildStroke(stroke: Stroke) {
    return new Path(pathCommands(stroke), {
        fill: null,
        stroke: stroke.color,
        strokeWidth: stroke.width,
        strokeLineCap: "round",
        strokeLineJoin: "round",
    });
}

export function drawingSvg(strokes: Stroke[]) {
    const paths = strokes.map((stroke) => {
        const path = util.joinPath(pathCommands(stroke));
        return `<path d="${path}" stroke="${stroke.color}" stroke-width="${stroke.width}"/>`;
    });
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${DRAWING_SIZE} ${DRAWING_SIZE}" fill="none" stroke-linecap="round" stroke-linejoin="round">${paths.join("")}</svg>`;
}
