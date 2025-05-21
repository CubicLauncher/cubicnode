/*! Cubic Neutron
 * ©2025 Cubic Neutron - https://github.com/CubicLauncher
 * src/others/constants.ts
 */

export type VersionType = "old_alpha" | "release" | "snapshot";

export type MojangUrl = {
  meta: string;
  resource: string;
};

export type VersionInfo = {
  id: string;
  type: VersionType;
  url: string;
  time: Date;
  releaseTime: Date;
};

export type Manifest = {
  lastest: lastest;
  versions: VersionInfo[];
};

export type lastest = {
  release: VersionInfo;
  snapshot: VersionInfo;
};

export interface launchOptions {
  username: string;
  version: string;
  memory: MemoryOptions;
  java: JavaPaths;
}
export interface MemoryOptions {
  min: number;
  max: number;
}
export interface JavaPaths {
  Java8: string;
  Java17: string;
}

export interface LaunchArguments {
  game: (string | ConditionalArgument)[];
  jvm: (string | ConditionalArgument)[];
}

export interface ConditionalArgument {
  rules: Rule[];
  value: string | string[];
}

export interface Rule {
  action: "allow" | "disallow";
  features?: Record<string, boolean>;
  os?: {
    name?: string;
    arch?: string;
    version?: string;
  };
}

export interface AssetIndex {
  id: string;
  hash: string;
  size: number;
  totalSize: number;
  url: string;
}

export interface DownloadInfo {
  sha1: string;
  size: number;
  url: string;
}

export interface Downloads {
  client: DownloadInfo;
  client_mappings: DownloadInfo;
  server: DownloadInfo;
  server_mappings: DownloadInfo;
}

export interface JavaVersion {
  component: string;
  majorVersion: number;
}

export interface LibraryDownload {
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
}

export interface Library {
  downloads: LibraryDownload;
  name: string;
  rules?: Rule[];
}

export interface MinecraftVersionManifest {
  arguments: LaunchArguments;
  assetIndex: AssetIndex;
  assets: string;
  complianceLevel: number;
  downloads: Downloads;
  id: string;
  javaVersion: JavaVersion;
  libraries: Library[];
}
export interface AssetFile {
  objects: Record<string, AssetIndex>;
}

const MojangUrls: MojangUrl = {
  meta: "https://piston-meta.mojang.com/mc/game/version_manifest.json",
  resource: "https://resources.download.minecraft.net",
};

export interface DownloadEvent {
  version: string;
  percent: number;
}

export { MojangUrls };
