const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./data/stats.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to SQLite database");
    db.run(`
            CREATE TABLE IF NOT EXISTS stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ip TEXT,
                language TEXT,
                characters_translated INTEGER,
                outcome TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
  }
});

module.exports = db;
