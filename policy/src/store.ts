// Storage. The whole policy state is one small document; every change is a read-modify-write
// under a lock, so rules always see a consistent picture (e.g. today's total + this payment).
// JsonFileStore now; a Postgres store (single JSONB row, SELECT ... FOR UPDATE) for Vercel.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { State } from "./types.ts";

export interface Store {
  read(): Promise<State>;
  /** Runs fn on a private copy of the state and saves it if fn returns without throwing. */
  update<T>(fn: (s: State) => T | Promise<T>): Promise<T>;
}

export class MemoryStore implements Store {
  private chain: Promise<unknown> = Promise.resolve();
  constructor(private state: State) {}
  async read() {
    return structuredClone(this.state);
  }
  update<T>(fn: (s: State) => T | Promise<T>): Promise<T> {
    const run = this.chain.then(async () => {
      const draft = structuredClone(this.state);
      const out = await fn(draft);
      this.state = draft;
      return out;
    });
    this.chain = run.catch(() => undefined);
    return run;
  }
}

export class JsonFileStore implements Store {
  private chain: Promise<unknown> = Promise.resolve();
  constructor(private path: string, private seed: () => State) {
    if (!existsSync(path)) this.write(seed());
  }
  private load(): State {
    return JSON.parse(readFileSync(this.path, "utf8")) as State;
  }
  private write(s: State) {
    mkdirSync(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.tmp`;
    writeFileSync(tmp, JSON.stringify(s, null, 2));
    renameSync(tmp, this.path);
  }
  async read() {
    return this.load();
  }
  update<T>(fn: (s: State) => T | Promise<T>): Promise<T> {
    const run = this.chain.then(async () => {
      const draft = this.load();
      const out = await fn(draft);
      this.write(draft);
      return out;
    });
    this.chain = run.catch(() => undefined);
    return run;
  }
}
