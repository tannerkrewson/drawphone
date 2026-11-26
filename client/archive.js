import Dexie from "dexie";

/* global $, ga */

export async function renderArchive(showResults) {
    const archiveContent = $("#archive-content");
    archiveContent.text("Loading previous results...");
    let resultsList;
    try {
        resultsList = (await getResultsListFromStorage()).reverse();
    } catch {
        archiveContent.text("Could not open the results archive on this device.");
        return;
    }

    archiveContent.empty();
    if (resultsList.length === 0) {
        archiveContent.text("No results found on this device. Play a game first!");
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

        $("<button type='button'>")
            .text(getQuickInfoStringOfResults(results))
            .addClass("btn btn-default prevresbtn")
            .on("click", () => {
                showResults(results.chains);
                window.scrollTo(0, 0);
                ga("send", "event", "Archive", "display another chain");
            })
            .appendTo(archiveContent);
    }
}

export async function addResultsToStorage(chains, roundId, date) {
    const db = initArchiveDb();
    try {
        await db.transaction("rw", db.archive, async () => {
            if (!(await db.archive.where("date").equals(date).and((entry) => entry.roundId === roundId).first())) {
                await db.archive.add({ date, chains, roundId });
            }
        });
    } finally {
        db.close();
    }
}

async function getResultsListFromStorage() {
    const db = initArchiveDb();
    try {
        return await db.archive.toArray();
    } finally {
        db.close();
    }
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
