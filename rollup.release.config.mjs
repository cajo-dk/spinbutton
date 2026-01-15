import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import postcss from 'rollup-plugin-postcss';
import terser from '@rollup/plugin-terser';
import json from '@rollup/plugin-json';
import commonjs from '@rollup/plugin-commonjs';
import del from 'rollup-plugin-delete';

const isProduction = !process.env.ROLLUP_WATCH;

export default {
  input: 'src/spinbutton.ts',
  output: {
    dir: 'P:/www/spinbutton',
    format: 'es',
    sourcemap: !isProduction
  },
  onwarn(warning, warn) {
    // Silence "this is undefined" warnings
    if (warning.code === 'THIS_IS_UNDEFINED') return;
    warn(warning);
  },
  plugins: [
    del({ targets: 'P:/www/spinbutton/*', force: true }),
    commonjs({
      include: /node_modules/,
      context: 'window'
    }),
    json(),
    resolve({ extensions: ['.ts', '.js', '.css'] }),
    postcss({ inject: true, modules: false, extensions: ['.css'] }),
    typescript({
      tsconfig: './tsconfig.json',
      sourceMap: !isProduction,
      inlineSources: !isProduction
    }),
    isProduction && terser()
  ]
};
