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
}
