import { getVersions } from "../components/Handler";

getVersions("release").then((data) => {
  data.forEach((version) => {
    try {
      if (version.id === "1.16.5") {
        console.log(version);
      }
    } catch (err) {
      throw err;
    }
  });
});
