# Referencia de API

## NeutronLauncher

### Constructor
```typescript
new NeutronLauncher(options: LauncherOptions)
```

#### LauncherOptions
```typescript
interface LauncherOptions {
  username: string;
  version: string;
  memory: {
    min: string;
    max: string;
  };
  java: {
    Java8: string;
    Java17: string;
  };
  resolution?: {
    width: number;
    height: number;
  };
  gameDirectory?: string;
}
```

### Métodos

#### launch()
```typescript
async launch(): Promise<void>
```
Lanza el juego con la configuración especificada.

#### getVersions()
```typescript
async getVersions(): Promise<VersionInfo[]>
```
Obtiene la lista de versiones disponibles.

## Downloader

### Constructor
```typescript
new Downloader(options?: DownloaderOptions)
```

#### DownloaderOptions
```typescript
interface DownloaderOptions {
  maxConcurrent?: number;
  cache?: boolean;
  timeout?: number;
}
```

### Métodos

#### downloadVersion(version: string)
```typescript
async downloadVersion(version: string): Promise<void>
```
Descarga una versión específica de Minecraft.

#### downloadAssets(version: string)
```typescript
async downloadAssets(version: string): Promise<void>
```
Descarga los assets para una versión específica.

### Eventos

#### percentDownloaded
```typescript
interface DownloadEvent {
  version: string;
  percent: number;
}

downloader.on('percentDownloaded', (event: DownloadEvent) => void)
```

#### error
```typescript
downloader.on('error', (error: Error) => void)
```

## Tipos

### VersionInfo
```typescript
interface VersionInfo {
  id: string;
  type: "release" | "snapshot";
  url: string;
  time: Date;
  releaseTime: Date;
}
```

### LaunchArguments
```typescript
interface LaunchArguments {
  game: (string | ConditionalArgument)[];
  jvm: (string | ConditionalArgument)[];
}
```

### ConditionalArgument
```typescript
interface ConditionalArgument {
  rules: Rule[];
  value: string | string[];
}
```

### Rule
```typescript
interface Rule {
  action: "allow" | "disallow";
  features?: Record<string, boolean>;
  os?: {
    name?: string;
    arch?: string;
    version?: string;
  };
}
```

## Constantes

### MojangUrls
```typescript
const MojangUrls = {
  meta: "https://piston-meta.mojang.com/mc/game/version_manifest.json",
  resource: "https://resources.download.minecraft.net"
}
```

## Ejemplos de Uso

### Lanzamiento Básico
```typescript
const launcher = new NeutronLauncher({
  username: "Usuario",
  version: "1.20.1",
  memory: {
    min: "2G",
    max: "4G"
  },
  java: {
    Java8: "C:/Program Files/Java/jre1.8.0_xxx",
    Java17: "C:/Program Files/Java/jdk-17"
  }
});

await launcher.launch();
```

### Descarga de Versión
```typescript
const downloader = new Downloader({
  maxConcurrent: 3,
  cache: true
});

downloader.on('percentDownloaded', (event) => {
  console.log(`Descargando ${event.version}: ${event.percent}%`);
});

await downloader.downloadVersion("1.20.1");
```

### Manejo de Errores
```typescript
try {
  await launcher.launch();
} catch (error) {
  console.error('Error al lanzar el juego:', error);
}
``` 
