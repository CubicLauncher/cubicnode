/*!
CubicNode v1.0.0
Docs & License: https://github.com/CubicLauncher/cubicnode
Source: https://github.com/dani-adbg/adlauncher-core/
(c) 2025 CubicLauncher
*/

const download = require('../Utils/download.js');
const { basename, resolve } = require('node:path');
const { existsSync, mkdirSync, unlinkSync } = require('node:fs');
const Zip = require('adm-zip');

module.exports = async function nativesDownloader({ root, version, libraries }) {
  const dir = resolve(root, 'natives');
  const natives = libraries
    .filter(
      (lib) =>
        lib.downloads.classifiers &&
        lib.downloads.classifiers['natives-windows' || 'natives-windows-64']
    )
    .map((nat) => {
      const { url, path } = nat.downloads.classifiers['natives-windows' || 'natives-windows-64'];
      return {
        url: url,
        path: basename(path),
      };
    });

  try {
    console.log('Preparando archivos nativos...');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    
    for (const native of natives) {
      if (version === '1.8' && native.url.includes('nightly')) continue;

      const filePath = resolve(dir, native.path);
      await download({ url: native.url, dir: dir, name: native.path });
      
      try {
        const zip = new Zip(filePath);
        await new Promise((resolve, reject) => {
          zip.extractAllToAsync(resolve(dir, version), true, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        unlinkSync(filePath);
      } catch (extractError) {
        console.error(`Error al extraer ${native.path}:`, extractError);
        throw extractError;
      }
    }
  } catch (error) {
    console.error('Error al descargar archivo nativo:\n', error);
    throw error;
  }
};
