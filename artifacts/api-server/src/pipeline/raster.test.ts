import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, test } from "node:test";
import { openRaster, parseLabel, readWindow } from "./raster.ts";

const servers: ReturnType<typeof createServer>[] = [];

after(async () => {
  await Promise.all(servers.map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  })));
});

async function serveRaster(label: string, data: Buffer): Promise<string> {
  const server = createServer((req, res) => {
    if (req.url === "/tile.lbl") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end(label);
      return;
    }

    if (req.url !== "/tile.img" || req.headers.range === undefined) {
      res.writeHead(404);
      res.end();
      return;
    }

    const range = /^bytes=(\d+)-(\d+)$/.exec(req.headers.range);
    if (!range) {
      res.writeHead(416);
      res.end();
      return;
    }
    const start = Number(range[1]);
    const end = Number(range[2]);
    const chunk = data.subarray(start, end + 1);
    res.writeHead(206, {
      "content-range": `bytes ${start}-${end}/${data.length}`,
      "content-length": chunk.length,
    });
    res.end(chunk);
  });
  servers.push(server);

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return `http://127.0.0.1:${address.port}/tile.img`;
}

test("parseLabel keeps the first field and preserves requested units", () => {
  const label = [
    "MAP_SCALE = 240 <m/pixel>",
    "MAP_SCALE = 1 <km/pixel>",
    "PRODUCT_ID = 'LOLA_TEST'",
    "NOTE = this is not a flat field",
  ].join("\n");

  assert.deepEqual(parseLabel(label), {
    MAP_SCALE: "240",
    PRODUCT_ID: "LOLA_TEST",
    NOTE: "this is not a flat field",
  });
  assert.equal(parseLabel(label, true).MAP_SCALE, "240 m/pixel");
});

test("openRaster verifies dimensions and readWindow scales big-endian samples and masks missing pixels", async () => {
  const data = Buffer.alloc(8);
  data.writeInt16BE(10, 0);
  data.writeInt16BE(-32768, 2);
  data.writeInt16BE(-5, 4);
  data.writeInt16BE(20, 6);
  const url = await serveRaster([
    "LINES = 2",
    "LINE_SAMPLES = 2",
    "SAMPLE_BITS = 16",
    "SAMPLE_TYPE = MSB_INTEGER",
    "SCALING_FACTOR = 0.02",
    "OFFSET = 1",
    "MISSING_CONSTANT = -32768",
    "MAP_SCALE = 240 <m/pixel>",
  ].join("\n"), data);

  const raster = await openRaster(url, { lines: 2, samples: 2, kind: "int16be" });
  assert.equal(raster.pixelSize, "240 m/pixel");
  assert.deepEqual(Array.from((await readWindow(raster, 0, 0, 2, 2)).data).map((n) =>
    Number.isNaN(n) ? "missing" : Math.round(n * 100) / 100,
  ), [1.2, "missing", 0.9, 1.4]);
  await assert.rejects(readWindow(raster, 1, 1, 2, 1), /falls outside/);
});

test("readWindow decodes little-endian integers and float32 values", async (t) => {
  const cases = [
    {
      name: "int16le",
      type: "LSB_INTEGER",
      bits: 16,
      data: Buffer.from([0x34, 0x12]),
      expected: 0x1234,
    },
    {
      name: "float32le",
      type: "PC_REAL",
      bits: 32,
      data: Buffer.alloc(4),
      expected: 12.5,
    },
  ] as const;
  cases[1].data.writeFloatLE(12.5, 0);

  for (const sample of cases) {
    await t.test(sample.name, async () => {
      const url = await serveRaster([
        "LINES = 1",
        "LINE_SAMPLES = 1",
        `SAMPLE_BITS = ${sample.bits}`,
        `SAMPLE_TYPE = ${sample.type}`,
      ].join("\n"), sample.data);
      const raster = await openRaster(url);
      assert.equal(raster.kind, sample.name);
      assert.equal((await readWindow(raster, 0, 0, 1, 1)).data[0], sample.expected);
    });
  }
});

test("openRaster rejects a declared size that disagrees with the label", async () => {
  const url = await serveRaster([
    "LINES = 2",
    "LINE_SAMPLES = 2",
    "SAMPLE_BITS = 16",
    "SAMPLE_TYPE = LSB_INTEGER",
  ].join("\n"), Buffer.alloc(2));

  await assert.rejects(openRaster(url), /size 2 bytes does not match label/);
});
