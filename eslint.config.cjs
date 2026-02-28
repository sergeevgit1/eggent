// Backward-compatible ESLint 9 config reusing next/core-web-vitals from .eslintrc.json
// Avoids modern-module-resolution issues from @rushstack/eslint-patch.

const path = require("path");

module.exports = [
  {
    ignores: [".next/**/*", "node_modules/**/*", "dist/**/*", "coverage/**/*"],
  },
  {
    extends: ["next/core-web-vitals"],
    settings: {
      next: {
        rootDir: [path.resolve(process.cwd())],
      },
    },
  },
];
