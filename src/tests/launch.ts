import { Launcher } from "../components/Handler";

const launcher = new Launcher("./minecraft");

launcher.on("debug", (data: string) => console.log(data));
let Instance = launcher.launch({
  username: "santiagolxx", // Ingresa tu nombre de usuario
  version: "1.16.5", // Ingresa la versión de Forge
  memory: {
    // Define la memoria que quieras usar
    min: 512, // Mínimo de memoria
    max: 700, // Máximo de memoria
  },
  java: {
    Java17: "/usr/lib/jvm/java-8-openjdk/bin/java",
    Java8: "/usr/lib/jvm/java-8-openjdk/bin/java",
  },
});
