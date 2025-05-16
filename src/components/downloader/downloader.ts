/*! Cubic Neutron
 * ©2025 Cubic Neutron - https://github.com/CubicLauncher
 */

import fs from "fs/promises";
import { unlinkSync } from "fs";
import path from "path";
import { EventEmitter } from "events";
import AdmZip from "adm-zip";
import { download_file } from "./Utils";
import { MojangUrls } from "../others/constants";

const shownNumbers = new Set();

interface IDownloader {
  url: MojangUrl;
  cache: string;
  versions: string;
  version: string;
  assets: string;
  libraries: string;
  natives: string;
  emisor: EventEmitter;
  root: string;
  file: MinecraftVersionManifest;
}

interface Events {
  downloadFiles: (message: string) => void;
  percentDownloaded: (percentage: string) => void;
}

type EventName = keyof Events;
type EventArgs<E extends EventName> = Parameters<Events[E]>;

class Downloader implements IDownloader {
  url: MojangUrl;
  cache: string;
  versions: string;
  version: string;
  assets: string;
  libraries: string;
  natives: string;
  emisor: EventEmitter;
  root: string;
  file: MinecraftVersionManifest;

  constructor(MinecraftDir: string) {
    this.root = MinecraftDir;
    this.url = MojangUrls;
    this.cache = path.resolve(MinecraftDir, "cache");
    this.versions = path.resolve(MinecraftDir, "versions");
    this.assets = path.resolve(MinecraftDir, "assets");
    this.libraries = path.resolve(MinecraftDir, "libraries");
    this.natives = path.resolve(MinecraftDir, "natives");
    this.emisor = new EventEmitter();
    this.version = "";

    // Inicialización segura del objeto `file`
    this.file = {
      arguments: {
        game: [],
        jvm: [],
      },
      assetIndex: {
        id: "",
        hash: "",
        size: 0,
        totalSize: 1,
        url: "",
      },
      assets: "",
      complianceLevel: 0,
      downloads: {
        client: { sha1: "", size: 0, url: "" },
        client_mappings: { sha1: "", size: 0, url: "" },
        server: { sha1: "", size: 0, url: "" },
        server_mappings: { sha1: "", size: 0, url: "" },
      },
      id: "",
      javaVersion: {
        component: "",
        majorVersion: 8,
      },
      libraries: [],
    };
  }

  private async downloadVersion() {
    this.emisor.emit("downloadFiles", "Downloading main files.");

    const cacheDir = path.join(this.cache, "json");
    await fs.mkdir(cacheDir, { recursive: true });

    await download_file(this.url.meta, cacheDir, "version_manifest.json");

    const manifestData = await fs.readFile(
      path.join(cacheDir, "version_manifest.json"),
      "utf-8",
    );
    const manifest = JSON.parse(manifestData);
    const versionInfo = manifest.versions.find(
      (version: VersionInfo) => version.id === this.version,
    );

    if (!versionInfo) {
      const available = manifest.versions
        .slice(0, 10)
        .map((Version: VersionInfo) => Version.id)
        .join(", ");
      throw new Error(
        `La versión "${this.version}" no existe. Algunas versiones disponibles: ${available}...`,
      );
    }

    const versionDir = path.join(this.versions, this.version);
    await fs.mkdir(versionDir, { recursive: true });

    await download_file(versionInfo.url, versionDir, `${this.version}.json`);
  }

  private async downloadClient() {
    this.emisor.emit("downloadFiles", "Downloading client.");

    const filePath = path.join(
      this.versions,
      this.version,
      `${this.version}.json`,
    );
    const fileData = await fs.readFile(filePath, "utf-8");
    this.file = JSON.parse(fileData);

    const clientUrl = this.file.downloads.client.url;
    await download_file(
      clientUrl,
      path.join(this.versions, this.version),
      `${this.version}.jar`,
    );
  }

  private async downloadAssets() {
    this.emisor.emit("downloadFiles", "Downloading assets.");

    const indexDir = path.join(this.assets, "indexes");
    await fs.mkdir(indexDir, { recursive: true });

    const cacheJsonDir = path.join(this.cache, "json");
    const assetIndexUrl = this.file.assetIndex.url;
    const totalSize = this.file.assetIndex.totalSize;

    await download_file(
      assetIndexUrl,
      indexDir,
      `${this.file.assetIndex.id || this.version}.json`,
    );
    await download_file(
      assetIndexUrl,
      cacheJsonDir,
      `${this.file.assetIndex.id || this.version}.json`,
    );

    const assetFileData = await fs.readFile(
      path.join(indexDir, `${this.file.assetIndex.id || this.version}.json`),
      "utf-8",
    );
    const assetFile = JSON.parse(assetFileData) as AssetFile;
    const objectsDir = path.join(this.assets, "objects");
    await fs.mkdir(objectsDir, { recursive: true });

    let size = 0;

    // Verify that assetFile.objects exists and is an object
    if (!assetFile.objects || typeof assetFile.objects !== "object") {
      throw new Error(
        `Invalid asset file structure. Expected 'objects' property but got: ${JSON.stringify(assetFile)}`,
      );
    }

    for (const [key, fileInfo] of Object.entries(assetFile.objects)) {
      // Add validation for fileInfo structure
      if (!fileInfo || typeof fileInfo !== "object") {
        console.warn(
          `Skipping invalid asset entry for key "${key}": ${JSON.stringify(fileInfo)}`,
        );
        continue;
      }

      const fileSize = fileInfo.size;
      const fileHash = fileInfo.hash;
      // Add validation for fileHash
      if (!fileHash || typeof fileHash !== "string") {
        console.warn(
          `Skipping asset with invalid hash for key "${key}": ${JSON.stringify(fileInfo)}`,
        );
        continue;
      }

      const fileSubHash = fileHash.substring(0, 2);
      const fileDir = path.join(objectsDir, fileSubHash);
      await fs.mkdir(fileDir, { recursive: true });

      try {
        await download_file(
          `${this.url.resource}/${fileSubHash}/${fileHash}`,
          fileDir,
          fileHash,
        );

        // Only add to size if we have a valid number
        if (typeof fileSize === "number" && !isNaN(fileSize)) {
          size += fileSize;

          if (totalSize > 0) {
            const percentage = Math.floor((size / totalSize) * 100);
            if (
              !shownNumbers.has(percentage) &&
              percentage >= 0 &&
              percentage <= 100
            ) {
              this.emisor.emit("percentDownloaded", `${percentage}`);
              shownNumbers.add(percentage);
            }
          }
        }
      } catch (error) {
        console.error(`Error downloading asset ${key} (${fileHash}): ${error}`);
      }
    }
  }

