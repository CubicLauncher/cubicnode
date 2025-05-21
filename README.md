# Cubic Neutron

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/cubic-neutron.svg)](https://badge.fury.io/js/cubic-neutron)

Un módulo Node.js que permite la descarga y ejecución de Minecraft Java Edition de manera programática.

## 📋 Características

- Descarga de Minecraft Java Edition
- Soporte para diferentes versiones de Minecraft
- Integración con Optifine, Forge y Fabric
- Gestión de perfiles de usuario
- simple y fácil de usar

## 🚀 Instalación

```bash
npm install cubic-neutron
```

## 📦 Uso

### Descargar Minecraft

```javascript
const { Downloader } = require('cubic-neutron');
const downloader = new Downloader('./minecraft')

downloader.download('1.16.5')
```

## Eventos del downloader
Neutron ofrece varios eventos para rastrear el progreso de instalacion de una version, por ahora existen 2.

# downloadFiles
Este emite que esta descargando el downloader.
Puede emitir si Natives, Assets o JARs de versiones.

# PercentDownloaded
Esta devuelve un objeto el cual trae la version y el progreso de instalacion, lo cual es util si manejas muchas descargas.

```JavaScript
  // Escuchar eventos
  downloader.on("downloadFiles", (msg) => {
    console.log(`[Download] ${msg}`);
  });

  downloader.on("percentDownloaded", (percentage) => {
    console.log(
      `[Progress ${percentage.version}] Descargado: ${percentage.percent}%`,
    );
  });
```

### Lanzar Minecraft

```javascript
import { NeutronLauncher } from "../../";

const launcher = new NeutronLauncher();

launcher.launchVersion({
  username: "santiagolxx",
  uuid: "1234",
  javaPath: "/usr/lib/jvm/java-21-openjdk/bin/java",
  accessToken: "1234",
  minecraftDir: "./minecraft",
  version: "1.21.5",
  isCracked: false,
});
```

## 🔧 Configuración

### Opciones del Descargador

- `version`: Versión de Minecraft a descargar
- `path`: Ruta donde se guardarán los archivos

### Opciones del Lanzador

- `version`: Versión de Minecraft a ejecutar
- `username`: Nombre de usuario
- `javaPath`: Ruta al ejecutable de Java (opcional)
- `memory`: Memoria RAM asignada (opcional)

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor, lee las [guías de contribución](CONTRIBUTING.md) para más detalles.

## 👥 Contribuidores

Gracias a todas las personas que han contribuido a Cubic Neutron:

<a href="https://github.com/CubicLauncher/neutron/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=CubicLauncher/neutron" />
</a>

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.
