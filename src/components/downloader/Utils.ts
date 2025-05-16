/*! Cubic Neutron
 * ©2025 Cubic Neutron - https://github.com/CubicLauncher
 * src/components/downloader/Utils.ts
 */
import fs from "fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import type { ReadableStream as NodeWebStream } from "node:stream/web";
import { pipeline } from "node:stream/promises";

/**
 *  Descarga un archivo desde una url y lo guarda en un directorio con un nombre dado.
 */
export async function download_file(
  url: string,
  dir: string,
  name: string,
): Promise<void> {
  const filePath = path.join(dir, name);
  await fs.mkdir(dir, { recursive: true });

  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!response.body) throw new Error("Response body is null");

  const webStream = response.body as unknown as NodeWebStream<Uint8Array>;

  await pipeline(Readable.fromWeb(webStream), createWriteStream(filePath));
}
