/*!
CubicNode v1.0.0
Docs & License: https://github.com/CubicLauncher/cubicnode
Source: https://github.com/dani-adbg/adlauncher-core/
(c) 2025 CubicLauncher
*/

function filterVersionLib(libraries) {
  if (
    (libraries.includes('asm-9.3.jar') && libraries.includes('asm-9.7.jar')) ||
    (libraries.includes('asm-9.3.jar') && libraries.includes('asm-9.7.1.jar'))
  ) {
    let index = libraries.indexOf('asm-9.3.jar');

    libraries.splice(index, 1);
  }

  return libraries;
}

module.exports = filterVersionLib;
