//
// Drawphone Round
//

// https://stackoverflow.com/a/33352604
const arrayFromOneToN = (length, offset = 0) => Array.from({ length }, (_, i) => i + offset);

// https://stackoverflow.com/a/58326608
const rotateArray = (arr, count = 1) => [...arr.slice(count, arr.length), ...arr.slice(0, count)];

// https://math.stackexchange.com/a/4000891
// "In the odd prime case..."
const oddApproxRCLS = (numPlayers, numTurns) => {
    const m = (numPlayers - 1) / 2;

    let result = [arrayFromOneToN(numPlayers)];
    const last = () => result[result.length - 1];

    for (let i = 1; i <= m; i++) {
        const direction = i % 2 === 0 ? -1 : 1;
        result.push(rotateArray(last(), i * direction));
    }

    const mDirection = m % 2 === 0 ? -1 : 1;
    result.push(rotateArray(last(), mDirection));

    for (let i = m - 1; i >= Math.max(1, m - numTurns); i--) {
        const direction = i % 2 === 0 ? 1 : -1;
        result.push(rotateArray(last(), i * direction));
    }

    return result;
};

// https://math.stackexchange.com/a/4000891
// "It is easy to solve the problem when n is even. First..."d
function evenExactRCLS(numPlayers, numTurns) {
    let result = [arrayFromOneToN(numPlayers)];
    const last = () => result[result.length - 1];

    for (let i = 1; i < numTurns; i++) {
        const direction = i % 2 === 0 ? -1 : 1;
        result.push(rotateArray(last(), i * direction));
    }

    return result;
}

export const rowCompleteLatinSquare = (numPlayers, numTurns) =>
    numPlayers % 2 === 0
        ? evenExactRCLS(numPlayers, numTurns)
        : oddApproxRCLS(numPlayers, numTurns);

export function getRoundLength(players, turnLimit, isWordFirst) {
    let links = (players === 1 ? 6 : turnLimit) + (isWordFirst ? 0 : 1);
    // Results always start and end with a word.
    if (links % 2 === 0) links--;
    return links;
}
