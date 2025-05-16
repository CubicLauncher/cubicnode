import { getVersions } from "../..";

getVersions("release").then((data) => {
  data.forEach((version) => {
    try {
      if (version.id === "1.16.5") {
        console.log(version);
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  });
});
