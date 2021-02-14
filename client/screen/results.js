import { addResultsToStorage } from "../archive.js";
import { DRAWING, WORD, FIRST_WORD } from "../../shared/enums.js";
import Screen from "./screen.js";

/* global $, ga */

class Results extends Screen {
    constructor(onDoneViewingResults) {
        super();

        this.onDoneViewingResults = onDoneViewingResults;

        this.id = "#result";
    }

    initialize(props) {
        super.initialize(props);

        $("#result-done").on("click", () => {
            this.onDoneViewingResults();
        });
    }

    show({ data }, isArchivePage) {
        this.socket.off("disconnect");

        const { chains, roundTime } = data;

        if (roundTime) {
            ga("send", "event", "Results", "round time per player", roundTime);
        }

        this.render(chains[0], chains);

        super.show();

        if (!isArchivePage && !data.isViewPreviousResults) {
            addResultsToStorage(chains);
        }
    }

    render(chainToShow, allChains) {
        const chainNumber = allChains.indexOf(chainToShow);

        this.setTitle(`Results #${chainNumber + 1}`);
        const subtitle = `${chainToShow.owner.name} should present these results to the group!`;
        this.setSubtitle(subtitle);
        this.displayChain(chainToShow);
        this.displayOtherChainButtons(allChains, chainToShow);
    }

    displayChain({ links }) {
        const results = $("#result-content");
        results.empty();

        for (let i = 0; i < links.length; i++) {
            const link = links[i];
            if (i === 0 && link.type === WORD) {
                results.append(
                    `<h4>The first word:</h4><h1 class="mb-4">${link.data}</h1>`
                );
            } else if (i === 1 && links[0].type === FIRST_WORD) {
                results.append(
                    `<h4>${link.player.name} wanted someone to draw:</h4><h1 class="mb-4">${link.data}</h1>`
                );
            } else if (link.type === DRAWING) {
                results.append(
                    `<h4>${link.player.name} drew:</h4><img class="drawing mb-4" src="${link.data}"></img>`
                );
            } else if (link.type === WORD) {
                results.append(
                    `<h4>${link.player.name} thought that was:</h4><h1 class="mb-4">${link.data}</h1>`
                );
            }
        }

        let wentFromBox = "";
        wentFromBox += '<br><div class="well">';
        const firstIndex = links[0].type === FIRST_WORD ? 1 : 0;
        wentFromBox += `<h4>You started with:</h4><h1>${links[firstIndex].data}</h1><br>`;
        wentFromBox += `<h4>and ended up with:</h4><h1>${
            links[links.length - 1].data
        }</h1>`;
        wentFromBox += "</div>";
        results.append(wentFromBox);
    }

    displayOtherChainButtons(chainsToList, { id }) {
        const others = $("#result-others");
        others.empty();

        if (chainsToList.length > 1) {
            others.append("<h4>View more results:</h4>");
        }

        for (let i = 0; i < chainsToList.length; i++) {
            const chain = chainsToList[i];

            const disabled = chain.id === id ? "disabled" : "";

            // "players write first word" chains have the first word at index 1.
            const buttonLabel = chain.links[0].data || chain.links[1].data;

            const button = $(
                `<button type="button"${disabled}>${
                    i + 1
                }. ${buttonLabel}</button>`
            );
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
