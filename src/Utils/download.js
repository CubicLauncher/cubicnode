/*!
CubicNode v1.0.0
Docs & License: https://github.com/CubicLauncher/cubicnode
Source: https://github.com/dani-adbg/adlauncher-core/
(c) 2025 CubicLauncher
*/

const { get, globalAgent } = require('node:https');
const { join } = require('node:path');
const { createWriteStream } = require('node:fs');

globalAgent.maxSockets = 5;

module.exports = function download({ url, dir, name }) {
  return new Promise((resolve, reject) => {
    const req = get(url, { timeout: 50000 }, (res) => {
      const filePath = join(dir, name);
      const writeToFile = createWriteStream(filePath);
      res.pipe(writeToFile);

      writeToFile.on('finish', resolve);

      writeToFile.on('error', reject);
    });

    req.on('error', reject);
  });
};
