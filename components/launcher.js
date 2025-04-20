import fs from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import Downloader from './downloader.js';
import { v4 as uuidv4 } from 'uuid';
import EventEmitter from 'events';
import crypto from 'node:crypto';

class MinecraftInstance {
  constructor(process) {
    this.process = process;
  }

  kill() {
    this.process.kill();
  }

  getPid() {
    return this.process.pid;
  }

  onOutput(callback) {
    this.process.stdout.on('data', (data) =>
      callback(data.toString().trim())
    );
    this.process.stderr.on('data', (data) =>
      callback(data.toString().trim())
    );
  }

  onClose(callback) {
    this.process.on('close', callback);
  }

  write(input) {
    if (this.process.stdin.writable) {
      this.process.stdin.write(input);
    }
  }
}

class Launcher {
  constructor() {
    this.downloader = new Downloader(this);
    this.emisor = new EventEmitter();
  }

  #createProfile(root) {
    if (!fs.existsSync(path.resolve(root, 'launcher_profiles.json'))) {
      fs.writeFileSync(
        path.resolve(root, 'launcher_profiles.json'),
        JSON.stringify({ profiles: {} })
      );
    }
  }

  #getJarFiles(directorio, files, ver) {
    const archivos = fs.readdirSync(directorio);
    let archivosJARString = '';

    archivos.forEach((archivo) => {
      const rutaCompleta = path.resolve(directorio, archivo);
      if (fs.statSync(rutaCompleta).isDirectory()) {
        archivosJARString += this.#getJarFiles(rutaCompleta, files, ver);
      } else {
        if (['1.14', '1.14.1', '1.14.2', '1.14.3'].includes(ver)) {
          if (path.extname(archivo) === '.jar' && files.includes(archivo)) {
            archivosJARString += rutaCompleta + ';';
          }
        } else {
          if (
            path.extname(archivo) === '.jar' &&
            files.includes(archivo) &&
            !archivo.includes('3.2.1')
          ) {
            archivosJARString += rutaCompleta + ';';
          }
        }
      }
    });
    return archivosJARString;
  }

  #auth(root, us) {
    const hash = crypto.createHash('md5').update(us).digest('hex');
    return (
      hash.substring(0, 8) +
      '-' +
      hash.substring(8, 12) +
      '-' +
      hash.substring(12, 16) +
      '-' +
      hash.substring(16, 20) +
      '-' +
      hash.substring(20)
    );
  }

  on(event, callback) {
    this.emisor.on(event, callback);
  }

  async launch(options) {
    const minM = options.memory.min;
    const maxM = options.memory.max;
    const rootPath = options.gameDirectory;
    const version = options.version.match(/\b1\.\d+(\.\d+)?\b/g)[0];
    const custom = options.version !== version ? options.version : null;
    const username = options.username;
    let java = options.java;
    let java8 = options.java8;

    const file = JSON.parse(
      fs.readFileSync(
        path.resolve(rootPath, this.downloader.versions, version, `${version}.json`),
        { encoding: 'utf-8' }
      )
    );

    await this.#createProfile(rootPath);

    const uuid = this.#auth(rootPath, username);

    const reqLibs = file.libraries
      .filter((e) => e.downloads && e.downloads.artifact)
      .map((e) => path.basename(e.downloads.artifact.path));

    let mainClass = file.mainClass;

    let gameArgs = [
      '--username', username,
      '--version', version,
      '--gameDir', rootPath,
      '--assetsDir', path.resolve(rootPath, this.downloader.assets),
      '--assetIndex', version,
      '--uuid', uuid,
      '--accessToken', uuid,
      '--userType', 'offline',
      '--userProperties', JSON.stringify({})
    ];

    let jvm = [
      `-Djava.library.path=${path.resolve(rootPath, this.downloader.natives, version)}`,
      `-Xmx${maxM}`,
      `-Xms${minM}`,
      '-XX:HeapDumpPath=MojangTricksIntelDriversForPerformance_javaw.exe_minecraft.exe.heapdump',
      '-Dminecraft.api.env=custom',
      '-Dminecraft.api.auth.host=https://invalid.invalid',
      '-Dminecraft.api.account.host=https://invalid.invalid',
      '-Dminecraft.api.session.host=https://invalid.invalid',
      '-Dminecraft.api.services.host=https://invalid.invalid'
    ];

    if (custom) {
      const customFile = JSON.parse(
        fs.readFileSync(
          path.resolve(rootPath, this.downloader.versions, custom, `${custom}.json`),
          { encoding: 'utf-8' }
        )
      );

      customFile.libraries.forEach((e) => {
        reqLibs.push(e.name.split(':').slice(-2).join('-') + '.jar');
      });

      mainClass = customFile.mainClass;

      if (!customFile.arguments) {
        gameArgs = customFile.minecraftArguments.split(' ');
      } else {
        if (customFile.arguments.jvm) jvm.push(...customFile.arguments.jvm);
        gameArgs.push(...customFile.arguments.game.flatMap((arg) =>
          typeof arg === 'string' ? [arg] : arg.value
        ));
      }

      if (fs.existsSync(path.resolve(rootPath, 'options.txt'))) {
        fs.unlinkSync(path.resolve(rootPath, 'options.txt'));
      }

      if (custom.includes('forge') && version.startsWith('1.20')) {
        const m = custom.split('-');
        const fv = m[m.length - 1].replace('forge', '');
        reqLibs.push(
          `forge-${version}-${fv}-universal.jar`,
          `forge-${version}-${fv}-client.jar`
        );
        if (['1.20', '1.20.1'].includes(version)) reqLibs.push('mergetool-1.1.5-api.jar');
      }
    }

    let libs = this.#getJarFiles(
      path.resolve(rootPath, this.downloader.libraries),
      reqLibs,
      version
    );

    libs += path.resolve(rootPath, this.downloader.versions, version, `${version}.jar`);

    const fields = {
      auth_access_token: uuid,
      auth_session: uuid,
      auth_player_name: username,
      auth_uuid: uuid,
      user_properties: JSON.stringify({}),
      user_type: 'offline',
      version_name: version,
      assets_index_name: version,
      game_directory: path.resolve(rootPath),
      assets_root: path.resolve(rootPath, this.downloader.assets),
      game_assets: path.resolve(rootPath, this.downloader.assets),
      version_type: 'release',
      clientid: uuid,
      resolution_width: 856,
      resolution_height: 482,
      library_directory: path.resolve(rootPath, this.downloader.libraries).split(path.sep).join('/'),
      classpath_separator: ';'
    };

    jvm = jvm.map((str) => str.replace(/\$\{(\w+)\}/g, (_, p1) => fields[p1] || str));

    let args = [...jvm, '-cp', libs, mainClass, ...gameArgs];
    args = args.map((arg) => (fields[arg] ? fields[arg] : arg));

    if (!java) java = 'C:/Program Files/Java/jdk-17/bin/java.exe';
    if (custom && custom.includes('forge') && parseInt(version.split('.')[1]) < 16 && !java8) {
      java = java8 || 'C:/Program Files/Java/jre-1.8/bin/java.exe';
      this.emisor.emit('debug', `USANDO JAVA 8`);
    }

    this.emisor.emit('debug', `INICIANDO MINECRAFT VERSION: ${custom || version}`);
    this.emisor.emit('debug', `ARGUMENTOS: ${args.join(' ')}`);

    const minecraft = spawn(java, args, { cwd: path.resolve(rootPath) });

    minecraft.stdout.on('data', (data) =>
      this.emisor.emit('debug', data.toString().trim())
    );

    minecraft.stderr.on('data', (data) =>
      this.emisor.emit('debug', data.toString().trim())
    );

    minecraft.on('close', (code) =>
      this.emisor.emit('close', code)
    );

    return new MinecraftInstance(minecraft);
  }
}

export default Launcher;
