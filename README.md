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
const downloader = new Downloader()

downloader.download('1.16.5', './minecraft')
```

### Lanzar Minecraft

```javascript
const { Launcher } = require('cubic-neutron');
const launcher = new Launcher()
launcher.launch({
    username: 'username', // NOMBRE  USUARIO,
    version: '1.16.5', // VERSION DE JUEGO - Varía dependiendo de la instalación.
    type: 'vanilla', // neoforge - optifine - fabric
    gameDirectory: './minecraft', // RUTA DE JUEGO
    memory: {
        min: '2G', // MINIMO DE MEMORIA PARA USAR
        max: '6G', // MAXIMO DE MEMORIA PARA USAR
    },
    java: 'C:/Program Files/Java/jre1.8.0_451/bin/java.exe',
})
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
