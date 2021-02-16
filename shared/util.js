export const getNewTurnLimit = ({
    modifier,
    prevTurnLimit,
    numPlayers,
    prevNumPlayers = numPlayers,
    isWordFirst,
}) => {
    const offset = isWordFirst ? 1 : 0;
    const minTurns = 4 - offset;
    const maxTurns = Math.floor((numPlayers + offset) / 2) * 2 - offset;

    if (!prevTurnLimit) {
        return {
            newTurnLimit: minTurns,
            isMax: true,
            isTurnLimitUnchanged: false,
        };
    }

    const isValidWordFirstTurnLimit = prevTurnLimit % 2 === 1;

    let rawTurns = prevTurnLimit + modifier * 2;

    if (isValidWordFirstTurnLimit && !isWordFirst) {
        rawTurns++;
    } else if (!isValidWordFirstTurnLimit && isWordFirst) {
        rawTurns--;
    }

    const prevTurnLimitWasMax =
        numPlayers !== prevNumPlayers &&
        modifier === 0 &&
        numPlayers - prevTurnLimit <= 2;

    const newTurnLimit = Math.max(
        minTurns,
        prevTurnLimitWasMax ? maxTurns : Math.min(maxTurns, rawTurns)
    );

    return {
        newTurnLimit,
        isMax: newTurnLimit === maxTurns,
        isTurnLimitUnchanged: newTurnLimit === prevTurnLimit,
    };
};
