require("dotenv").config(); // Load environment variables from .env
const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const sqlite3 = require("sqlite3").verbose();
const { HttpProxyAgent } = require("http-proxy-agent");
const { translate } = require("@vitalets/google-translate-api");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const app = express();
const apitoken = process.env.API_TOKEN || "you-are-lucky";
const port = process.env.PORT || 3000;

// Create a router for API v1
const v1Router = express.Router();

// Middleware to parse JSON body
app.use(express.json());

// Initialize SQLite Database
const db = new sqlite3.Database("./data/stats.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to SQLite database");
    // Create tables if they don't exist
    db.run(
      `CREATE TABLE IF NOT EXISTS stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip TEXT,
        language TEXT,
        characters_translated INTEGER,
        outcome TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    );
  }
});

// Helper function to insert stats into the database
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

// Helper function to fetch stats from the database
// Helper function to fetch stats from the database
const fetchStats = async () => {
  return new Promise((resolve, reject) => {
    const queries = {
      globalStats: `
        SELECT 
          COUNT(*) AS total_requests,
          SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) AS successful_requests,
          SUM(CASE WHEN outcome = 'failure' THEN 1 ELSE 0 END) AS failed_requests,
          SUM(characters_translated) AS total_characters,
          COUNT(DISTINCT ip) AS unique_ips
        FROM stats
      `,
      perLanguageStats: `
        SELECT 
          language,
          COUNT(*) AS total_requests,
          SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) AS successful_requests,
          SUM(CASE WHEN outcome = 'failure' THEN 1 ELSE 0 END) AS failed_requests,
          SUM(characters_translated) AS total_characters
        FROM stats
        GROUP BY language
      `,
      perIpStats: `
        SELECT 
          ip,
          COUNT(*) AS request_count,
          SUM(characters_translated) AS total_characters
        FROM stats
        GROUP BY ip
      `,
    };

    const results = {};
    let pendingQueries = Object.keys(queries).length;

    for (const [key, query] of Object.entries(queries)) {
      db.all(query, [], (err, rows) => {
        if (err) {
          return reject(err);
        }
        results[key] = rows;
        if (--pendingQueries === 0) {
          resolve(results);
        }
      });
    }
  });
};

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Translation API",
      version: "1.0.0",
      description: "API for translating text using Google Translate",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter 'Bearer <your-token-here>'",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./server.js"], // This points to the file with the JSDoc comments
};

// Initialize SwaggerJSdoc
const swaggerDocs = swaggerJsdoc(swaggerOptions);

// Serve Swagger UI
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

let cachedProxies = [];
let lastFetchedTime = null;

// Middleware to check Bearer token
const checkAuth = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) {
    return res
      .status(401)
      .json({ error: "Unauthorized: Missing or invalid Bearer Token" });
  }

  // Remove the "Bearer " part of the token
  const tokenValue = token.split(" ")[1];

  // You can validate the token here, e.g., by verifying JWT
  if (!tokenValue || tokenValue !== apitoken) {
    return res
      .status(401)
      .json({ error: "Unauthorized: Invalid Bearer Token" });
  }

  // Proceed to the next middleware or route handler
  next();
};

// Helper function to scrape proxy list
const scrapeProxyList = async () => {
  const url = "https://free-proxy-list.net/";
  try {
    const now = Date.now();
    const cacheDuration = 5 * 60 * 1000; // 5 minutes

    // Return cached proxies if they are fresh
    if (
      cachedProxies.length > 0 &&
      lastFetchedTime &&
      now - lastFetchedTime < cacheDuration
    ) {
      return cachedProxies;
    }

    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const proxies = [];

    $("table.table tbody tr").each((index, element) => {
      const row = $(element).find("td");

      const ip = $(row[0]).text().trim();
      const port = $(row[1]).text().trim();
      const country = $(row[3]).text().trim();
      const anonymity = $(row[4]).text().trim().toLowerCase();
      const google = $(row[5]).text().trim().toLowerCase();

      // Basic validation and filtering for proxies
      const isValidIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(ip);
      const isValidPort = !isNaN(port) && port > 0 && port <= 65535;

      if (
        isValidIp &&
        isValidPort &&
        anonymity === "anonymous" &&
        google === "yes"
      ) {
        proxies.push({
          ip,
          port,
          country,
          anonymity,
          google,
        });
      }
    });

    cachedProxies = proxies;
    lastFetchedTime = now;
    return proxies;
  } catch (error) {
    if (cachedProxies.length > 0) {
      console.warn("Using stale cache due to fetch failure");
      return cachedProxies;
    }
    console.error("Error scraping proxy list:", error.message);
    throw new Error("Failed to fetch proxy list.");
  }
};

// Function to use proxy and translate
const translateWithProxy = async (text, lang, proxies, maxRetries = 15) => {
  // Attempt translation without a proxy first
  try {
    const { text: translatedText } = await translate(text, { to: lang });
    return {
      success: true,
      translatedText,
      proxyEnabled: false,
      proxyIp: null,
      retries: 0,
    };
  } catch (initialError) {
    console.log("Initial translation failed. Falling back to proxies...");
  }

  // If the initial attempt fails, use proxies
  let retries = 0;
  let proxyUsed = null;

  while (retries < maxRetries && proxies.length > retries) {
    const proxy = proxies[retries];
    const proxyString = `${proxy.ip}:${proxy.port}`;
    const fetchOptions = {
      agent: new HttpProxyAgent(`http://${proxyString}`),
    };

    try {
      proxyUsed = proxy;
      const { text: translatedText } = await translate(text, {
        to: lang,
        fetchOptions,
      });
      return {
        success: true,
        translatedText,
        proxyEnabled: true,
        proxyIp: proxy.ip,
        retries: retries + 1,
      };
    } catch (error) {
      retries++;
      console.log(`Proxy ${proxyString} failed. Retrying with next proxy...`);
    }
  }

  return {
    success: false,
    message: "All proxies failed.",
    proxyEnabled: true,
    proxyIp: proxyUsed ? proxyUsed.ip : null,
    retries,
  };
};

