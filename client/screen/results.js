import { DRAWING, WORD, FIRST_WORD } from "../../shared/enums.js";
import { exportChain } from "../export-chain";
import Screen from "./screen.js";

/* global $, ga */

class Results extends Screen {
    constructor(onDoneViewingResults, showDrawing) {
        super();

        this.onDoneViewingResults = onDoneViewingResults;

        this.id = "#result";
        this.showDrawing = showDrawing;
        this.exportButton = $("#result-export");
        const exportLabel = this.exportButton.find("span");
        const preview = $("#result-export-preview").get(0);
        const image = $("#result-export-image").get(0);
        const download = $("#result-export-download").get(0);
        $("#result-export-close").on("click", () => preview.close());
        preview.addEventListener("close", () => {
            URL.revokeObjectURL(image.src);
            image.removeAttribute("src");
            download.removeAttribute("href");
        });
        this.exportButton.on("click", async () => {
            const { number, owner } = this.chain;
            this.exporting = true;
            this.exportButton.prop("disabled", true);
            exportLabel.text("Making image...");
            $("#result-export-status").text("");
            try {
                const blob = await exportChain($("#result-content").get(0), number, owner);
                const url = URL.createObjectURL(blob);
                image.src = url;
                download.href = url;
                download.download = `drawphone-chain-${number}.png`;
                preview.showModal();
            } catch {
                $("#result-export-status").text("Could not make the image. Try again.");
            } finally {
                this.exporting = false;
                exportLabel.text("Save these results!");
                this.exportButton.prop("disabled", !this.chain.ready);
            }
        });

        $("#result-done").on("click", () => {
            this.onDoneViewingResults();
        });
    }

    show({ chains }) {
        this.render(chains[0], chains);

        super.show();
    }

    render(chainToShow, allChains) {
        const chainNumber = allChains.indexOf(chainToShow);

        this.setTitle(`Results #${chainNumber + 1}`);
        const subtitle = `${chainToShow.owner.name} should present these results to the group!`;
        this.setSubtitle(subtitle);
        const chain = { number: chainNumber + 1, owner: chainToShow.owner.name, ready: false };
        this.chain = chain;
        this.exportButton.prop("disabled", true);
        $("#result-export-status").text("");
        Promise.allSettled(this.displayChain(chainToShow)).then(() => {
            chain.ready = true;
            if (this.chain === chain && !this.exporting) this.exportButton.prop("disabled", false);
        });
        this.displayOtherChainButtons(allChains, chainToShow);
    }

    displayChain({ links }) {
        const results = $("#result-content");
        results.empty();
        const drawings = [];

        const firstIndex = links[0].type === FIRST_WORD ? 1 : 0;
        for (let i = firstIndex; i < links.length; i++) {
            const link = links[i];
            if (link.skipped) {
                results.append($("<h4>").text(`${link.player.name} skipped this turn.`));
                if (link.type === WORD) results.append($("<h1 class='mb-4'>").text(link.data));
                continue;
            }
            if (i === 0) {
                results.append($("<h4>").text("The first word:"));
            } else if (i === firstIndex) {
                results.append($("<h4>").text(`${link.player.name} wanted someone to draw:`));
            } else if (link.type === DRAWING) {
                results.append($("<h4>").text(`${link.player.name} drew:`));
            } else {
                results.append($("<h4>").text(`${link.player.name} thought that was:`));
            }

            if (link.type === DRAWING) {
                const image = $("<img class='drawing mb-4' alt='Drawing'>")
                    .appendTo(results)
                    .get(0);
                if (link.ref) {
                    const status = $("<p role='status'>").appendTo(results).get(0);
                    drawings.push(this.showDrawing(image, status, link));
                } else if (
                    typeof link.data === "string" &&
                    /^data:image\/svg\+xml[;,]/.test(link.data)
                ) {
                    image.src = link.data;
                } else {
                    image.remove();
                    results.append($("<p>").text("Drawing unavailable."));
                }
            } else {
                results.append($("<h1 class='mb-4'>").text(link.data));
            }
        }

        $("<div class='well'>")
            .append($("<h4>").text("You started with:"), $("<h1>").text(links[firstIndex].data))
            .append("<br>")
            .append($("<h4>").text("and ended up with:"), $("<h1>").text(links.at(-1).data))
            .appendTo(results);
        return drawings;
    }

    displayOtherChainButtons(chainsToList, { id }) {
        const others = $("#result-others");
        others.empty();

        if (chainsToList.length > 1) {
            others.append("<h4>View more results:</h4>");
        }

        for (let i = 0; i < chainsToList.length; i++) {
            const chain = chainsToList[i];

            // "players write first word" chains have the first word at index 1.
            const buttonLabel = chain.links[0].data || chain.links[1].data;

            const button = $("<button type='button'>")
                .prop("disabled", chain.id === id)
                .text(`${i + 1}. ${buttonLabel}`);
            button.addClass("btn btn-default btn-lg");
            ((thisChain, chainList) => {
                button.click(() => {
                    this.render(thisChain, chainList);

                    //jump to top of the page
                    window.scrollTo(0, 0);

                    ga("send", "event", "Results", "display another chain");
                });
            })(chain, chainsToList);
            others.append(button);
        }
    }
}

export default Results;
