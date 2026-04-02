import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  base: command === "build" ? "/baba-is-you/" : "/",
}));
