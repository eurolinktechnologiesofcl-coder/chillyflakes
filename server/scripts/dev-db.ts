/**
 * Local development database — runs a real PostgreSQL server from npm binaries
 * (no Docker / Homebrew needed). Data lives in server/.pgdata.
 *
 *   npm run db:dev     → starts Postgres on port 5433 and keeps running
 *
 * Production uses any managed/VPS PostgreSQL via DATABASE_URL instead.
 */
import fs from 'node:fs';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

const dataDir = path.resolve(process.cwd(), '.pgdata');
const port = Number(process.env.DEV_DB_PORT || 5433);

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: 'postgres',
    password: 'postgres',
    port,
    persistent: true,
  });

  const fresh = !fs.existsSync(path.join(dataDir, 'PG_VERSION'));
  if (fresh) await pg.initialise();
  await pg.start();
  if (fresh) await pg.createDatabase('chillyflakes');

  console.info(`🐘 Dev PostgreSQL running → postgresql://postgres:postgres@localhost:${port}/chillyflakes`);

  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((err) => {
  console.error('Failed to start dev database:', err);
  process.exit(1);
});
