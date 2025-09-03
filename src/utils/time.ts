export function sec(num: number): number {
    return num * 1000;
}

export function min(num: number): number {
    return sec(num * 60);
}
