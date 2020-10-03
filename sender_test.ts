import { assertEquals } from "./test_deps.ts";
import { suite, waitFor } from "./test_utils.ts";
import { createFluentSender } from "./sender.ts";

suite("sender", ({ test, todo, server }) => {
  test("simple", async () => {
    const tagPrefix = "foo";
    const sender = createFluentSender({
      tagPrefix,
      port: server.port,
    });
    try {
      const tag = "bar";
      await sender.post(tag, { "name": "bob" });
      await waitFor(() => {
        const data = server.getRecievedData();
        assertEquals(data.length, 1);
        assertEquals(data[0][0], "foo.bar");
        assertEquals(typeof data[0][1], "number");
        assertEquals(data[0][2], { "name": "bob" });
      });
    } finally {
      sender.close();
    }
  });

  todo("concurrent");
  todo("tls");
  todo("unix socket");
});
