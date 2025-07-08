import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  // Next.js recommended config with TypeScript
  ...compat.extends("next/core-web-vitals", "next"),

  // Your custom strict rules
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // ❌ Block `any` usage
      "@typescript-eslint/no-explicit-any": "error",
      // ❌ Block unused variables
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // ❌ Block `var` usage
      "no-var": "error",
      // Enforce consistent type imports
      "@typescript-eslint/consistent-type-imports": "warn",
    },
  },
];