  private async downloadNatives() {
    this.emisor.emit("downloadFiles", "Downloading natives.");
    const nativesDir = path.join(this.natives);
    await fs.mkdir(nativesDir, { recursive: true });

    // Determine the platform-specific classifier to use
    const platform = process.platform;
    let nativeClassifier = "";

    if (platform === "win32") {
      nativeClassifier =
        process.arch === "x64" ? "natives-windows-64" : "natives-windows";
    } else if (platform === "darwin") {
      nativeClassifier =
        process.arch === "arm64" ? "natives-macos-arm64" : "natives-macos";
    } else if (platform === "linux") {
      nativeClassifier = "natives-linux";
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    // Fallback classifiers for older versions
    const fallbackClassifiers = {
      win32: ["natives-windows", "natives-windows-64"],
      darwin: ["natives-osx", "natives-macos"],
      linux: ["natives-linux", "natives-linux-64"],
    };

    for (const lib of this.file.libraries) {
      // Skip if lib.downloads is undefined
      if (!lib.downloads) continue;

      const classifiers = lib.downloads.classifiers;
      if (!classifiers) continue;

      let native = classifiers[nativeClassifier];

      if (!native && platform in fallbackClassifiers) {
        for (const fallbackClassifier of fallbackClassifiers[platform]) {
          if (classifiers[fallbackClassifier]) {
            native = classifiers[fallbackClassifier];
            break;
          }
        }
      }

      if (native && native.url && native.path) {
        const zipPath = path.join(nativesDir, path.basename(native.path));

        try {
          await download_file(
            native.url,
            nativesDir,
            path.basename(native.path),
          );

          // Special case for version 1.8 with nightly builds
          if (this.version === "1.8" && native.url.includes("nightly")) {
            try {
              unlinkSync(zipPath);
            } catch (error) {
              console.warn(`Failed to delete ${zipPath}: ${error}`);
            }
            continue;
          }

          try {
            const zip = new AdmZip(zipPath);
            const targetDir = path.join(nativesDir, this.version);
            await fs.mkdir(targetDir, { recursive: true });
            zip.extractAllTo(targetDir, true);
            unlinkSync(zipPath);
          } catch (error) {
            console.error(
              `Error extracting native library ${zipPath}: ${error}`,
            );
          }
        } catch (error) {
          console.error(
            `Error downloading native library ${native.url}: ${error}`,
          );
        }
      }
    }
  }

  private async downloadLibraries() {
    this.emisor.emit("downloadFiles", "Downloading libraries.");

    const libBaseDir = path.join(this.libraries);
    await fs.mkdir(libBaseDir, { recursive: true });

    for (const lib of this.file.libraries) {
      if (
        lib.downloads?.artifact &&
        lib.downloads.artifact.url &&
        lib.downloads.artifact.path
      ) {
        const artifact = lib.downloads.artifact;
        const parts = artifact.path.split("/");
        parts.pop();
        const libDir = path.join(libBaseDir, ...parts);

        try {
          await fs.mkdir(libDir, { recursive: true });
          await download_file(
            artifact.url,
            libDir,
            path.basename(artifact.path),
          );
        } catch (error) {
          console.error(`Error downloading library ${artifact.path}: ${error}`);
        }
      }
    }
  }

  emit<E extends EventName>(event: E, ...args: EventArgs<E>): boolean {
    return this.emisor.emit(event, ...args);
  }

  on<E extends EventName>(event: E, listener: Events[E]): this {
    this.emisor.on(event, listener);
    return this;
  }

  async download(version: string) {
    this.version = version;

    if (!version) throw new Error("No version provided");

    try {
      await this.downloadVersion();
      this.emisor.emit(
        "downloadFiles",
        `Minecraft ${version} is now downloading.`,
      );
      await this.downloadClient();
      this.emisor.emit("downloadFiles", "Client downloaded.");
      await this.downloadAssets();
      this.emisor.emit("downloadFiles", "Assets downloaded.");
      await this.downloadLibraries();
      this.emisor.emit("downloadFiles", "Libraries downloaded.");
      await this.downloadNatives();
      this.emisor.emit("downloadFiles", "Natives downloaded.");
      this.emisor.emit("downloadFiles", "All files are downloaded.");
    } catch (error) {
      this.emisor.emit("downloadFiles", `Error during download: ${error}`);
      console.error("Download failed:", error);
      throw error;
    } finally {
      this.emisor.removeAllListeners("downloadFiles");
      this.emisor.removeAllListeners("percentDownloaded");
      shownNumbers.clear();
    }
  }
}

export default Downloader;
