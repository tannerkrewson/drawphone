export async function exportChain(content: HTMLElement, number: number, owner: string) {
    const staging = document.createElement("div");
    staging.className = "chain-export-staging";
    staging.setAttribute("aria-hidden", "true");

    const poster = document.createElement("article");
    poster.className = "chain-export";
    const template = document.querySelector<HTMLTemplateElement>("#result-export-header")!;
    const header = template.content.cloneNode(true) as DocumentFragment;
    header.querySelector("p")!.textContent = `Chain ${number} · ${owner}`;

    const chain = content.cloneNode(true) as HTMLElement;
    chain.removeAttribute("id");
    for (const paragraph of chain.querySelectorAll("p:empty")) paragraph.remove();
    poster.append(header, chain);
    staging.append(poster);
    document.body.append(staging);
    try {
        await document.fonts.ready;
        for (const image of poster.querySelectorAll("img")) {
            if (image.hidden) continue;
            try {
                await image.decode();
            } catch {
                const message = document.createElement("p");
                message.textContent = "Drawing unavailable.";
                image.replaceWith(message);
            }
        }
        const { snapdom } = await import("@zumer/snapdom");
        const capture = await snapdom(poster, {
            dpr: 1,
            embedFonts: true,
            backgroundColor: getComputedStyle(document.body).backgroundColor,
        });
        return await capture.toBlob({ format: "png" });
    } finally {
        staging.remove();
    }
}
