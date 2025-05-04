/*! Cubic Neutron
 * ©2025 Cubic Neutron - https://github.com/CubicLauncher
*/

import fs from 'fs/promises';
import { createWriteStream, unlinkSync } from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import AdmZip from 'adm-zip';
import { Readable } from 'stream';

const shownNumbers = new Set();

class Downloader {
  constructor() {
    this.url = {
      meta: 'https://launchermeta.mojang.com/mc/game/version_manifest.json',
      resource: 'https://resources.download.minecraft.net',
    };
    this.cache = 'cache';
    this.versions = 'versions';
    this.assets = 'assets';
    this.libraries = 'libraries';
    this.natives = 'natives';
    this.emisor = new EventEmitter();
  }

  async down(url, dir, name) {
    try {
      const filePath = path.join(dir, name);
      await fs.mkdir(dir, { recursive: true });

      return new Promise((resolve, reject) => {
        const file = createWriteStream(filePath);

        fetch(url, { signal: AbortSignal.timeout(10000) })
          .then(response => {
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            Readable.fromWeb(response.body).pipe(file);

            file.on('finish', () => file.close(() => resolve()));
            file.on('error', err => {
              file.close();
              reject(err);
            });
          })
          .catch(err => {
            file.close();
            reject(err);
          });
      });
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  }

  getVersions(type) {
    return new Promise((resolve, reject) => {
      fetch(this.url.meta)
        .then(response => {
          if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
          return response.json();
        })
        .then(data => {
          switch (type) {
            case 'vanilla':
              resolve(data.versions.filter(x => x.type === 'release'));
              break;
            case 'snapshot':
              resolve(data.versions.filter(x => x.type === 'snapshot'));
              break;
            case 'old_alpha':
              resolve(data.versions.filter(x => x.type === 'old_alpha'));
              break;
            default:
              reject(new Error("Tipo de versión no válido. Usa 'vanilla', 'snapshot' o 'old_alpha'."));
          }
        })
        .catch(reject);
    });
  }

  async #downloadVersion() {
    this.emisor.emit('downloadFiles', 'Downloading main files.');

    const cacheDir = path.join(this.root, this.cache, 'json');
    await fs.mkdir(cacheDir, { recursive: true });

    await this.down(this.url.meta, cacheDir, 'version_manifest.json');

    const manifestData = await fs.readFile(path.join(cacheDir, 'version_manifest.json'), 'utf-8');
    const manifest = JSON.parse(manifestData);
    const versionInfo = manifest.versions.find(x => x.id === this.version);

    if (!versionInfo) {
      const available = manifest.versions.slice(0, 10).map(v => v.id).join(', ');
      throw new Error(`La versión "${this.version}" no existe. Algunas versiones disponibles: ${available}...`);
    }

    const versionDir = path.join(this.root, this.versions, this.version);
    await fs.mkdir(versionDir, { recursive: true });

    await this.down(versionInfo.url, versionDir, `${this.version}.json`);
  }

  async #downloadClient() {
    this.emisor.emit('downloadFiles', 'Downloading client.');

    const filePath = path.join(this.root, this.versions, this.version, `${this.version}.json`);
    const fileData = await fs.readFile(filePath, 'utf-8');
    this.file = JSON.parse(fileData);

    const clientUrl = this.file.downloads.client.url;
    await this.down(clientUrl, path.join(this.root, this.versions, this.version), `${this.version}.jar`);
  }

  async #downloadAssets() {
    this.emisor.emit('downloadFiles', 'Downloading assets.');

    const indexDir = path.join(this.root, this.assets, 'indexes');
    await fs.mkdir(indexDir, { recursive: true });

    const cacheJsonDir = path.join(this.root, this.cache, 'json');
    const assetIndexUrl = this.file.assetIndex.url;
    const totalSize = this.file.assetIndex.totalSize;

    await this.down(assetIndexUrl, indexDir, `${this.version}.json`);
    await this.down(assetIndexUrl, cacheJsonDir, `${this.version}.json`);

    const assetFileData = await fs.readFile(path.join(indexDir, `${this.version}.json`), 'utf-8');
    const assetFile = JSON.parse(assetFileData);
    const objectsDir = path.join(this.root, this.assets, 'objects');
    await fs.mkdir(objectsDir, { recursive: true });

    let size = 0;

    for (const [key, fileInfo] of Object.entries(assetFile.objects)) {
      const fileSize = fileInfo.size;
      const fileHash = fileInfo.hash;
      const fileSubHash = fileHash.substring(0, 2);
      const fileDir = path.join(objectsDir, fileSubHash);
      await fs.mkdir(fileDir, { recursive: true });

      await this.down(`${this.url.resource}/${fileSubHash}/${fileHash}`, fileDir, fileHash);

      size += fileSize;
      const percentage = Math.floor((size / totalSize) * 100);
      if (!shownNumbers.has(percentage)) {
        this.emisor.emit('percentDownloaded', `${percentage}`);
        shownNumbers.add(percentage);
      }
    }
  }

  async #downloadNatives() {
    this.emisor.emit('downloadFiles', 'Downloading natives.');

    const nativesDir = path.join(this.root, this.natives);
    await fs.mkdir(nativesDir, { recursive: true });

    for (const lib of this.file.libraries) {
      const classifiers = lib.downloads?.classifiers;
      const native = classifiers?.['natives-windows'] || classifiers?.['natives-windows-64'];

      if (native) {
        const zipPath = path.join(nativesDir, path.basename(native.path));
        await this.down(native.url, nativesDir, path.basename(native.path));

        if (this.version === '1.8' && native.url.includes('nightly')) {
          unlinkSync(zipPath);
          continue;
        }

        const zip = new AdmZip(zipPath);
        zip.extractAllTo(path.join(nativesDir, this.version), true);
        unlinkSync(zipPath);
      }
    }
  }

  async #downloadLibraries() {
    this.emisor.emit('downloadFiles', 'Downloading libraries.');

    const libBaseDir = path.join(this.root, this.libraries);
    await fs.mkdir(libBaseDir, { recursive: true });

    for (const lib of this.file.libraries) {
      if (lib.downloads?.artifact) {
        const artifact = lib.downloads.artifact;
        const parts = artifact.path.split('/');
        parts.pop();
        const libDir = path.join(libBaseDir, ...parts);
        await fs.mkdir(libDir, { recursive: true });
        await this.down(artifact.url, libDir, path.basename(artifact.path));
      }
    }
  }

  emit(event, ...args) {
    this.emisor.emit(event, ...args);
  }

  on(event, callback) {
    this.emisor.on(event, callback);
  }

  async download(version, root) {
    this.version = version;
    this.root = root;

    if (!version) throw new Error("No version provided");

    await this.#downloadVersion();
    this.emisor.emit('downloadFiles', `Minecraft ${version} is now downloading.`);
    await this.#downloadClient();
    this.emisor.emit('downloadFiles', 'Client downloaded.');
    await this.#downloadAssets();
    this.emisor.emit('downloadFiles', 'Assets downloaded.');
    await this.#downloadLibraries();
    this.emisor.emit('downloadFiles', 'Libraries downloaded.');
    await this.#downloadNatives();
    this.emisor.emit('downloadFiles', 'Natives downloaded.');
    this.emisor.emit('downloadFiles', 'All files are downloaded.');

    this.emisor.removeAllListeners('downloadFiles');
    this.emisor.removeAllListeners('percentDownloaded');
    shownNumbers.clear();
  }
}

export default Downloader;
