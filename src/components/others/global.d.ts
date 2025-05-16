// src/types/global.d.ts
export {};

declare global {
  type VersionType = "old_alpha" | "release" | "snapshot";

  type MojangUrl = {
    meta: string;
    resource: string;
  };

  type VersionInfo = {
    id: string;
    type: VersionType;
    url: string;
    time: Date;
    releaseTime: Date;
  };

  type Manifest = {
    lastest: lastest;
    versions: VersionInfo[];
  };

  type lastest = {
    release: VersionInfo;
    snapshot: VersionInfo;
  };

  interface launchOptions {
    username: string;
    version: string;
    memory: MemoryOptions;
    java: JavaPaths;
  }
  interface MemoryOptions {
    min: number;
    max: number;
  }
  interface JavaPaths {
    Java8: string;
    Java17: string;
  }

  interface LaunchArguments {
    game: (string | ConditionalArgument)[];
    jvm: (string | ConditionalArgument)[];
  }

  interface ConditionalArgument {
    rules: Rule[];
    value: string | string[];
  }

  interface Rule {
    action: "allow" | "disallow";
    features?: Record<string, boolean>;
    os?: {
      name?: string;
      arch?: string;
      version?: string;
    };
  }

  interface AssetIndex {
    id: string;
    hash: string;
    size: number;
    totalSize: number;
    url: string;
  }

  interface DownloadInfo {
    sha1: string;
    size: number;
    url: string;
  }

  interface Downloads {
    client: DownloadInfo;
    client_mappings: DownloadInfo;
    server: DownloadInfo;
    server_mappings: DownloadInfo;
  }

  interface JavaVersion {
    component: string;
    majorVersion: number;
  }

  interface LibraryDownload {
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

  interface Library {
    downloads: LibraryDownload;
    name: string;
    rules?: Rule[];
  }

  interface MinecraftVersionManifest {
    arguments: LaunchArguments;
    assetIndex: AssetIndex;
    assets: string;
    complianceLevel: number;
    downloads: Downloads;
    id: string;
    javaVersion: JavaVersion;
    libraries: Library[];
  }
  interface AssetFile {
    objects: Record<string, AssetIndex>;
  }
}
