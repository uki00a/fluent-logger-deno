import msgpack from "https://cdn.skypack.dev/@msgpack/msgpack@^1.12.2";
export const MsgpackEncoder = msgpack.Encoder;
export const MsgpackDecoder = msgpack.Decoder;
export const encodeMsgpack = msgpack.encode;
export const decodeMsgpackAsync = msgpack.decodeAsync;
export const decodeMsgpack = msgpack.decode;
export { BufReader, BufWriter } from "https://deno.land/std@0.71.0/io/bufio.ts";
