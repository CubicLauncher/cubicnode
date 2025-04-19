const { launchMinecraft } = require('../index');

launchMinecraft({
    user: {
        username: 'tyasdsd', // NOMBRE DE USUARIO
    },
    version: '1.8', // VERSION DE JUEGO
    type: 'release', // TIPO DE VERSION
    gameDirectory: './minecraft', // RUTA DE JUEGO
    memory: {
        min: '2G', // MINIMO DE MEMORIA PARA USAR
        max: '6G', // MAXIMO DE MEMORIA PARA USAR
    },
    java: 'C:/Program Files/Java/latest/jre-1.8/bin/java.exe', // [OPCIONAL] POR DEFECTO USARÁ LA VERSION DEFAULT DE JAVA INSTALADA
    usersConfig: './users.json' // [OPCIONAL] POR DEFECTO BUSCARA EL ARCHIVO `usercache.json`
});