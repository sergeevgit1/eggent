import { FlatCompat } from "@eslint/eslintrc";
import path from "path";

const compat = new FlatCompat({
  baseDirectory: path.resolve(process.cwd()),
  resolvePluginsRelativeTo: path.resolve(process.cwd()),
});

export default [
  {
    ignores: [
      ".next/**/*",
      "node_modules/**/*",
      "dist/**/*",
      "coverage/**/*",
      "src/lib/vendor/pdf-parse/lib/pdf.js/**/*",
    ],
  },
  ...compat.extends("next/core-web-vitals"),
];
