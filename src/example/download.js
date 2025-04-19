const { downloadMinecraft } = require('../index.js');

downloadMinecraft({
  root: './minecraft', // RUTA DEL JUEGO
  version: '1.8', // VERSION A DESCARGAR
  type: 'release', // TIPO DE VERSION (release - snapshot)
});