/*! Cubic Neutron
 * ©2025 Cubic Neutron - https://github.com/CubicLauncher
 */

import fs from "fs/promises";
import { createWriteStream, unlinkSync } from "fs";
import path from "path";
import { EventEmitter } from "events";
import AdmZip from "adm-zip";
import { Readable } from "stream";
import { download_file } from "./Utils";
import { MojangUrls } from "../others/constants";

const shownNumbers = new Set();

interface Downloader {
  url: MojangUrl;
  file: any;
  cache: string;
  versions: string;
  assets: string;
  libraries: string;
  natives: string;
  emisor: EventEmitter;
  root: string;
  version: string;
}

class Downloader {
  constructor(MinecraftDir: string) {
    this.root = MinecraftDir;
    this.url = MojangUrls;
    this.cache = path.resolve(MinecraftDir, "cache");
    this.versions = path.resolve(MinecraftDir, "versions");
    this.assets = path.resolve(MinecraftDir, "assets");
    this.libraries = path.resolve(MinecraftDir, "libraries");
    this.natives = path.resolve(MinecraftDir, "natives");
    this.emisor = new EventEmitter();
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
    const versionInfo = manifest.versions.find((x) => x.id === this.version);

    if (!versionInfo) {
      const available = manifest.versions
        .slice(0, 10)
        .map((v) => v.id)
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

    await download_file(assetIndexUrl, indexDir, `${this.version}.json`);
    await download_file(assetIndexUrl, cacheJsonDir, `${this.version}.json`);

    const assetFileData = await fs.readFile(
      path.join(indexDir, `${this.version}.json`),
      "utf-8",
    );
    const assetFile = JSON.parse(assetFileData);
    const objectsDir = path.join(this.assets, "objects");
    await fs.mkdir(objectsDir, { recursive: true });

    let size = 0;

    for (const [key, fileInfo] of Object.entries(assetFile.objects)) {
      const fileSize = fileInfo.size;
      const fileHash = fileInfo.hash;
      const fileSubHash = fileHash.substring(0, 2);
      const fileDir = path.join(objectsDir, fileSubHash);
      await fs.mkdir(fileDir, { recursive: true });

      await download_file(
        `${this.url.resource}/${fileSubHash}/${fileHash}`,
        fileDir,
        fileHash,
      );

      size += fileSize;
      const percentage = Math.floor((size / totalSize) * 100);
      if (!shownNumbers.has(percentage)) {
        this.emisor.emit("percentDownloaded", `${percentage}`);
        shownNumbers.add(percentage);
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
      const classifiers = lib.downloads?.classifiers;
      if (!classifiers) continue;

      // Try to find the native for the current platform
      let native = classifiers[nativeClassifier];

      // If not found, try fallbacks for the platform
      if (!native && fallbackClassifiers[platform]) {
        for (const fallbackClassifier of fallbackClassifiers[platform]) {
          if (classifiers[fallbackClassifier]) {
            native = classifiers[fallbackClassifier];
            break;
          }
        }
      }

      if (native) {
        const zipPath = path.join(nativesDir, path.basename(native.path));
        await download_file(native.url, nativesDir, path.basename(native.path));

        // Special case for version 1.8 with nightly builds
        if (this.version === "1.8" && native.url.includes("nightly")) {
          unlinkSync(zipPath);
          continue;
        }

        const zip = new AdmZip(zipPath);
        zip.extractAllTo(path.join(nativesDir, this.version), true);
        unlinkSync(zipPath);
      }
    }
  }

  private async downloadLibraries() {
    this.emisor.emit("downloadFiles", "Downloading libraries.");

    const libBaseDir = path.join(this.libraries);
    await fs.mkdir(libBaseDir, { recursive: true });

    for (const lib of this.file.libraries) {
      if (lib.downloads?.artifact) {
        const artifact = lib.downloads.artifact;
        const parts = artifact.path.split("/");
        parts.pop();
        const libDir = path.join(libBaseDir, ...parts);
        await fs.mkdir(libDir, { recursive: true });
        await download_file(artifact.url, libDir, path.basename(artifact.path));
      }
    }
  }

  emit(event, ...args) {
    this.emisor.emit(event, ...args);
  }

  on(event, callback) {
    this.emisor.on(event, callback);
  }

  async download(version: string) {
    this.version = version;

    if (!version) throw new Error("No version provided");

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

    this.emisor.removeAllListeners("downloadFiles");
    this.emisor.removeAllListeners("percentDownloaded");
    shownNumbers.clear();
  }
}

export default Downloader;
