import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "scripts/**", "node_modules/**", "e2e/**", "playwright.config.ts", "test-results/**", ".playwright-mcp/**"]),
  {
    rules: {
      // R3F uses non-DOM JSX props (position, args, ...) and mutates refs in frame loops on purpose.
      "react/no-unknown-property": "off",
      "react-hooks/immutability": "off",
    },
  },
]);
