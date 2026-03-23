import mysql, { Pool } from "mysql2/promise";

declare global {
  var __mysqlPool: Pool | undefined;
}

function getMysqlConfig() {
  const host = process.env.MYSQL_HOST;
  const port = Number(process.env.MYSQL_PORT || "3306");
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE;

  if (!host || !user || !password || !database) {
    return null;
  }

  return { host, port, user, password, database };
}

export function getMysqlPool() {
  const cfg = getMysqlConfig();
  if (!cfg) {
    return null;
  }

  if (!global.__mysqlPool) {
    global.__mysqlPool = mysql.createPool({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: "utf8mb4",
    });
  }

  return global.__mysqlPool;
}
