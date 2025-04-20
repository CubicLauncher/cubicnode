# Cubic Neutron

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/cubic-neutron.svg)](https://badge.fury.io/js/cubic-neutron)

Un módulo Node.js que permite la descarga y ejecución de Minecraft Java Edition de manera programática.

## 📋 Características

- Descarga de Minecraft Java Edition
- Soporte para diferentes versiones de Minecraft
- Integración con Optifine, Forge y Fabric
- Gestión de perfiles de usuario
- Interfaz simple y fácil de usar

## 🚀 Instalación

```bash
npm install cubic-neutron
```

## 📦 Uso

### Descargar Minecraft

```javascript
const { Downloader } = require('cubic-neutron');

const downloader = new Downloader({
    version: '1.20.1',
    path: './minecraft'
});

downloader.download().then(() => {
    console.log('¡Minecraft descargado exitosamente!');
});
```

### Lanzar Minecraft

```javascript
const { Launcher } = require('cubic-neutron');

const launcher = new Launcher({
    version: '1.20.1',
    username: 'Jugador',
    path: './minecraft'
});

launcher.launch().then(() => {
    console.log('¡Minecraft iniciado!');
});
```

## 🔧 Configuración

### Opciones del Descargador

- `version`: Versión de Minecraft a descargar
- `path`: Ruta donde se guardarán los archivos
- `forge`: Versión de Forge a instalar (opcional)
- `fabric`: Versión de Fabric a instalar (opcional)
- `optifine`: Versión de Optifine a instalar (opcional)

### Opciones del Lanzador

- `version`: Versión de Minecraft a ejecutar
- `username`: Nombre de usuario
- `path`: Ruta donde están los archivos de Minecraft
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
