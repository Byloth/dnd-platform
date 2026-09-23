/**
 * Long work as a generator that yields after each unit (one file), so that the same code runs in one go
 * (the CLI, the tests) or pausing now and then (a browser page that must stay responsive).
 */

export type Steps<T> = Generator<void, T, void>;

/** Called between batches of steps; the browser passes something like `yieldToEventLoop`. */
export type Pause = () => Promise<void>;

export interface PauseOptions
{
    readonly pause?: Pause;
    /** Steps between two pauses. Default 16. */
    readonly every?: number;
}

export function run<T>(steps: Steps<T>): T
{
    let result = steps.next();
    while (!result.done) { result = steps.next(); }

    return result.value;
}

export async function runPausing<T>(steps: Steps<T>, options: PauseOptions = {}): Promise<T>
{
    const every = options.every ?? 16;
    let count = 0;
    let result = steps.next();
    while (!result.done)
    {
        count += 1;
        if (options.pause && count % every === 0) { await options.pause(); }
        result = steps.next();
    }

    return result.value;
}
