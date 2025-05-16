/*! Cubic Neutron
 * ©2025 Cubic Neutron - https://github.com/CubicLauncher
 * src/others/Manifest.ts
 */

import { MojangUrls } from "../others/constants";
import { mkdir, writeFile, access, constants } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchManifest(): Promise<any> {
  try {
    const res = await axios.get(MojangUrls.meta);
    return res;
  } catch (error) {
    throw new Error(`Error al obtener el manifiesto: ${error}`);
  }
}

export async function getVersions(type: VersionType): Promise<VersionInfo[]> {
  const res = await fetchManifest();

  if (res.status !== 200) {
    throw new Error(`HTTP error! Status: ${res.status}`);
  }

  const data = res.data as Manifest;

  switch (type) {
    case "release":
    case "snapshot":
    case "old_alpha":
      return data.versions.filter((x) => x.type === type);
    default:
      throw new Error("Tipo de versión no válido.");
  }
}

export async function getManifestCached(cacheDir: string) {
  const res = await fetchManifest();
  const manifestData = res.data;
  const ManifestContent = JSON.stringify(manifestData, null, 2);

  // Resolviendo la ruta absoluta para el archivo
  const filePath = path.resolve(__dirname, cacheDir);

  try {
    await access(path.dirname(filePath), constants.F_OK); // Chequeo si el directorio existe
  } catch {
    // Si el directorio no existe, lo creamos
    await mkdir(path.dirname(filePath), { recursive: true });
  }

  await writeFile(filePath, ManifestContent, "utf-8");
}
