import { encodeMsgpack, decodeMsgpack, BufWriter } from "./deps.ts";
interface SenderOptions {
  hostname?: string;
  port?: number;
}

export interface Sender {
  post(tag: string, record: Record<string, unknown>): Promise<void>;
  close(): void;
}

class FluentSender implements Sender {
  readonly #hostname: string;
  readonly #port: number;
  readonly #tagPrefix: string;
  #conn: Deno.Conn | null = null;

  constructor(tagPrefix: string, options: SenderOptions) {
    this.#tagPrefix = tagPrefix;
    this.#hostname = options.hostname ?? "localhost";
    this.#port = options.port ?? 24224;
  }

  async post(tag: string, record: Record<string, unknown>) {
    const time = Math.floor(Date.now() / 1000);
    await this.send(tag, time, record);
  }

  close() {
    if (this.#conn) {
      this.#conn.close();
    }
  }

  private async send(tag: string, time: number, record: Record<string, unknown>): Promise<void> {
    const conn = await this.connectIfNeeded();
    const payload = encodeMsgpack([
      this.#tagPrefix ? [this.#tagPrefix, tag].join(".") : tag,
      time,
      record,
    ]);
    const w = BufWriter.create(conn);
    await w.write(payload);
    await w.flush();
  }

  private async connectIfNeeded(): Promise<Deno.Conn> {
    if (this.#conn == null) {
      this.#conn = await Deno.connect({
        hostname: this.#hostname,
        port: this.#port,
        transport: "tcp",
      });
    }
    return this.#conn;
  }
}

export function createFluentSender(
  tagPrefix: string,
  options: SenderOptions,
): Sender {
  return new FluentSender(tagPrefix, options);
}
