import Dexie from "dexie";

/* global $, ga */

export async function renderArchive(drawphone) {
    const archive = $("#archive");
    const archiveContent = $("#archive-content");
    const result = $("#result");
    if (!localStorage) {
        archiveContent.text("This browser does not support local storage.");
        return;
    }

    const resultsList = (await getResultsListFromStorage()).reverse();

    if (resultsList.length === 0) {
        archiveContent.text(
            "No results found on this device. Play a game first!"
        );
        return;
    }

    let lastDate;
    for (let i = 0; i < resultsList.length; i++) {
        const results = resultsList[i];

        const theDate = new Date(results.date).toLocaleDateString("en-us", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });

        if (theDate !== lastDate) {
            if (i > 0) archiveContent.append("<br>");
            archiveContent.append(theDate);

            lastDate = theDate;
        }

        const button = $(
            `<button type="button">${getQuickInfoStringOfResults(
                results
            )}</button>`
        );
        button.addClass("btn btn-default prevresbtn");

        ((chains) => {
            button.click(() => {
                drawphone.results.show(
                    {
                        data: { chains },
                        you: { id: "this id doesn't exist" },
                    },
                    true
                );

                result.show();
                archive.hide();

                //jump to top of the page
                window.scrollTo(0, 0);

                ga("send", "event", "Archive", "display another chain");
            });
        })(results.chains);
        archiveContent.append(button);
    }

    drawphone.results.onDoneViewingResults = () => {
        archive.show();
        result.hide();

        //jump to top of the page
        window.scrollTo(0, 0);
    };
}

export function addResultsToStorage(chains) {
    const db = initArchiveDb();
    db.archive.add({ date: new Date(), chains });
}

function getResultsListFromStorage() {
    const db = initArchiveDb();
    return db.archive.toArray();
}

function initArchiveDb() {
    const db = new Dexie("DrawphoneDatabase");
    db.version(1).stores({
        archive: "++id,date,chains",
    });
    return db;
}

function getQuickInfoStringOfResults({ date, chains }) {
    let result = "";
    result += new Date(date).toLocaleTimeString("en-us", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
    result += ": ";

    const firstChainLinks = chains[0].links;
    result += firstChainLinks[0].data || firstChainLinks[1].data;
    result += " to ";
    result += firstChainLinks[firstChainLinks.length - 1].data;

    if (chains.length === 1) return result;

    result += ", ";
    const secondChainLinks = chains[1].links;
    result += secondChainLinks[0].data || secondChainLinks[1].data;
    result += " to ";
    result += secondChainLinks[secondChainLinks.length - 1].data;
    result += ", etc.";
    return result;
}
