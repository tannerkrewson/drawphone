export const getNewTurnLimit = (modifier, prevTurnLimit, numPlayers) => {
    const maxTurns = Math.floor(numPlayers / 2) * 2;

    const prevTurnLimitWasMax =
        modifier === 0 && numPlayers - prevTurnLimit <= 2;

    const newTurnLimit = Math.max(
        4,
        prevTurnLimitWasMax
            ? maxTurns
            : Math.min(maxTurns, prevTurnLimit + modifier * 2)
    );

    return {
        newTurnLimit,
        isMax: newTurnLimit === maxTurns,
        isTurnLimitUnchanged: newTurnLimit === prevTurnLimit,
    };
};
