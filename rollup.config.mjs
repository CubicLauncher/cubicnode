import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'unpacked/index.js',
  output: {
    file: 'dist/index.js',
    format: 'esm',
    sourcemap: true,
  },
  plugins: [
    resolve({ extensions: ['.js'] }),
    commonjs()
  ],
  external: ['child_process', 'events'] // tus deps nativas o externas
};