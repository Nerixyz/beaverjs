export function assert(condition: any, message: string) {
    if(!condition) {
        throw new Error(message);
    }
}

export function tryParse(data: string, fallback: any = undefined) {
    if(!data) return fallback;
    try {
        return JSON.parse(data);
    } catch {
        return fallback;
    }
}

export function* filterMap<T, M>(array: Iterable<T>, fn: (item: T) => M | null): Iterable<M> {
    for(const item of array) {
        const result = fn(item);
        if (result !== null)
            yield result
    }
}
