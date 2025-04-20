import fs from 'fs'; // Módulo para trabajar con el sistema de archivos
import { spawn } from 'child_process'; // Módulo para crear procesos secundarios
import path from 'path'; // Módulo para trabajar con rutas de archivos y directorios
import Downloader from './downloader.js'; // Módulo de descarga personalizado (con extensión .js)
import { v4 as uuidv4 } from 'uuid'; // Módulo para generar UUID
import EventEmitter from 'events'; // Módulo para emitir eventos
import crypto from 'node:crypto'

/**
 * Clase Launcher para gestionar el lanzamiento de Minecraft.
 */
class Launcher {
  constructor() {
    // Importa funciones personalizadas
    this.downloader = new Downloader(this);
    // Define el emisor de eventos
    this.emisor = new EventEmitter();
  }

  /**
   * Método para crear el perfil de lanzamiento si no existe.
   * @param {String} root - Ruta del directorio raíz del juego.
   */
  #createProfile(root) {
    if (!fs.existsSync(path.resolve(root, 'launcher_profiles.json'))) {
      fs.writeFileSync(
        path.resolve(root, 'launcher_profiles.json'),
        JSON.stringify({ profiles: {} })
      );
    }
  }

  /**
   * Método para encontrar archivos JAR en un directorio y subdirectorios.
   * @param {String} directorio - Directorio a explorar.
   * @param {Array} files - Lista de archivos a buscar.
   * @param {String} ver - Versión de Minecraft.
   * @returns {String} - Cadena de archivos JAR encontrados.
   */
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

  /**
   * Método para autenticar al usuario y obtener su UUID.
   * @param {String} root - Ruta del directorio raíz del juego.
   * @param {String} us - Nombre de usuario.
   * @returns {String} - UUID del usuario.
   */
  #auth(root, us) {
    const hash = crypto.createHash('md5').update(us).digest('hex');
    return hash.substring(0, 8) + '-' + 
           hash.substring(8, 12) + '-' + 
           hash.substring(12, 16) + '-' + 
           hash.substring(16, 20) + '-' + 
           hash.substring(20);
  }

  /**
   * Emite el evento
   * @param {String} event - Nombre del evento
   * @param {String} args - Argumentos que se pasarán al evento
   * @return {String} - Data del evento
   */
  emisor(event, args) {
    this.emisor.emit(event, ...args);
  }

  /**
   * Escucha el evento
   * @param {String} event - Nombre del evento
   * @param {String} callback - Función personalizada
   * @return {String} - Data del evento
   */
  on(event, callback) {
    this.emisor.on(event, callback);
  }

  /**
   * Método para lanzar el juego Minecraft.
   * @param {Object} options - Opciones de lanzamiento del juego.
   */
  async launch(options) {
    const minM = options.memory.min;
    const maxM = options.memory.max;
    const rootPath = options.gameDirectory;
    const version = options.version.match(/\b1\.\d+(\.\d+)?\b/g)[0];
    const custom = options.version !== version ? options.version : null;
    const username = options.username;
    let java = options.java;
    let java8 = options.java8;

    // Leer JSON de la versión base
    const file = JSON.parse(
      fs.readFileSync(
        path.resolve(rootPath, this.downloader.versions, version, `${version}.json`),
        { encoding: 'utf-8' }
      )
    );

    // Asegurar perfil
    await this.#createProfile(rootPath);

    // Generar UUID offline
    const uuid = this.#auth(rootPath, username);

    // Obtener lista de librerías requeridas
    const reqLibs = file.libraries
      .filter((e) => e.downloads && e.downloads.artifact)
      .map((e) => path.basename(e.downloads.artifact.path));

    // Clase principal y argumentos por defecto
    let mainClass = file.mainClass;
    let gameArgs;

    // Si es 1.16.5 forzamos parámetros clásicos offline
    if (version === '1.16.5') {
      gameArgs = [
        '--username',      username,
        '--version',       version,
        '--gameDir',       rootPath,
        '--assetsDir',     path.resolve(rootPath, this.downloader.assets),
        '--assetIndex',    version,
        '--uuid',          uuid,
        '--xuid',          uuid,
        '--accessToken',   uuid,
        '--userType',      'offline',
        '--userProperties','{}'
      ];
    } else {
      gameArgs = file.minecraftArguments
        ? file.minecraftArguments.split(' ')
        : file.arguments.game;
    }

    // Configuración JVM básica
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

    // Si hay versión personalizada (mods, forges, etc.)
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
        gameArgs.push(...customFile.arguments.game);
      }
      if (fs.existsSync(path.resolve(rootPath, 'options.txt'))) {
        fs.unlinkSync(path.resolve(rootPath, 'options.txt'));
      }
      // Ejemplo de forge en 1.20
      if (custom.includes('forge') && version.startsWith('1.20')) {
        const m = custom.split('-');
        const fv = m[m.length - 1].replace('forge', '');
        reqLibs.push(
          `forge-${version}-${fv}-universal.jar`,
          `forge-${version}-${fv}-client.jar`
        );
        if (['1.20','1.20.1'].includes(version)) reqLibs.push('mergetool-1.1.5-api.jar');
      }
    }

    // Construir classpath con librerías encontradas
    let libs = this.#getJarFiles(
      path.resolve(rootPath, this.downloader.libraries),
      reqLibs,
      version
    );
    libs += path.resolve(rootPath, this.downloader.versions, version, `${version}.jar`);

    // Mapeo de placeholders a valores offline
    const fields = {
      auth_access_token: uuid,
      auth_session:      uuid,
      auth_player_name:  username,
      auth_uuid:         uuid,
      auth_xuid:         uuid,
      user_properties:   '{}',
      user_type:         'offline',
      version_name:      version,
      assets_index_name: version,
      game_directory:    path.resolve(rootPath),
      assets_root:       path.resolve(rootPath, this.downloader.assets),
      game_assets:       path.resolve(rootPath, this.downloader.assets),
      version_type:      'release',
      clientid:          uuid,
      resolution_width:  856,
      resolution_height: 482,
      library_directory: path
        .resolve(rootPath, this.downloader.libraries)
        .split(path.sep)
        .join('/'),
      classpath_separator:';'
    };

    // Sustitución de placeholders en JVM args
    jvm = jvm.map((str) => str.replace(/\$\{(\w+)\}/g, (_, p1) => fields[p1] || str));

    // Construir línea de comandos completa
    let args = [...jvm, '-cp', libs, mainClass, ...gameArgs];
    args = args.map((arg) => (fields[arg] ? fields[arg] : arg));

    // Selección de Java
    if (!java) java = 'C:/Program Files/Java/jdk-17/bin/java.exe';
    if (custom && custom.includes('forge') && parseInt(version.split('.')[1]) < 16 && !java8) {
      java = java8 || 'C:/Program Files/Java/jre-1.8/bin/java.exe';
      this.emisor.emit('debug', `USANDO JAVA 8`);
    }

    // Lanzar proceso Minecraft
    const minecraft = spawn(java, args, { cwd: path.resolve(rootPath) });
    this.emisor.emit('debug', `INICIANDO MINECRAFT VERSION: ${custom || version}`);
    this.emisor.emit('debug', `ARGUMENTOS: ${args.join(' ')}`);
    minecraft.stdout.on('data', (data) => this.emisor.emit('debug', data.toString().trim()));
    minecraft.stderr.on('data', (data) => this.emisor.emit('debug', data.toString().trim()));
  }
}

export default Launcher;
