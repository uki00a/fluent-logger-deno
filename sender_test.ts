import { assertEquals, faker } from "./test_deps.ts";
import { suite, waitFor } from "./test_utils.ts";
import { createFluentSender } from "./sender.ts";

suite("sender", ({ test, todo, server }) => {
  test("simple", async () => {
    const tagPrefix = faker.random.word();
    const sender = createFluentSender({
      tagPrefix,
      port: server.port,
    });
    try {
      const tag = faker.random.word();
      const event = { "name": faker.name.findName() };
      await sender.post(tag, { ...event });
      await waitFor(() => {
        const data = server.getRecievedData();
        assertEquals(data.length, 1);
        assertEquals(data[0][0], `${tagPrefix}.${tag}`);
        assertEquals(typeof data[0][1], "number");
        assertEquals(data[0][2], event);
      });
    } finally {
      sender.close();
    }
  });

  todo("concurrent");
  todo("tls");
  todo("unix socket");
});
