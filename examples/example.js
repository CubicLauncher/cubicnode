/*! Cubic Neutron
 * ©2025 Cubic Neutron - https://github.com/CubicLauncher
*/

import { Launcher, Downloader } from "../components/Handler";
const downloader = new Downloader()
const launcher = new Launcher()

async function download() {
    await launcher.launch({
        // username: 'username', // NOMBRE  USUARIO,
        // version: '1.16.5', // VERSION DE JUEGO - Varía dependiendo de la instalación.
        // type: 'vanilla', // neoforge - optifine - fabric
        // gameDirectory: './minecraft', // RUTA DE JUEGO
        // memory: {
        //     min: '2G', // MINIMO DE MEMORIA PARA USAR
        //     max: '6G', // MAXIMO DE MEMORIA PARA USAR
        // },
        // java: 'C:/Program Files/Java/jre1.8.0_451/bin/java.exe',
    })

    // Legacy abajo de la 1.9
    //await launcher.launch({
        //username: 'santiagolxxnya',
        //version: '1.8.8',
        //type: 'vanilla',
        //gameDirectory: './minecraft',
        //memory: {
            //min: '2G',
            //max: '6G'
        //},
        //java: 'C:/Program Files/Java/jre1.8.0_451/bin/java.exe'
    //});

    // await downloader.download('1.16.5', './minecraft')
}

launcher.on('debug', (data) => console.log(data));
downloader.on('downloadFiles', (data) => console.log(data)); // Se encarga de mostrar los paquetes de archivos que se están descargando.
downloader.on('percentDownloaded', (data) => console.log(data));

download();
