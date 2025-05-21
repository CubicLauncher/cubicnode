import { Downloader } from "../../";

async function main() {
  const downloader = new Downloader("./minecraft");

  // Escuchar eventos
  downloader.on("downloadFiles", (msg) => {
    console.log(`[Download] ${msg}`);
  });

  downloader.on("percentDownloaded", (percentage) => {
    console.log(
      `[Progress ${percentage.version}] Descargado: ${percentage.percent}%`,
    );
  });

  try {
    const version = "1.16.5"; // Cambia por la versión que quieras descargar
    await downloader.download(version);
    console.log("Descarga completada con éxito.");
  } catch (error) {
    console.error("Error durante la descarga:", error);
  }
}

main();
