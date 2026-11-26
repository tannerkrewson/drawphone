export type Player = { id: string; name: string };
export type Context = { players: Player[]; leaderId: string | null };
export type ActionContext = Context & { actor: Player };
export type GameDefinition<State> = {
    title: string;
    apiVersion: 1;
    maxPlayers: number;
    createInitialState(context: Context): State;
    actions: Record<string, (state: State, context: ActionContext, payload: unknown) => void>;
    playerJoined(state: State, context: Context, player: Player): void;
    playerLeft(state: State, context: Context, player: Player): void;
};

export interface Nova<State> {
    defineGame(game: GameDefinition<State>): void;
    ready(): void;
    player: Player | null;
    players: Player[];
    leaderId: string | null;
    connectionStatus: string;
    onConnectionChange(callback: (status: string) => void): () => void;
    onStart(callback: () => void): () => void;
    onEnd(callback: () => void): () => void;
    onPlayerJoin(callback: () => void): () => void;
    onPlayerLeave(callback: () => void): () => void;
    dispatch(action: { type: string; payload?: unknown }): Promise<void>;
    state: { get(): State | null; onChange(callback: (state: State) => void): () => void };
    files: { put(blob: Blob): Promise<string>; get(ref: string): Promise<Blob> };
}
