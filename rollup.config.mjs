import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/index.ts",
  output: {
    file: "dist/index.js",
    format: "esm",
    sourcemap: true,
  },
  plugins: [
    typescript({
      tsconfig: "./tsconfig.json"
    }),
    resolve({ extensions: [".js", ".ts"] }),
    commonjs()
  ],
  external: ["child_process", "events"],
};