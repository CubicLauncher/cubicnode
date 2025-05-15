import { NeutronLauncher } from "../components/Handler";

const launcher = new NeutronLauncher();

launcher.launchVersion({
  username: "ceplasplas",
  version: "fabric-loader-0.16.14-1.16.5",
  minecraftDir: "./minecraft",
  maxMemory: 2048,
  minMemory: 512,
  isDemo: false,
  accessToken: "1234",
});
