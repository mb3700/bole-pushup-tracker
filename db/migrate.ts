
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import ws from "ws";

const runMigrate = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }

  const db = drizzle({ connection: process.env.DATABASE_URL, schema: {}, ws });

  console.log("Running migrations...");

  await migrate(db, { migrationsFolder: "migrations" });

  console.log("Migrations completed!");
  process.exit(0);
};

runMigrate().catch((err) => {
  console.error("Migration failed!");
  console.error(err);
  process.exit(1);
});
