/** This file configures Vite for the Nexus demo React frontend. */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** Exports the Vite configuration used by dev, build, and preview commands. */
export default defineConfig({
  plugins: [react()],
});
