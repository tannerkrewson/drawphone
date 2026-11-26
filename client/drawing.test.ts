import { encode, decode } from "@mapbox/polyline";
import { expect, test } from "vitest";
import { RecordingBrush, decodeDrawing, drawingSvg, encodeDrawing } from "./drawing";
import { Point } from "fabric";

test("a stroke survives encoding within one pixel", () => {
    const original = [new Point(30.2, 50.6), new Point(50.4, 70.25), new Point(51.1, 95.9)];
    const brush = Object.assign(Object.create(RecordingBrush.prototype), {
        _points: original,
        color: "#000000",
        width: 4,
    }) as RecordingBrush;
    const roundTrip = decodeDrawing(encodeDrawing([brush.record()]));
    expect(roundTrip[0].points).toBe(encode([[30, 51], [50, 70], [51, 96]], 0));
    decode(roundTrip[0].points, 0).forEach(([x, y], i) => {
        expect(Math.hypot(x - original[i].x, y - original[i].y)).toBeLessThan(1);
    });
    expect(drawingSvg(roundTrip)).toContain("<path");
});
