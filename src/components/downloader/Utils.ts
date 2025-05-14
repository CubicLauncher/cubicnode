import fs from "fs/promises";
import { createWriteStream, unlinkSync } from "node:fs";
import path from "node:path";
import { Readable } from "stream";

export async function download_file(
  url: string,
  dir: string,
  name: string,
): Promise<void> {
  try {
    const filePath = path.join(dir, name);
    await fs.mkdir(dir, { recursive: true });

    return new Promise((resolve, reject) => {
      const file = createWriteStream(filePath);

      fetch(url, { signal: AbortSignal.timeout(10000) })
        .then((response) => {
          if (!response.ok)
            throw new Error(`HTTP error! Status: ${response.status}`);
          Readable.fromWeb(response.body).pipe(file);

          file.on("finish", () => file.close(() => resolve()));
          file.on("error", (err) => {
            file.close();
            reject(err);
          });
        })
        .catch((err) => {
          file.close();
          reject(err);
        });
    });
  } catch (error) {
    console.error("Download error:", error);
    throw error;
  }
}
