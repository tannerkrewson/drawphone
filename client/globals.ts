import $ from "jquery";

declare global {
    interface Window {
        $: typeof $;
        ga: (...args: unknown[]) => void;
    }
}

window.$ = $;
