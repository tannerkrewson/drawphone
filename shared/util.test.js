import { getNewTurnLimit } from "./util.js";

const setNewTurnLimit = (state, modifier) => {
    const result = getNewTurnLimit(
        modifier,
        state.currentTurnLimit,
        state.numPlayers
    );

    state.currentTurnLimit = result.newTurnLimit;
};

test("getNewTurnLimit sticks to max", () => {
    let state = {
        currentTurnLimit: 4,
        numPlayers: 5,
    };

    setNewTurnLimit(state, 0);
    expect(state.currentTurnLimit).toBe(4);

    state.numPlayers++;
    setNewTurnLimit(state, 0);
    expect(state.currentTurnLimit).toBe(6);

    state.numPlayers++;
    setNewTurnLimit(state, 0);
    expect(state.currentTurnLimit).toBe(6);

    state.numPlayers++;
    setNewTurnLimit(state, 0);
    expect(state.currentTurnLimit).toBe(8);

    state.numPlayers++;
    setNewTurnLimit(state, 0);
    expect(state.currentTurnLimit).toBe(8);
});

test("getNewTurnLimit stays at selected if below max", () => {
    let state = {
        currentTurnLimit: 4,
        numPlayers: 5,
    };

    setNewTurnLimit(state, 0);
    expect(state.currentTurnLimit).toBe(4);

    state.numPlayers++;
    setNewTurnLimit(state, 0);
    expect(state.currentTurnLimit).toBe(6);

    setNewTurnLimit(state, -1);
    expect(state.currentTurnLimit).toBe(4);

    state.numPlayers++;
    setNewTurnLimit(state, 0);
    expect(state.currentTurnLimit).toBe(4);

    state.numPlayers++;
    setNewTurnLimit(state, 0);
    expect(state.currentTurnLimit).toBe(4);

    state.numPlayers++;
    setNewTurnLimit(state, 0);
    expect(state.currentTurnLimit).toBe(4);
});
