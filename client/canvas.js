import { fabric } from "fabric";
import "blueimp-canvas-to-blob";

/* global $ */

// https://github.com/abhi06991/Undo-Redo-Fabricjs
function getDrawingCanvas() {
    const thisCanvas = new fabric.Canvas("game-drawing-canvas");
    thisCanvas.isDrawingMode = true;
    thisCanvas.isBlank = true;
    thisCanvas.freeDrawingBrush.width = 4;

    const state = {
        canvasState: [],
        currentStateIndex: -1,
        undoStatus: false,
        redoStatus: false,
        undoFinishedStatus: 1,
        redoFinishedStatus: 1,
        undoButton: $("#game-drawing-undo"),
        redoButton: $("#game-drawing-redo"),
        colorInput: $("#game-drawing-color"),
        recentColorButton1: $("#game-drawing-recent-color1"),
        recentColorButton2: $("#game-drawing-recent-color2"),
        recentColorButton3: $("#game-drawing-recent-color3"),
        brushsizeInput: $("#game-drawing-brushsize"),
        brushsize: 4,
        color: "#000000",
    };
    thisCanvas.on("path:created", () => {
        updateCanvasState();
    });

    const updateCanvasState = () => {
        state.undoButton.removeClass("disabled");
        thisCanvas.isBlank = false;
        if (state.undoStatus == false && state.redoStatus == false) {
            const jsonData = thisCanvas.toJSON();
            const canvasAsJson = JSON.stringify(jsonData);
            if (state.currentStateIndex < state.canvasState.length - 1) {
                const indexToBeInserted = state.currentStateIndex + 1;
                state.canvasState[indexToBeInserted] = canvasAsJson;
                const numberOfElementsToRetain = indexToBeInserted + 1;
                state.canvasState = state.canvasState.splice(
                    0,
                    numberOfElementsToRetain
                );
            } else {
                state.canvasState.push(canvasAsJson);
            }
            state.currentStateIndex = state.canvasState.length - 1;
            if (
                state.currentStateIndex == state.canvasState.length - 1 &&
                state.currentStateIndex != -1
            ) {
                state.redoButton.addClass("disabled");
            }
        }
    };

    const undo = () => {
        if (state.undoFinishedStatus) {
            if (state.currentStateIndex == -1) {
                state.undoStatus = false;
            } else {
                if (state.canvasState.length >= 1) {
                    state.undoFinishedStatus = 0;
                    if (state.currentStateIndex != 0) {
                        state.undoStatus = true;
                        thisCanvas.loadFromJSON(
                            state.canvasState[state.currentStateIndex - 1],
                            () => {
                                thisCanvas.renderAll();
                                state.undoStatus = false;
                                state.currentStateIndex -= 1;
                                state.undoButton.removeClass("disabled");
                                if (
                                    state.currentStateIndex !==
                                    state.canvasState.length - 1
                                ) {
                                    state.redoButton.removeClass("disabled");
                                }
                                state.undoFinishedStatus = 1;
                            }
                        );
                    } else if (state.currentStateIndex == 0) {
                        thisCanvas.clear();
                        state.undoFinishedStatus = 1;
                        state.undoButton.addClass("disabled");
                        state.redoButton.removeClass("disabled");
                        thisCanvas.isBlank = true;
                        state.currentStateIndex -= 1;
                    }
                }
            }
        }
    };

    const redo = () => {
        if (state.redoFinishedStatus) {
            if (
                state.currentStateIndex == state.canvasState.length - 1 &&
                state.currentStateIndex != -1
            ) {
                state.redoButton.addClass("disabled");
            } else {
                if (
                    state.canvasState.length > state.currentStateIndex &&
                    state.canvasState.length != 0
                ) {
                    state.redoFinishedStatus = 0;
                    state.redoStatus = true;
                    thisCanvas.loadFromJSON(
                        state.canvasState[state.currentStateIndex + 1],
                        () => {
                            thisCanvas.isBlank = false;
                            thisCanvas.renderAll();
                            state.redoStatus = false;
                            state.currentStateIndex += 1;
                            if (state.currentStateIndex != -1) {
                                state.undoButton.removeClass("disabled");
                            }
                            state.redoFinishedStatus = 1;
                            if (
                                state.currentStateIndex ==
                                    state.canvasState.length - 1 &&
                                state.currentStateIndex != -1
                            ) {
                                state.redoButton.addClass("disabled");
                            }
                        }
                    );
                }
            }
        }
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

    thisCanvas.remove = () => {
        state.undoButton.off("click");
        state.redoButton.off("click");
        state.colorInput.val("#000000");
        state.colorInput.off("change");
        state.recentColorButton1.off("click");
        state.recentColorButton2.off("click");
        state.recentColorButton3.off("click");
        state.brushsizeInput.val(4);
        thisCanvas.dispose();
        $("#game-drawing-canvas").empty();
    };

    return thisCanvas;
}

export { getDrawingCanvas };
