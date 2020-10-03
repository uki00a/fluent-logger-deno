import { createFluentSender } from "./mod.ts";

const sender = createFluentSender({
  hostname: "localhost",
  port: 24224,
  tagPrefix: "docker",
});
await sender.post("test", { foo: "bar" });
