/*! CubicLauncher/Neutron
 * ©2025 Cubic Neutron - https://github.com/CubicLauncher
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { ChildProcess, spawn } from "child_process";
import { v4 } from "uuid";
import { open } from "node:inspector/promises";

// Interfaces para el JSON de versión de Minecraft
interface MinecraftVersionInfo {
  id: string;
  type: string;
  libraries: Library[];
  mainClass: string;
  minimumLauncherVersion: number;
  assets: string;
  complianceLevel: number;
  downloads?: {
    client: Download;
    server?: Download;
  };
  assetIndex?: {
    id: string;
    sha1: string;
    size: number;
    totalSize: number;
    url: string;
  };
  logging?: {
    client: {
      argument: string;
      file: {
        id: string;
        sha1: string;
        size: number;
        url: string;
      };
      type: string;
    };
  };
  arguments?: {
    game: (string | ArgumentRule)[];
    jvm: (string | ArgumentRule)[];
  };
  minecraftArguments?: string; // Para versiones más antiguas
}

interface Download {
  sha1: string;
  size: number;
  url: string;
}

interface Library {
  name: string;
  downloads: {
    artifact?: {
      path: string;
      sha1: string;
      size: number;
      url: string;
    };
    classifiers?: {
      [key: string]: {
        path: string;
        sha1: string;
        size: number;
        url: string;
      };
    };
  };
  natives?: {
    [key: string]: string;
  };
  rules?: Rule[];
  extract?: {
    exclude: string[];
  };
}

interface Rule {
  action: string;
  os?: {
    name?: string;
    arch?: string;
    version?: string;
  };
  features?: {
    [key: string]: boolean;
  };
}

interface ArgumentRule {
  rules: Rule[];
  value: string | string[];
}

interface LauncherOptions {
  username: string;
  uuid: string;
  accessToken: string;
  minecraftDir: string;
  version: string;

  // Opciones de JVM
  maxMemory?: number; // En MB
  minMemory?: number; // En MB
  resolution?: {
    width: number;
    height: number;
  };

  // Opción de modo demo
  isDemo?: boolean; // Modo demo (por defecto: false)

  // Opciones avanzadas
  javaPath?: string; // Ruta al ejecutable de Java
  gameDir?: string; // Directorio del juego (por defecto es .minecraft)
  assetsDir?: string; // Directorio de assets (por defecto es .minecraft/assets)
  isCracked: boolean;

  // Opciones adicionales
  extraJvmArgs?: string[];
  extraGameArgs?: string[];
}

export default class NeutronLauncher {
  private static readonly DEFAULT_JAVA_PATH =
    NeutronLauncher.getDefaultJavaPath();

  /**
   * Obtiene la ruta por defecto de Java según el sistema operativo
   */
  private static getDefaultJavaPath(): string {
    const platform = os.platform();

    if (platform === "win32") {
      // En Windows, intentamos encontrar Java en Program Files
      const javaHome = process.env.JAVA_HOME;
      if (javaHome) return path.join(javaHome, "bin", "javaw.exe");
      return "javaw";
    } else if (platform === "darwin") {
      // En macOS
      return "/usr/bin/java";
    } else {
      // En Linux y otros sistemas
      return "java";
    }
  }

  /**
   * Carga el archivo JSON de la versión de Minecraft
   */
  private static async loadVersionInfo(
    options: LauncherOptions,
  ): Promise<MinecraftVersionInfo> {
    const versionPath = path.join(
      options.minecraftDir,
      "versions",
      options.version,
      `${options.version}.json`,
    );

    try {
      const data = await fs.promises.readFile(versionPath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      throw new Error(
        `No se pudo cargar el archivo JSON de la versión: ${error}`,
      );
    }
  }

  /**
   * Comprueba si una regla se aplica según el entorno actual
   */
  private static checkRule(rule: Rule, options: LauncherOptions): boolean {
    // Por defecto, si no hay regla, se permite
    if (!rule) return true;

    let applies = rule.action === "allow";

    // Comprobar reglas de sistema operativo
    if (rule.os) {
      const currentOS = NeutronLauncher.getCurrentOS();
      const currentArch = os.arch();

      if (rule.os.name && rule.os.name !== currentOS) {
        return rule.action !== "allow";
      }

      if (rule.os.arch && rule.os.arch !== currentArch) {
        return rule.action !== "allow";
      }

      // Comprobación de versión del sistema operativo (más compleja, simplificada aquí)
      if (rule.os.version) {
        try {
          const versionRegex = new RegExp(rule.os.version);
          if (!versionRegex.test(os.release())) {
            return rule.action !== "allow";
          }
        } catch (e) {
          // Si hay un error en la expresión regular, ignoramos esta regla
          console.warn(
            "Error al verificar la versión del sistema operativo:",
            e,
          );
        }
      }
    }

    // Comprobar reglas de características
    if (rule.features) {
      // Verificar características específicas
      if (rule.features.has_custom_resolution !== undefined) {
        const hasCustomResolution = options.resolution !== undefined;
        if (rule.features.has_custom_resolution !== hasCustomResolution) {
          return rule.action !== "allow";
        }
      }

      // Importante: Verificar explícitamente si estamos en modo demo
      if (rule.features.is_demo_user !== undefined) {
        const isDemoUser = options.isDemo === true;
        if (rule.features.is_demo_user !== isDemoUser) {
          return rule.action !== "allow";
        }
      }

      // Agregar más verificaciones de características según sea necesario
    }

    return applies;
  }

  /**
   * Obtiene el sistema operativo actual en el formato que espera Minecraft
   */
  private static getCurrentOS(): string {
    const platform = os.platform();
    switch (platform) {
      case "win32":
        return "windows";
      case "darwin":
        return "osx";
      case "linux":
        return "linux";
      default:
        return platform;
    }
  }

  /**
   * Genera el classpath para Minecraft
   */
  private static async getClasspath(
    options: LauncherOptions,
    versionInfo: MinecraftVersionInfo,
  ): Promise<string> {
    const libraries: string[] = [];
    const separator = os.platform() === "win32" ? ";" : ":";
    const currentOS = NeutronLauncher.getCurrentOS();
    const currentArch = os.arch();

    // Añadir bibliotecas
    for (const lib of versionInfo.libraries) {
      // Comprobar reglas de la biblioteca
      let allowed = true;
      if (lib.rules) {
        allowed = lib.rules.some((rule) =>
          NeutronLauncher.checkRule(rule, options),
        );
      }

      if (!allowed) continue;

      // Añadir artefacto principal
      if (lib.downloads.artifact) {
        const libPath = path.join(
          options.minecraftDir,
          "libraries",
          lib.downloads.artifact.path,
        );
        libraries.push(libPath);
      }

      // Añadir nativos si es necesario
      if (lib.natives) {
        const nativeKey = lib.natives[currentOS];
        if (nativeKey && lib.downloads.classifiers) {
          // Reemplazar ${arch} si es necesario
          const nativeClassifier = nativeKey.replace(
            "${arch}",
            currentArch === "x64" ? "64" : "32",
          );
          const nativeArtifact = lib.downloads.classifiers[nativeClassifier];

          if (nativeArtifact) {
            const nativePath = path.join(
              options.minecraftDir,
              "libraries",
              nativeArtifact.path,
            );
            libraries.push(nativePath);
          }
        }
      }
    }

    // Añadir el jar del cliente
    const clientJar = path.join(
      options.minecraftDir,
      "versions",
      options.version,
      `${options.version}.jar`,
    );
    libraries.push(clientJar);

    return libraries.join(separator);
  }

  /**
   * Procesa los argumentos de la JVM desde el JSON de versión
   */
  private static processJvmArgs(
    options: LauncherOptions,
    versionInfo: MinecraftVersionInfo,
  ): string[] {
    const args: string[] = [];
    const nativesDir = path.join(
      options.minecraftDir,
      "natives",
      options.version,
    );

    // Configuración de memoria
    const maxMemory = options.maxMemory || 2048;
    const minMemory = options.minMemory || 512;
    args.push(`-Xmx${maxMemory}M`);
    args.push(`-Xms${minMemory}M`);

    if (options.isCracked) {
      args.push("-Dminecraft.api.env=custom");
      args.push("-Dminecraft.api.auth.host=https://invalid.invalid");
      args.push("-Dminecraft.api.account.host=https://invalid.invalid");
      args.push("-Dminecraft.api.session.host=https://invalid.invalid");
      args.push("-Dminecraft.api.services.host=https://invalid.invalid");
    }

    // Si tenemos argumentos JVM en el JSON (formato nuevo)
    if (versionInfo.arguments && versionInfo.arguments.jvm) {
      for (const arg of versionInfo.arguments.jvm) {
        if (typeof arg === "string") {
          args.push(
            NeutronLauncher.replaceArguments(arg, options, versionInfo),
          );
        } else if (typeof arg === "object") {
          // Verificar reglas para argumentos condicionales
          const ruleApplies = arg.rules.some((rule) =>
            NeutronLauncher.checkRule(rule, options),
          );
          if (ruleApplies) {
            const values = Array.isArray(arg.value) ? arg.value : [arg.value];
            for (const value of values) {
              args.push(
                NeutronLauncher.replaceArguments(value, options, versionInfo),
              );
            }
          }
        }
      }
    } else {
      // Formato antiguo o argumentos por defecto
      args.push("-Djava.library.path=" + nativesDir);
      args.push("-Dminecraft.launcher.brand=Neutron");
      args.push("-Dminecraft.launcher.version=1.0");
      args.push("-cp");
    }

    // Añadir argumentos JVM adicionales si se proporcionaron
    if (options.extraJvmArgs && options.extraJvmArgs.length > 0) {
      args.push(...options.extraJvmArgs);
    }

    return args;
  }

  /**
   * Procesa los argumentos del juego desde el JSON de versión
   */
  private static processGameArgs(
    options: LauncherOptions,
    versionInfo: MinecraftVersionInfo,
  ): string[] {
    const args: string[] = [];

    // Formato nuevo (Minecraft 1.13+)
    if (versionInfo.arguments && versionInfo.arguments.game) {
      for (const arg of versionInfo.arguments.game) {
        if (typeof arg === "string") {
          args.push(
            NeutronLauncher.replaceArguments(arg, options, versionInfo),
          );
        } else if (typeof arg === "object") {
          // Verificar reglas para argumentos condicionales usando la función mejorada
          const ruleApplies = arg.rules.some((rule) =>
            NeutronLauncher.checkRule(rule, options),
          );
          if (ruleApplies) {
            const values = Array.isArray(arg.value) ? arg.value : [arg.value];
            for (const value of values) {
              args.push(
                NeutronLauncher.replaceArguments(value, options, versionInfo),
              );
            }
          }
        }
      }
    }
    // Formato antiguo (hasta Minecraft 1.12.2)
    else if (versionInfo.minecraftArguments) {
      const minecraftArgs = versionInfo.minecraftArguments.split(" ");
      for (const arg of minecraftArgs) {
        // Si estamos procesando el argumento --demo, verificar la opción isDemo
        if (arg === "--demo" && !options.isDemo) {
          continue;
        }
        args.push(NeutronLauncher.replaceArguments(arg, options, versionInfo));
      }
    }

    // Añadir argumentos adicionales del juego si se proporcionaron
    if (options.extraGameArgs && options.extraGameArgs.length > 0) {
      args.push(...options.extraGameArgs);
    }

    return args;
  }

  /**
   * Reemplaza las variables en los argumentos con sus valores correspondientes
   */
  private static replaceArguments(
    arg: string,
    options: LauncherOptions,
    versionInfo: MinecraftVersionInfo,
  ): string {
    const gameDir = options.gameDir || options.minecraftDir;
    const assetsDir =
      options.assetsDir || path.join(options.minecraftDir, "assets");

    const replacements: { [key: string]: string } = {
      "${auth_player_name}": options.username,
      "${version_name}": options.version,
      "${game_directory}": gameDir,
      "${assets_root}": assetsDir,
      "${assets_index_name}":
        versionInfo.assetIndex?.id || versionInfo.assets || "legacy",
      "${auth_uuid}": options.uuid,
      "${auth_access_token}": options.accessToken,
      "${user_type}": "mojang",
      "${version_type}": versionInfo.type || "release",
      "${natives_directory}": path.join(
        options.minecraftDir,
        "natives",
        options.version,
      ),
      "${launcher_name}": "Neutron",
      "${launcher_version}": "1.0",
      "${classpath}": "${classpath}", // Se reemplazará después
      "${classpath_separator}": os.platform() === "win32" ? ";" : ":",
      "${library_directory}": path.join(options.minecraftDir, "libraries"),
    };

    // Añadir resolución si está definida
    if (options.resolution) {
      replacements["${resolution_width}"] = String(options.resolution.width);
      replacements["${resolution_height}"] = String(options.resolution.height);
    }

    let result = arg;
    for (const [key, value] of Object.entries(replacements)) {
      result = result.replace(
        new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        value,
      );
    }
    return result;
  }

  /**
   * Genera todos los argumentos de comando para lanzar Minecraft
   */
  private static async getMinecraftCommand(
    options: LauncherOptions,
    versionInfo: MinecraftVersionInfo,
  ): Promise<string[]> {
    // Preparar componentes del comando
    const javaPath = options.javaPath || NeutronLauncher.DEFAULT_JAVA_PATH;
    const classpath = await NeutronLauncher.getClasspath(options, versionInfo);
    const jvmArgs = NeutronLauncher.processJvmArgs(options, versionInfo);
    const mainClass = versionInfo.mainClass;
    const gameArgs = NeutronLauncher.processGameArgs(options, versionInfo);

    // Construir el comando completo
    let command: string[] = [javaPath];
    command = command.concat(jvmArgs);

    // Si -cp no está en los argumentos de JVM, añadirlo
    if (!jvmArgs.includes("-cp")) {
      command.push("-cp");
      command.push(classpath);
    } else {
      // Reemplazar ${classpath} en los argumentos existentes
      const cpIndex = command.findIndex((arg) => arg === "${classpath}");
      if (cpIndex !== -1) {
        command[cpIndex] = classpath;
      }
    }

    command.push(mainClass);
    command = command.concat(gameArgs);

    return command;
  }

  /**
   * Método auxiliar para convertir el comando en una cadena
   */
  private static async getMinecraftCommandString(
    options: LauncherOptions,
    versionInfo: MinecraftVersionInfo,
  ): Promise<string> {
    const command = await NeutronLauncher.getMinecraftCommand(
      options,
      versionInfo,
    );
    return command
      .map((arg) => {
        // Encerrar entre comillas los argumentos que contienen espacios
        return arg.includes(" ") ? `"${arg}"` : arg;
      })
      .join(" ");
  }

  /**
   * Función principal para lanzar una versión de Minecraft
   * @param options Opciones de lanzamiento para Minecraft
   */
  async launchVersion(options: LauncherOptions): Promise<ChildProcess> {
    // Aplicar valores por defecto a las opciones
    const processedOptions: LauncherOptions = {
      ...options,
      maxMemory: options.maxMemory || 2048,
      minMemory: options.minMemory || 512,
      uuid: options.uuid || v4().toString(),
      javaPath: options.javaPath || NeutronLauncher.DEFAULT_JAVA_PATH,
      gameDir: options.gameDir || path.join(options.minecraftDir),
      assetsDir: options.assetsDir || path.join(options.minecraftDir, "assets"),
      resolution: {
        height: options.resolution?.height || 482,
        width: options.resolution?.width || 856,
      },
      isDemo: options.isDemo || false, // Valor por defecto de isDemo
      isCracked: options.isCracked || true,
      extraJvmArgs: options.extraJvmArgs || [],
      extraGameArgs: options.extraGameArgs || [],
    };

    try {
      // Cargar información de la versión
      const versionInfo =
        await NeutronLauncher.loadVersionInfo(processedOptions);

      // Obtener el comando para lanzar Minecraft
      const command = await NeutronLauncher.getMinecraftCommandString(
        processedOptions,
        versionInfo,
      );
      console.log("Comando para lanzar Minecraft:");
      console.log(command);

      // Ejecutar el comando
      const args = await NeutronLauncher.getMinecraftCommand(
        processedOptions,
        versionInfo,
      );
      const minecraft = spawn(args[0], args.slice(1));

      return minecraft;
    } catch (error) {
      console.error("Error al lanzar Minecraft:", error);
      throw error;
    }
  }
}

// Exportar clases y funciones principales
export { LauncherOptions, MinecraftVersionInfo };
