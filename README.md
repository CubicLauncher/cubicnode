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

### Lanzar Minecraft

```javascript
import Launcher from "../components/launcher/launcher";

const launcher = new Launcher("./minecraft");

launcher.on("debug", (data) => console.log(data));
launcher.launch({
  username: "santiagolxx", // Ingresa tu nombre de usuario
  version: "1.16.5", // version a iniciar
  memory: {
    // Define la memoria que quieras usar
    min: 512, // Mínimo de memoria
    max: 700, // Máximo de memoria
  },
  java: {
    Java17: "/usr/lib/jvm/java-17-openjdk/bin/java",
    Java8: "/usr/lib/jvm/java-8-openjdk/bin/java",
  },
});
```

### Instancias
Al iniciar una version se devuelve una clase MinecraftInstance, la cual trae varios metodos
para operar con la instancia
```javascript
import Launcher from 'cubic-neutron';

const launcher = new Launcher('./minecraft');

let instance = launcher.launch({
  ...
})

// Mata el proceso de la instancia
instance.kill()

instance.then((rosca) => {
  // Obtiene stdout del juego.
  instance.onOutput((data) => {
    console.log(data);
  });
  // Devuelve el codigo de cierre
  instance.onClose((data) => {
    console.log(data);
  });
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
