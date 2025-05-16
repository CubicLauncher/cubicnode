import { NeutronLauncher } from "../../";

const launcher = new NeutronLauncher();

launcher.launchVersion({
  username: "santiagolxx",
  uuid: "1234",
  javaPath: "/usr/lib/jvm/java-21-openjdk/bin/java",
  accessToken: "1234",
  minecraftDir: "./minecraft",
  version: "1.21.5",
  isCracked: false,
});
