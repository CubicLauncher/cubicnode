/**
 * CubicLauncher/Neutron
 * ©2025 Cubic Neutron - https://github.com/CubicLauncher
 * src/components/launcher/launcher.ts
 * todo: arreglar que el quickplay se use si es necesario.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { ChildProcess, spawn } from "child_process";
import { v4 as uuidv4 } from "uuid";

// Types
type OSType = "windows" | "osx" | "linux" | string;
type VersionType = "release" | "snapshot" | string;

interface Download {
  sha1: string;
  size: number;
  url: string;
}

interface AssetIndex {
  id: string;
  sha1: string;
  size: number;
  totalSize: number;
  url: string;
}

interface LoggingConfig {
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
}

interface Rule {
  action: "allow" | "disallow";
  os?: {
    name?: string;
    arch?: string;
    version?: string;
  };
  features?: Record<string, boolean>;
}

interface ArgumentRule {
  rules: Rule[];
  value: string | string[];
}

interface LibraryArtifact {
  path: string;
  sha1: string;
  size: number;
  url: string;
}

interface Library {
  name: string;
  downloads: {
    artifact?: LibraryArtifact;
    classifiers?: Record<string, LibraryArtifact>;
  };
  natives?: Record<string, string>;
  rules?: Rule[];
  extract?: {
    exclude: string[];
  };
}

interface MinecraftVersionInfo {
  id: string;
  type: VersionType;
  libraries: Library[];
  mainClass: string;
  minimumLauncherVersion: number;
  assets: string;
  complianceLevel: number;
  downloads?: {
    client: Download;
    server?: Download;
  };
  assetIndex?: AssetIndex;
  logging?: LoggingConfig;
  arguments?: {
    game: (string | ArgumentRule)[];
    jvm: (string | ArgumentRule)[];
  };
  minecraftArguments?: string;
  inheritsFrom?: string;
  jar?: string;
}

interface Resolution {
  width: number;
  height: number;
}

interface LauncherOptions {
  username: string;
  uuid: string;
  accessToken: string;
  minecraftDir: string;
  version: string;
  maxMemory?: number;
  minMemory?: number;
  resolution?: Resolution;
  isDemo?: boolean;
  javaPath?: string;
  gameDir?: string;
  assetsDir?: string;
  isCracked: boolean;
  extraJvmArgs?: string[];
  extraGameArgs?: string[];
  // Nuevas opciones añadidas
  clientId?: string;
  xuid?: string;
  userType?: string;
  versionType?: string;
  quickPlayPath?: string;
  quickPlaySingleplayer?: string;
  quickPlayMultiplayer?: string;
  quickPlayRealms?: string;
  // Opciones para rutas de nativas específicas
  nativesDir?: string;
}

export default class NeutronLauncher {
  private static readonly DEFAULT_JAVA_PATH = NeutronLauncher.detectJavaPath();

  /**
   * Detects default Java path based on current operating system
   */
  private static detectJavaPath(): string {
    const platform = os.platform();

    if (platform === "win32") {
      const javaHome = process.env.JAVA_HOME;
      return javaHome ? path.join(javaHome, "bin", "javaw.exe") : "javaw";
    }

    return platform === "darwin" ? "/usr/bin/java" : "java";
  }

  /**
   * Gets current OS name in Minecraft format
   */
  private static getCurrentOS(): OSType {
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
   * Checks if a version is considered very old (prior to 1.6)
   */
  private static isVeryOldVersion(version: string): boolean {
    try {
      const match = version.match(/^(\d+)\.(\d+)/);
      if (!match) return false;

      const major = parseInt(match[1], 10);
      const minor = parseInt(match[2], 10);

      return (major === 1 && minor < 6) || major === 0;
    } catch {
      return false;
    }
  }

  /**
   * Checks if a version is newer than 1.20
   */
  private static isNewerVersion(version: string): boolean {
    try {
      const match = version.match(/^(\d+)\.(\d+)/);
      if (!match) return false;

      const major = parseInt(match[1], 10);
      const minor = parseInt(match[2], 10);

      return major > 1 || (major === 1 && minor >= 20);
    } catch {
      return false;
    }
  }

  /**
   * Loads and parses Minecraft version info from JSON file
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
      const versionInfo: MinecraftVersionInfo = JSON.parse(data);

      // Check if this version inherits from another
      if (versionInfo.inheritsFrom) {
        const parentOptions = { ...options, version: versionInfo.inheritsFrom };
        const parentInfo = await NeutronLauncher.loadVersionInfo(parentOptions);
        return NeutronLauncher.mergeVersionInfo(parentInfo, versionInfo);
      }

      return versionInfo;
    } catch (error) {
      throw new Error(`Failed to load version JSON file: ${error}`);
    }
  }

  /**
   * Merges parent and child version info
   */
  private static mergeVersionInfo(
    parent: MinecraftVersionInfo,
    child: MinecraftVersionInfo,
  ): MinecraftVersionInfo {
    const result = { ...parent, ...child };

    // Merge libraries
    if (parent.libraries && child.libraries) {
      result.libraries = [...parent.libraries, ...child.libraries];
    }

    return result;
  }

  /**
   * Checks if a rule applies based on current environment
   */
  private static ruleApplies(rule: Rule, options: LauncherOptions): boolean {
    if (!rule) return true;

    let applies = rule.action === "allow";

    // Check OS rules
    if (rule.os) {
      const currentOS = NeutronLauncher.getCurrentOS();
      const currentArch = os.arch();

      if (rule.os.name && rule.os.name !== currentOS) {
        return rule.action !== "allow";
      }

      if (rule.os.arch && rule.os.arch !== currentArch) {
        return rule.action !== "allow";
      }

      // Check OS version using regex if specified
      if (rule.os.version) {
        try {
          const versionRegex = new RegExp(rule.os.version);
          if (!versionRegex.test(os.release())) {
            return rule.action !== "allow";
          }
        } catch (e) {
          console.warn("Error checking OS version:", e);
        }
      }
    }

    // Check feature rules
    if (rule.features) {
      // Check for custom resolution
      if (rule.features.has_custom_resolution !== undefined) {
        const hasCustomResolution = !!options.resolution;
        if (rule.features.has_custom_resolution !== hasCustomResolution) {
          return rule.action !== "allow";
        }
      }

      // Check demo mode
      if (rule.features.is_demo_user !== undefined) {
        const isDemoUser = options.isDemo === true;
        if (rule.features.is_demo_user !== isDemoUser) {
          return rule.action !== "allow";
        }
      }
    }

    return applies;
  }

  /**
   * Builds classpath for Minecraft
   */
  private static async buildClasspath(
    options: LauncherOptions,
    versionInfo: MinecraftVersionInfo,
  ): Promise<string> {
    const libraries: string[] = [];
    const separator = os.platform() === "win32" ? ";" : ":";
    const currentOS = NeutronLauncher.getCurrentOS();
    const currentArch = os.arch();

    // Add libraries
    for (const lib of versionInfo.libraries) {
      // Check library rules
      const allowed =
        !lib.rules ||
        lib.rules.some((rule) => NeutronLauncher.ruleApplies(rule, options));

      if (!allowed) continue;

      // Add main artifact
      if (lib.downloads?.artifact) {
        const libPath = path.join(
          options.minecraftDir,
          "libraries",
          lib.downloads.artifact.path,
        );
        libraries.push(libPath);
      } else if (lib.name) {
        // Legacy format support
        const parts = lib.name.split(":");
        if (parts.length >= 3) {
          const [group, artifact, version] = parts;
          const groupPath = group.replace(/\./g, "/");
          const libPath = path.join(
            options.minecraftDir,
            "libraries",
            groupPath,
            artifact,
            version,
            `${artifact}-${version}.jar`,
          );
          libraries.push(libPath);
        }
      }

      // Add natives if needed
      if (lib.natives) {
        const nativeKey = lib.natives[currentOS];
        if (nativeKey) {
          // Replace arch placeholder
          const nativeClassifier = nativeKey.replace(
            "${arch}",
            currentArch === "x64" ? "64" : "32",
          );

          // New format with classifiers
          if (lib.downloads?.classifiers) {
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
          // Legacy format
          else if (lib.name) {
            const parts = lib.name.split(":");
            if (parts.length >= 3) {
              const [group, artifact, version] = parts;
              const groupPath = group.replace(/\./g, "/");
              const libPath = path.join(
                options.minecraftDir,
                "libraries",
                groupPath,
                artifact,
                version,
                `${artifact}-${version}-${nativeClassifier}.jar`,
              );
              libraries.push(libPath);
            }
          }
        }
      }
    }

    // Add client jar
    const jarName = versionInfo.jar || options.version;
    const clientJar = path.join(
      options.minecraftDir,
      "versions",
      jarName,
      `${jarName}.jar`,
    );
    libraries.push(clientJar);

    return libraries.join(separator);
  }

  /**
   * Replaces argument placeholders with actual values
   */
  private static replaceArgs(
    arg: string,
    options: LauncherOptions,
    versionInfo: MinecraftVersionInfo,
    classpath?: string,
  ): string {
    // Use specific natives dir if provided, otherwise use default
    const nativesDir =
      options.nativesDir ||
      path.join(options.minecraftDir, "natives", options.version);

    const gameDir = options.gameDir || options.minecraftDir;
    const assetsDir =
      options.assetsDir || path.join(options.minecraftDir, "assets");

    const replacements: Record<string, string> = {
      "${auth_player_name}": options.username,
      "${version_name}": options.version,
      "${game_directory}": gameDir,
      "${assets_root}": assetsDir,
      "${assets_index_name}":
        versionInfo.assetIndex?.id || versionInfo.assets || "legacy",
      "${auth_uuid}": options.uuid,
      "${auth_access_token}": options.accessToken,
      "${user_type}": options.userType || "mojang",
      "${version_type}": options.versionType || versionInfo.type || "release",
      "${natives_directory}": nativesDir,
      "${launcher_name}": "Neutron",
      "${launcher_version}": "1.0",
      "${classpath_separator}": os.platform() === "win32" ? ";" : ":",
      "${library_directory}": path.join(options.minecraftDir, "libraries"),
    };

    // Add resolution if defined
    if (options.resolution) {
      replacements["${resolution_width}"] = String(options.resolution.width);
      replacements["${resolution_height}"] = String(options.resolution.height);
    }

    // Add QuickPlay parameters if they exist
    if (options.quickPlayPath) {
      replacements["${quickPlayPath}"] = options.quickPlayPath;
    }
    if (options.quickPlaySingleplayer) {
      replacements["${quickPlaySingleplayer}"] = options.quickPlaySingleplayer;
    }
    if (options.quickPlayMultiplayer) {
      replacements["${quickPlayMultiplayer}"] = options.quickPlayMultiplayer;
    }
    if (options.quickPlayRealms) {
      replacements["${quickPlayRealms}"] = options.quickPlayRealms;
    }

    // Add client ID and XUID if defined
    if (options.clientId) {
      replacements["${clientid}"] = options.clientId;
    }
    if (options.xuid) {
      replacements["${auth_xuid}"] = options.xuid;
    }

    // Replace classpath with actual value if provided
    if (classpath) {
      replacements["${classpath}"] = classpath;
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
   * Processes JVM arguments from version info
   */
  private static buildJvmArgs(
    options: LauncherOptions,
    versionInfo: MinecraftVersionInfo,
    classpath: string,
  ): string[] {
    const args: string[] = [];

    // Use specific natives dir if provided
    const nativesDir =
      options.nativesDir ||
      path.join(options.minecraftDir, "natives", options.version);

    // Memory configuration
    const maxMemory = options.maxMemory || 2048;
    const minMemory = options.minMemory || 512;
    args.push(`-Xmx${maxMemory}M`);
    args.push(`-Xms${minMemory}M`);

    // Add specific natives path as in original command
    if (NeutronLauncher.isNewerVersion(options.version)) {
      args.push(`-Djava.library.path=${nativesDir}`);
      args.push(`-Djna.tmpdir=${nativesDir}`);
      args.push(`-Dorg.lwjgl.system.SharedLibraryExtractPath=${nativesDir}`);
      args.push(`-Dio.netty.native.workdir=${nativesDir}`);
    }

    // Add cracked mode flags
    if (options.isCracked) {
      args.push("-Dminecraft.api.env=custom");
      args.push("-Dminecraft.api.auth.host=https://invalid.invalid");
      args.push("-Dminecraft.api.account.host=https://invalid.invalid");
      args.push("-Dminecraft.api.session.host=https://invalid.invalid");
      args.push("-Dminecraft.api.services.host=https://invalid.invalid");
    }

    // Process JVM args from version JSON (new format)
    if (versionInfo.arguments?.jvm) {
      for (const arg of versionInfo.arguments.jvm) {
        if (typeof arg === "string") {
          args.push(
            NeutronLauncher.replaceArgs(arg, options, versionInfo, classpath),
          );
        } else if (typeof arg === "object") {
          // Check rule conditions
          const ruleApplies = arg.rules.some((rule) =>
            NeutronLauncher.ruleApplies(rule, options),
          );

          if (ruleApplies) {
            const values = Array.isArray(arg.value) ? arg.value : [arg.value];
            for (const value of values) {
              args.push(
                NeutronLauncher.replaceArgs(
                  value,
                  options,
                  versionInfo,
                  classpath,
                ),
              );
            }
          }
        }
      }
    } else {
      // Default or old format args
      args.push(`-Djava.library.path=${nativesDir}`);
      args.push("-Dminecraft.launcher.brand=Neutron");
      args.push("-Dminecraft.launcher.version=1.0");
    }

    // Add extra JVM args if provided
    if (options.extraJvmArgs?.length) {
      args.push(...options.extraJvmArgs);
    }

    return args;
  }

  /**
   * Processes game arguments from version info
   */
  private static buildGameArgs(
    options: LauncherOptions,
    versionInfo: MinecraftVersionInfo,
  ): string[] {
    const args: string[] = [];
    const isVeryOldVersion = NeutronLauncher.isVeryOldVersion(versionInfo.id);

    // New format (Minecraft 1.13+)
    if (versionInfo.arguments?.game) {
      for (const arg of versionInfo.arguments.game) {
        if (typeof arg === "string") {
          args.push(NeutronLauncher.replaceArgs(arg, options, versionInfo));
        } else if (typeof arg === "object") {
          const ruleApplies = arg.rules.some((rule) =>
            NeutronLauncher.ruleApplies(rule, options),
          );

          if (ruleApplies) {
            const values = Array.isArray(arg.value) ? arg.value : [arg.value];
            for (const value of values) {
              args.push(
                NeutronLauncher.replaceArgs(value, options, versionInfo),
              );
            }
          }
        }
      }
    }
    // Old format (up to Minecraft 1.12.2)
    else if (versionInfo.minecraftArguments) {
      const minecraftArgs = versionInfo.minecraftArguments.split(" ");
      for (const arg of minecraftArgs) {
        // Skip demo arg if not in demo mode
        if (arg === "--demo" && !options.isDemo) {
          continue;
        }
        args.push(NeutronLauncher.replaceArgs(arg, options, versionInfo));
      }
    }
    // Very old format (pre-1.6)
    else if (isVeryOldVersion) {
      args.push(options.username); // Username directly (no --username)
      // Additional args for very old versions can be added here
    }

    // Add QuickPlay arguments for newer Minecraft versions (1.20+)
    if (NeutronLauncher.isNewerVersion(versionInfo.id)) {
      if (options.quickPlayPath?.length) {
        args.push("--quickPlayPath");
        args.push(options.quickPlayPath);
      }
      if (options.quickPlaySingleplayer?.length) {
        args.push("--quickPlaySingleplayer");
        args.push(options.quickPlaySingleplayer);
      }
      if (options.quickPlayMultiplayer?.length) {
        args.push("--quickPlayMultiplayer");
        args.push(options.quickPlayMultiplayer);
      }
      if (options.quickPlayRealms?.length) {
        args.push("--quickPlayRealms");
        args.push(options.quickPlayRealms);
      }
    }

    // Add extra game args if provided
    if (options.extraGameArgs?.length) {
      args.push(...options.extraGameArgs);
    }

    return args;
  }

  /**
   * Builds the complete Minecraft launch command
   */
  private static async buildLaunchCommand(
    options: LauncherOptions,
    versionInfo: MinecraftVersionInfo,
  ): Promise<string[]> {
    const javaPath = options.javaPath || NeutronLauncher.DEFAULT_JAVA_PATH;
    const classpath = await NeutronLauncher.buildClasspath(
      options,
      versionInfo,
    );
    const jvmArgs = NeutronLauncher.buildJvmArgs(
      options,
      versionInfo,
      classpath,
    );
    const gameArgs = NeutronLauncher.buildGameArgs(options, versionInfo);
    const isVeryOldVersion = NeutronLauncher.isVeryOldVersion(versionInfo.id);

    // Determine main class
    let mainClass = versionInfo.mainClass;
    if (!mainClass) {
      mainClass = isVeryOldVersion
        ? "net.minecraft.client.Minecraft"
        : "net.minecraft.client.main.Main";
    }

    // Build command
    const command: string[] = [
      javaPath,
      ...jvmArgs,
      "-cp",
      classpath,
      mainClass,
      ...gameArgs,
    ];
    return command;
  }

  /**
   * Formats launch command as a string
   */
  private static async formatLaunchCommand(
    options: LauncherOptions,
    versionInfo: MinecraftVersionInfo,
  ): Promise<string> {
    const command = await NeutronLauncher.buildLaunchCommand(
      options,
      versionInfo,
    );
    return command
      .map((arg) => (arg.includes(" ") ? `"${arg}"` : arg))
      .join(" ");
  }

  /**
   * Launches Minecraft with the provided options
   */
  async launchVersion(options: LauncherOptions): Promise<ChildProcess> {
    // Apply default values
    const finalOptions: LauncherOptions = {
      ...options,
      maxMemory: options.maxMemory || 2048,
      minMemory: options.minMemory || 512,
      uuid: options.uuid || uuidv4(),
      javaPath: options.javaPath || NeutronLauncher.DEFAULT_JAVA_PATH,
      gameDir: options.gameDir || options.minecraftDir,
      assetsDir: options.assetsDir || path.join(options.minecraftDir, "assets"),
      resolution: options.resolution || {
        width: 856,
        height: 482,
      },
      isDemo: !!options.isDemo,
      isCracked: options.isCracked ?? true,
      extraJvmArgs: options.extraJvmArgs || [],
      extraGameArgs: options.extraGameArgs || [],
      // Valores por defecto para nuevas opciones
      nativesDir:
        options.nativesDir ||
        `${options.minecraftDir}/natives/${options.version}`,
      userType: options.userType || "mojang",
      versionType: options.versionType || "release",
      clientId: options.clientId || "",
      xuid: options.xuid || "",
    };

    try {
      // Load version info
      const versionInfo = await NeutronLauncher.loadVersionInfo(finalOptions);

      // Get formatted command for logging
      const commandString = await NeutronLauncher.formatLaunchCommand(
        finalOptions,
        versionInfo,
      );
      console.log("Minecraft launch command:", commandString);

      // Execute command
      const args = await NeutronLauncher.buildLaunchCommand(
        finalOptions,
        versionInfo,
      );
      const minecraft = spawn(args[0], args.slice(1));

      return minecraft;
    } catch (error) {
      console.error("Error launching Minecraft:", error);
      throw error;
    }
  }
}

// Export types and class
export { LauncherOptions, MinecraftVersionInfo };
