import { encodeMsgpack, decodeMsgpack, BufWriter } from "./deps.ts";

interface SenderOptions {
  tagPrefix?: string;
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
  #bufWriter: BufWriter | null = null;

  constructor(options: SenderOptions) {
    this.#tagPrefix = options.tagPrefix ?? "";
    this.#hostname = options.hostname ?? "127.0.0.1";
    this.#port = options.port ?? 24224;
  }

  async post(tag: string, record: Record<string, unknown>) {
    const time = Math.floor(Date.now() / 1000);
    await this.send(tag, time, record);
  }

  close() {
    if (this.#conn) {
      this.#conn.close();
      this.#conn = null;
      this.#bufWriter = null;
    }
  }

  private async send(
    tag: string,
    time: number,
    record: Record<string, unknown>,
  ): Promise<void> {
    const packet = this.createPacket(tag, time, record);
    return this.sendPacket(packet);
  }

  private createPacket(
    tag: string,
    time: number,
    record: Record<string, unknown>,
  ): Uint8Array {
    return encodeMsgpack([
      this.#tagPrefix ? [this.#tagPrefix, tag].join(".") : tag,
      time,
      record,
    ]);
  }

  private async sendPacket(data: Uint8Array): Promise<void> {
    await this.connectIfNeeded();
    const w = this.#bufWriter;
    if (w) {
      await w.write(data);
      await w.flush();
    }
  }

  private async connectIfNeeded(): Promise<void> {
    if (this.#conn == null) {
      await this.connect();
    }
  }

  private async connect(): Promise<void> {
    this.#conn = await Deno.connect({
      hostname: this.#hostname,
      port: this.#port,
      transport: "tcp",
    });
    this.#bufWriter = BufWriter.create(this.#conn);
  }
}

export function createFluentSender(
  options: SenderOptions,
): Sender {
  return new FluentSender(options);
}
