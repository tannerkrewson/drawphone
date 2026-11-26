import { Canvas } from "fabric";
import { DRAWING_SIZE, RecordingBrush, encodeDrawing, rebuildStroke } from "./drawing";

/* global $ */

function getDrawingCanvas() {
    const thisCanvas = new Canvas("game-drawing-canvas", { enablePointerEvents: true, selection: false, skipTargetFind: true });
    const brush = new RecordingBrush(thisCanvas);
    brush.decimate = 0;
    thisCanvas.freeDrawingBrush = brush;

    const state = {
        undoButton: $("#game-drawing-undo"),
        redoButton: $("#game-drawing-redo"),
        colorInput: $("#game-drawing-color"),
        recentColorButton1: $("#game-drawing-recent-color1"),
        recentColorButton2: $("#game-drawing-recent-color2"),
        recentColorButton3: $("#game-drawing-recent-color3"),
        brushsizeInput: $("#game-drawing-brushsize"),
    };
    let strokes = [];
    let redoStrokes = [];
    let storageKey;
    let limit;
    let full;
    let encoded;

    const update = () => {
        encoded = encodeDrawing(strokes);
        const percent = encoded.length / limit;
        $("#game-ink").text(full
            ? "Canvas full. Undo a stroke to make room."
            : percent >= 0.8 ? `Ink used: ${Math.floor(percent * 100)}%` : "");
        state.undoButton.prop("disabled", !strokes.length);
        state.redoButton.prop("disabled", !redoStrokes.length);
        thisCanvas.isDrawingMode = !full;
        thisCanvas.isBlank = !strokes.length;

        try {
            localStorage.setItem(storageKey, JSON.stringify(strokes));
        } catch {
            // Drawing still works if local storage is unavailable.
        }
    };

    thisCanvas.on("path:created", ({ path }) => {
        const stroke = brush.record();
        strokes.push(stroke);
        thisCanvas.remove(path);
        if (encodeDrawing(strokes).length > limit) {
            strokes.pop();
            full = true;
        } else {
            thisCanvas.add(rebuildStroke(stroke));
            redoStrokes = [];
        }
        update();
    });

    const undo = () => {
        if (!strokes.length) return;
        redoStrokes.push(strokes.pop());
        thisCanvas.remove(thisCanvas.getObjects().at(-1));
        full = false;
        update();
    };

    const redo = () => {
        if (!redoStrokes.length) return;
        const stroke = redoStrokes.pop();
        strokes.push(stroke);
        thisCanvas.add(rebuildStroke(stroke));
        update();
    };

    const changeColor = () => {
        state.recentColorButton3.css(
            "background-color",
            state.recentColorButton2.css("background-color")
        );
        state.recentColorButton2.css(
            "background-color",
            state.recentColorButton1.css("background-color")
        );
        state.recentColorButton1.css(
            "background-color",
            thisCanvas.freeDrawingBrush.color
        );
        thisCanvas.freeDrawingBrush.color = state.colorInput.val();
    };

    const rgbToHex = (rgb) => {
        if (/^#[0-9A-F]{6}$/i.test(rgb)) return rgb;

        rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        function hex(x) {
            return `0${parseInt(x).toString(16)}`.slice(-2);
        }
        return `#${hex(rgb[1])}${hex(rgb[2])}${hex(rgb[3])}`;
    };

    const recallColor = (index, color) => {
        state.colorInput.val(rgbToHex(color));
        if (index >= 3) {
            state.recentColorButton3.css(
                "background-color",
                state.recentColorButton2.css("background-color")
            );
        }
        if (index >= 2) {
            state.recentColorButton2.css(
                "background-color",
                state.recentColorButton1.css("background-color")
            );
        }
        if (index >= 1) {
            state.recentColorButton1.css(
                "background-color",
                thisCanvas.freeDrawingBrush.color
            );
        }
        thisCanvas.freeDrawingBrush.color = state.colorInput.val();
    };

    const changeBrushsize = () => {
        thisCanvas.freeDrawingBrush.width =
            parseInt(state.brushsizeInput.val(), 10) || 1;
    };

    state.undoButton.on("click", undo);
    state.redoButton.on("click", redo);

    state.colorInput.on("change", changeColor);
    state.recentColorButton1.on("click", () => {
        recallColor(1, state.recentColorButton1.css("background-color"));
    });
    state.recentColorButton2.on("click", () => {
        recallColor(2, state.recentColorButton2.css("background-color"));
    });
    state.recentColorButton3.on("click", () => {
        recallColor(3, state.recentColorButton3.css("background-color"));
    });
    state.brushsizeInput.on("change", changeBrushsize);

    thisCanvas.begin = (key, ink) => {
        storageKey = key;
        limit = ink;
        full = false;
        redoStrokes = [];
        strokes = [];
        thisCanvas.clear();
        brush.width = 4;
        brush.color = "#000000";
        state.colorInput.val(brush.color);
        state.brushsizeInput.val(brush.width);
        try {
            const saved = JSON.parse(localStorage.getItem(key) || "[]");
            const paths = saved.map(rebuildStroke);
            if (encodeDrawing(saved).length <= ink) {
                strokes = saved;
                thisCanvas.add(...paths);
            }
        } catch {
            // A missing or invalid draft opens a blank canvas.
        }
        for (const button of [state.undoButton, state.redoButton]) button.removeClass("disabled");
        update();
    };

    thisCanvas.bytes = () => encoded;
    thisCanvas.resize = (size) => {
        thisCanvas.setDimensions({ width: size, height: size });
        thisCanvas.setZoom(size / DRAWING_SIZE);
    };
    return thisCanvas;
}

export { getDrawingCanvas };