// Translation endpoint with proxy logic
/**
 * @swagger
 * /v1/translate:
 *   post:
 *     summary: Translate text into the target language with proxy support
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 description: Text to be translated
 *                 example: "Hello"
 *               lang:
 *                 type: string
 *                 description: Language to translate into (e.g., 'mn' for Mongolian)
 *                 example: "mn"
 *     responses:
 *       200:
 *         description: Successfully translated text
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 translatedText:
 *                   type: string
 *                   example: "Сайн уу"
 *       400:
 *         description: Bad request if required fields are missing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Text and lang are required."
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized: Missing or invalid Bearer Token"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to translate after multiple retries"
 *                 proxyEnabled:
 *                   type: boolean
 *                   example: true
 *                 proxyIp:
 *                   type: string
 *                   example: "161.123.115.53"
 *                 retries:
 *                   type: integer
 *                   example: 15
 */
v1Router.post("/translate", checkAuth, async (req, res) => {
  const { text, lang } = req.body;
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

  if (!text || !lang) {
    recordStats(ip, lang, 0, "failure");
    return res.status(400).json({ error: "Text and lang are required." });
  }

  try {
    const proxies = await scrapeProxyList();
    const result = await translateWithProxy(text, lang, proxies);

    if (result.success) {
      recordStats(ip, lang, text.length, "success");
      res.json({
        translatedText: result.translatedText,
        proxyEnabled: false,
        proxyIp: null,
        retries: 0,
      });
    } else {
      recordStats(ip, lang, 0, "failure");
      res.status(500).json({
        success: false,
        message: result.message,
        proxyEnabled: result.proxyEnabled,
        proxyIp: result.proxyIp,
        retries: result.retries,
      });
    }
  } catch (error) {
    recordStats(ip, lang, 0, "failure");
    res.status(500).json({
      success: false,
      message: "Failed to fetch proxies or translate text",
    });
  }
});

/**
 * @swagger
 * /v1/proxies:
 *   get:
 *     summary: Fetch a list of free proxies
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully fetched the proxy list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       ip:
 *                         type: string
 *                         example: "103.152.112.120"
 *                       port:
 *                         type: string
 *                         example: "80"
 *                       code:
 *                         type: string
 *                         example: "US"
 *                       country:
 *                         type: string
 *                         example: "United States"
 *                       anonymity:
 *                         type: string
 *                         example: "anonymous"
 *                       google:
 *                         type: string
 *                         example: "yes"
 *                       https:
 *                         type: string
 *                         example: "no"
 *                       lastChecked:
 *                         type: string
 *                         example: "9 secs ago"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized: Missing or invalid Bearer Token"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to fetch proxies"
 */
v1Router.get("/proxies", checkAuth, async (req, res) => {
  try {
    const proxies = await scrapeProxyList();
    res.json({ success: true, data: proxies });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch proxies" });
  }
});

/**
 * @swagger
 * /v1/stats:
 *   get:
 *     summary: Retrieve server statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved server statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 global_stats:
 *                   type: object
 *                   properties:
 *                     total_requests:
 *                       type: integer
 *                       example: 120
 *                     successful_requests:
 *                       type: integer
 *                       example: 110
 *                     failed_requests:
 *                       type: integer
 *                       example: 10
 *                     total_characters:
 *                       type: integer
 *                       example: 25000
 *                     unique_ips:
 *                       type: integer
 *                       example: 5
 *                 per_language_stats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       language:
 *                         type: string
 *                         example: "en"
 *                       total_requests:
 *                         type: integer
 *                         example: 60
 *                       successful_requests:
 *                         type: integer
 *                         example: 55
 *                       failed_requests:
 *                         type: integer
 *                         example: 5
 *                       total_characters:
 *                         type: integer
 *                         example: 15000
 *                 per_ip_stats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       ip:
 *                         type: string
 *                         example: "192.168.1.1"
 *                       request_count:
 *                         type: integer
 *                         example: 15
 *                       total_characters:
 *                         type: integer
 *                         example: 3500
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized: Missing or invalid Bearer Token"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to retrieve server statistics"
 */
// Stats endpoint
v1Router.get("/stats", checkAuth, async (req, res) => {
  try {
    const { globalStats, perLanguageStats, perIpStats } = await fetchStats();

    res.json({
      success: true,
      global_stats: globalStats[0], // Assumes single row for global stats
      per_language_stats: perLanguageStats,
      per_ip_stats: perIpStats,
    });
  } catch (error) {
    console.error("Error retrieving stats:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve stats",
    });
  }
});

// Use the router with a prefix
app.use("/v1", v1Router);

// Start the server
app.listen(port, () => {
  console.log(`Translation API listening at http://localhost:${port}`);
  console.log(`Swagger Docs at http://localhost:${port}/api`);
});
