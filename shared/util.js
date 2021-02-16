export const getNewTurnLimit = ({
    modifier,
    prevTurnLimit,
    numPlayers,
    prevNumPlayers,
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

    const prevTurnLimitWasMax =
        numPlayers !== prevNumPlayers &&
        modifier === 0 &&
        numPlayers - prevTurnLimit <= 2;

    const newTurnLimit = Math.max(
        minTurns,
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
