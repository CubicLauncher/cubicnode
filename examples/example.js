import { Launcher, Downloader } from "./components/Handler";
const downloader = new Downloader()
const launcher = new Launcher()

async function download() {
    await launcher.launch({
        username: 'santiagolxxnya', // NOMBRE  USUARIO,
        version: '1.16.5', // VERSION DE JUEGO - Varía dependiendo de la instalación.
        type: 'vanilla', // neoforge - optifine - fabric
        gameDirectory: './xd', // RUTA DE JUEGO
        memory: {
            min: '2G', // MINIMO DE MEMORIA PARA USAR
            max: '6G', // MAXIMO DE MEMORIA PARA USAR
        },
        java: 'C:/Program Files/Java/jre1.8.0_451/bin/java.exe',
    })
    // await downloader.download('1.16.5', './xd')
}
launcher.on('debug', (data) => console.log(data));

download();