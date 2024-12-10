const db = require("../config/database");

const recordStats = (ip, language, characters, outcome) => {
  db.run(
    `INSERT INTO stats (ip, language, characters_translated, outcome) VALUES (?, ?, ?, ?)`,
    [ip, language, characters, outcome],
    (err) => {
      if (err) {
        console.error("Error inserting stats:", err.message);
      }
    }
  );
};

const fetchStats = async () => {
  const queries = {
    globalStats: `
            SELECT COUNT(*) AS total_requests,
                   SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) AS successful_requests,
                   SUM(CASE WHEN outcome = 'failure' THEN 1 ELSE 0 END) AS failed_requests,
                   SUM(characters_translated) AS total_characters,
                   COUNT(DISTINCT ip) AS unique_ips
            FROM stats
        `,
    perLanguageStats: `
            SELECT language, COUNT(*) AS total_requests,
                   SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) AS successful_requests,
                   SUM(CASE WHEN outcome = 'failure' THEN 1 ELSE 0 END) AS failed_requests,
                   SUM(characters_translated) AS total_characters
            FROM stats
            GROUP BY language
        `,
    perIpStats: `
            SELECT ip, COUNT(*) AS request_count, SUM(characters_translated) AS total_characters
            FROM stats
            GROUP BY ip
        `,
  };

  const results = {};
  let pendingQueries = Object.keys(queries).length;

  return new Promise((resolve, reject) => {
    for (const [key, query] of Object.entries(queries)) {
      db.all(query, [], (err, rows) => {
        if (err) return reject(err);
        results[key] = rows;
        if (--pendingQueries === 0) resolve(results);
      });
    }
  });
};

module.exports = { recordStats, fetchStats };
