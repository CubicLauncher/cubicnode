import Launcher from '../components/launcher.js';

const launcher = new Launcher();

// Crear un perfil personalizado
const perfil = launcher.profileManager.createProfile({
  name: "Perfil PvP",
  version: "1.16.5",
  memory: { min: "1G", max: "2G" },
  gameDirectory: "C:/Users/Santi/AppData/Roaming/cubic/.minecraft",
  java: "C:/Program Files/Java/jre1.8.0_451/bin/java.exe",
  username: "Steve"
});

console.log("Perfil creado:", perfil);

// Listar todos los perfiles
const perfiles = launcher.profileManager.listProfiles();
console.log("Perfiles disponibles:", perfiles);

// Lanzar Minecraft con el primer perfil
const perfilSeleccionado = perfiles[0];
launcher.launchInstance(perfilSeleccionado).then(instance => {
  console.log("Minecraft lanzado con PID:", instance.getPid());
  instance.onOutput(console.log);
  instance.onClose(code => console.log("Minecraft cerrado con código:", code));
});
