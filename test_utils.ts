import { decodeMsgpack, decodeMsgpackAsync } from "./deps.ts";
import { deferred } from "./test_deps.ts";

type Message = [
  string, // tag
  string, // time
  Record<string, unknown>, // record
];

interface MockServer {
  port: number;
  listen(): void;
  close(): Promise<void>;
  reset(): void;
  getRecievedData(): Array<Message>;
}

/**
 * @see https://github.com/fluent/fluentd/wiki/Forward-Protocol-Specification-v1
 */
function createMockServer(port = 24224): MockServer {
  const listener = Deno.listen({ port });
  const listenerPromise = deferred<void>();
  let receivedData = [] as Array<Message>;

  function listen(): void {
    (async () => {
      for await (const conn of listener) {
        const buf = new Uint8Array(15000); // FIXME
        const bytesRead = await conn.read(buf);
        receivedData.push(
          decodeMsgpack(buf.subarray(
            0,
            typeof bytesRead === "number" ? bytesRead : 0,
          )),
        );
        conn.close();
      }
      listenerPromise.resolve();
    })();
  }

  function reset(): void {
    receivedData = [];
  }

  function close(): Promise<void> {
    listener.close();
    return listenerPromise;
  }

  function getRecievedData(): Array<Message> {
    return receivedData;
  }

  return {
    port,
    listen,
    reset,
    close,
    getRecievedData,
  };
}

interface TestSuite {
  test(name: string, fn: () => Promise<void> | void): void;
  todo(name: string): void;
  server: MockServer;
}

function noop(): void {}

export function suite(
  description: string,
  suite: (testSuite: TestSuite) => void,
): void {
  const testCases = [] as Array<Deno.TestDefinition>;
  const server = createMockServer();

  function todo(name: string): void {
    testCases.push({ name, fn: noop, ignore: true });
  }

  function test(name: string, fn: () => Promise<void> | void): void {
    testCases.push({ name, fn });
  }

  function hook(name: string, fn: () => Promise<void> | void): void {
    testCases.push({
      name,
      fn,
      sanitizeOps: false,
      sanitizeResources: false,
    });
  }

  function defineTests(): void {
    for (const testCase of testCases) {
      defineTest(testCase);
    }
  }

  function defineTest(testCase: Deno.TestDefinition): void {
    const { name, fn, ...options } = testCase;
    Deno.test({
      name: `[${description}] ${name}`,
      async fn() {
        server.reset();
        await fn();
      },
      ...options,
    });
  }

  function setup(): void {
    server.listen();
  }

  function cleanup(): Promise<void> {
    return server.close();
  }

  hook("beforeAll", setup);
  suite({ test, todo, server });
  hook("afterAll", cleanup);
  defineTests();
}

export function waitFor<T>(predicate: () => Promise<T> | T): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let lastError: unknown | null = null;
    const intervalID = setInterval(async () => {
      try {
        const result = await predicate();
        cleanup();
        resolve(result);
      } catch (error) {
        lastError = error;
      }
    }, 50);
    const timeoutID = setTimeout(cancel, 2000);

    function cleanup(): void {
      clearInterval(intervalID);
      clearTimeout(timeoutID);
    }

    function cancel(): void {
      cleanup();
      reject(lastError || new Error("timeout"));
    }
  });
}
