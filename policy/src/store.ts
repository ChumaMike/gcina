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

/**
 * Postgres store for Vercel: the whole state is one JSONB row. Every update runs in a transaction
 * that takes a row lock (SELECT ... FOR UPDATE), so two function instances can never both see
 * "not paid yet" for the same invoice. Same contract as JsonFileStore.
 */
export class PostgresStore implements Store {
  private ready: Promise<void> | null = null;
  constructor(
    private pool: { connect(): Promise<PgClient>; query(sql: string, params?: unknown[]): Promise<{ rows: Array<{ doc: State }> }> },
    private seed: () => State,
  ) {}
  private init() {
    this.ready ??= (async () => {
      await this.pool.query("CREATE TABLE IF NOT EXISTS gcina_policy_state (id int PRIMARY KEY, doc jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())");
      await this.pool.query("INSERT INTO gcina_policy_state (id, doc) VALUES (1, $1) ON CONFLICT (id) DO NOTHING", [JSON.stringify(this.seed())]);
    })().catch((e) => {
      this.ready = null;
      throw e;
    });
    return this.ready;
  }
  async read() {
    await this.init();
    const r = await this.pool.query("SELECT doc FROM gcina_policy_state WHERE id = 1");
    return r.rows[0].doc;
  }
  async update<T>(fn: (s: State) => T | Promise<T>): Promise<T> {
    await this.init();
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      const r = await c.query("SELECT doc FROM gcina_policy_state WHERE id = 1 FOR UPDATE");
      const draft = r.rows[0].doc;
      const out = await fn(draft);
      await c.query("UPDATE gcina_policy_state SET doc = $1, updated_at = now() WHERE id = 1", [JSON.stringify(draft)]);
      await c.query("COMMIT");
      return out;
    } catch (e) {
      await c.query("ROLLBACK").catch(() => undefined);
      throw e;
    } finally {
      c.release();
    }
  }
}

type PgClient = {
  query(sql: string, params?: unknown[]): Promise<{ rows: Array<{ doc: State }> }>;
  release(): void;
};
