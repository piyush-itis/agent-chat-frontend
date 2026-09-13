import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

const reactRoot = resolve(__dirname, "../node_modules/.pnpm/react@19.2.8/node_modules/react");
const reactDomRoot = resolve(
  __dirname,
  "../node_modules/.pnpm/react-dom@19.2.8_react@19.2.8/node_modules/react-dom",
);

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["./src/test/setup.tsx"],
    server: {
      deps: {
        inline: ["@testing-library/react", "@testing-library/dom", "@base-ui/react", "cn"],
      },
    },
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": resolve(__dirname, "src"),
      react: reactRoot,
      "react/jsx-runtime": resolve(reactRoot, "jsx-runtime.js"),
      "react/jsx-dev-runtime": resolve(reactRoot, "jsx-dev-runtime.js"),
      "react-dom": reactDomRoot,
      "react-dom/client": resolve(reactDomRoot, "client.js"),
    },
  },
});
