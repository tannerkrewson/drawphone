import { HIDDEN } from "../shared/enums.js";

/* global $ */

export function hideAll() {
    $("#archive").addClass(HIDDEN);
    $("#lobby").addClass(HIDDEN);
    $("#game").addClass(HIDDEN);
    $("#result").addClass(HIDDEN);
    $("#waiting").addClass(HIDDEN);
}

export function showElement(jq) {
    $(jq).removeClass(HIDDEN);
}
