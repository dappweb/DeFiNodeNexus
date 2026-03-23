const mysql = require("mysql2/promise");

async function initAnnouncementsTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS announcements (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      type ENUM('update','news','maintenance','event') NOT NULL DEFAULT 'update',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX announcements_created_at_idx (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const [countRows] = await connection.query("SELECT COUNT(*) AS total FROM announcements");
  const total = Array.isArray(countRows) && countRows[0] ? countRows[0].total : 0;
  console.log(`Initialization complete. announcements rows: ${total}`);
}

async function main() {
  const host = process.env.MYSQL_HOST;
  const port = Number(process.env.MYSQL_PORT || "3306");
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE || "aidapp1a";

  if (!host || !user || !password) {
    throw new Error("Missing MYSQL_HOST / MYSQL_USER / MYSQL_PASSWORD");
  }

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      connectTimeout: 10000,
      multipleStatements: true,
    });

    const [versionRows] = await connection.query("SELECT VERSION() AS version");
    const version = Array.isArray(versionRows) && versionRows[0] ? versionRows[0].version : "unknown";
    console.log(`Connected to MySQL: ${version}`);
    console.log(`Using database: ${database}`);

    await initAnnouncementsTable(connection);
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Access denied") || !message.includes("to database")) {
      throw error;
    }

    console.log(`No access to database \"${database}\". Probing accessible databases...`);
  } finally {
    if (connection) {
      await connection.end();
    }
  }

  const rootConnection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    connectTimeout: 10000,
  });

  try {
    const [dbRows] = await rootConnection.query("SHOW DATABASES");
    const dbNames = Array.isArray(dbRows)
      ? dbRows
          .map((row) => {
            const values = Object.values(row);
            return String(values[0] || "");
          })
          .filter(Boolean)
      : [];

    if (dbNames.length === 0) {
      throw new Error("Connected, but no visible databases for this user");
    }

    console.log(`Visible databases: ${dbNames.join(", ")}`);

    const targetDb = dbNames.includes(database) ? database : dbNames[0];
    await rootConnection.query(`USE \`${targetDb}\``);
    console.log(`Using fallback database: ${targetDb}`);

    await initAnnouncementsTable(rootConnection);
  } finally {
    await rootConnection.end();
  }
}

main().catch((error) => {
  console.error("MySQL test/init failed:", error.message);
  process.exitCode = 1;
});
