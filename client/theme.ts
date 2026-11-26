import "bootstrap/dist/css/bootstrap.min.css";
import "typeface-pangolin/index.css";
import "./styles.css";

const storageKey = "drawphone:theme";
const systemTheme = matchMedia("(prefers-color-scheme: dark)");
const picker = document.querySelector<HTMLSelectElement>("#drawphone-theme");

function applyTheme() {
    const preference = picker?.value;
    document.documentElement.dataset.theme =
        preference === "light" || preference === "dark"
            ? preference
            : systemTheme.matches
              ? "dark"
              : "light";
}

if (picker) {
    try {
        const saved = localStorage.getItem(storageKey);
        if (saved === "light" || saved === "dark" || saved === "auto") picker.value = saved;
    } catch {
        // Theme selection still works when storage is unavailable.
    }
    picker.addEventListener("change", () => {
        applyTheme();
        try {
            localStorage.setItem(storageKey, picker.value);
        } catch {
            // Keep the current choice for this page.
        }
    });
    systemTheme.addEventListener("change", applyTheme);
    applyTheme();
}
