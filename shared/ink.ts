// Nova: rocketcrab/packages/protocol/src/limits.ts (including the reserved MIME bytes).
export const FILE_BUDGET = 2 * 1024 * 1024;
export const FILE_OVERHEAD = 164;

export const drawingLimit = (used: number, remaining: number) =>
    Math.floor((FILE_BUDGET - used) / remaining) - FILE_OVERHEAD;
