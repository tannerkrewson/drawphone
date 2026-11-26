declare module "knuth-shuffle" {
    export function knuthShuffle<T>(items: T[]): T[];
}
declare module "simplify-js" {
    export default function simplify<T extends { x: number; y: number }>(
        points: T[],
        tolerance: number,
        highestQuality: boolean,
    ): T[];
}
