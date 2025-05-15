import { Downloader } from "../components/Handler";
import path from "node:path";

let downloader = new Downloader("./minecraft");

downloader.on("percentDownloaded", (data) => console.log(data));
downloader.download("1.16.5");
