import { defineConfig } from "drizzle-kit";
import * as path from "path";

process.loadEnvFile(path.resolve(__dirname, "../../.env"));

export default defineConfig({
  dialect: "postgresql",
  schema: path.resolve(__dirname, "./src/database/schema.ts"),
  out: path.resolve(__dirname, "./drizzle"),
  dbCredentials: {
    url: process.env.AUTH_SERVICE_DATABASE_URL!,
  },
});

