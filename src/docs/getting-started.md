# Primeros Pasos con Neutron

## Instalación

```bash
npm install neutron
# o
yarn add neutron
```

## Uso Básico

```typescript
import { NeutronLauncher, Downloader } from 'neutron';

// Crear una instancia del launcher
const launcher = new NeutronLauncher({
  username: "TuUsuario",
  version: "1.20.1",
  memory: {
    min: "2G",
    max: "4G"
  },
  java: {
    Java8: "ruta/a/java8",
    Java17: "ruta/a/java17"
  }
});

// Crear una instancia del descargador
const downloader = new Downloader();

// Escuchar eventos de descarga
downloader.on('percentDownloaded', (event) => {
  console.log(`Descargando versión ${event.version}: ${event.percent}%`);
});

// Lanzar el juego
launcher.launch();
```

## Características Principales
- Descarga automática de versiones de Minecraft
- Gestión de recursos y assets
- Lanzamiento programático del juego
- Soporte para diferentes versiones de Java
- Sistema de eventos para seguimiento de descargas

## Próximos Pasos
- Explora nuestra [Documentación de Componentes](./components/README.md)
- Aprende sobre [Mejores Prácticas](./practices/best-practices.md)
- Consulta la [Referencia de API](./api/api-reference.md) 
