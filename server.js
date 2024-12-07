const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const { translate } = require("@vitalets/google-translate-api");
const app = express();
const port = 3000;

// Middleware to parse JSON body
app.use(express.json());

// Swagger definition (basic info, paths, etc.)
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

let cachedProxies = [];
let lastFetchedTime = null;

// Helper function to scrape proxy list
const scrapeProxyList = async () => {
  const url = "https://free-proxy-list.net/";
  try {
    const now = Date.now();
    const cacheDuration = 5 * 60 * 1000; // 5 minutes

    if (
      cachedProxies.length > 0 &&
      lastFetchedTime &&
      now - lastFetchedTime < cacheDuration
    ) {
      return cachedProxies;
    }

    // Fetch new proxies
    const url = "https://free-proxy-list.net/";
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const proxies = [];

    $("table.table tbody tr").each((index, element) => {
      const row = $(element).find("td");
      proxies.push({
        ip: $(row[0]).text(),
        port: $(row[1]).text(),
        code: $(row[2]).text(),
        country: $(row[3]).text(),
        anonymity: $(row[4]).text(),
        google: $(row[5]).text(),
        https: $(row[6]).text(),
        lastChecked: $(row[7]).text(),
      });
    });

    cachedProxies = proxies;
    lastFetchedTime = now;
    return proxies;
  } catch (error) {
    console.error("Error scraping proxy list:", error.message);
    throw new Error("Failed to fetch proxy list.");
  }
};

// Initialize SwaggerJSdoc
const swaggerDocs = swaggerJsdoc(swaggerOptions);

// Serve Swagger UI
app.use("/api", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Middleware for Bearer Token Authentication
app.use((req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Unauthorized: Missing Bearer Token" });
  }

  const token = authHeader.split(" ")[1];
  // Replace this with your actual token validation logic
  if (token !== "your-secret-token") {
    return res.status(403).json({ error: "Forbidden: Invalid Token" });
  }

  next();
});

// Translation endpoint
/**
 * @swagger
 * /translate:
 *   post:
 *     summary: Translate text into the target language
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
 *                 error:
 *                   type: string
 *                   example: "Translation failed"
 */

app.post("/translate", (req, res) => {
  const { text, lang } = req.body;

  if (!text || !lang) {
    return res.status(400).json({ error: "Text and lang are required." });
  }

  translate(text, { to: lang })
    .then((response) => {
      res.json({ translatedText: response.text });
    })
    .catch((error) => {
      res
        .status(500)
        .json({ error: "Translation failed", details: error.message });
    });
});

/**
 * @swagger
 * /proxies:
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
 *                   example: "Failed to fetch proxy list."
 */
// API endpoint to return proxy list
app.get("/proxies", async (req, res) => {
  try {
    const proxies = await scrapeProxyList();
    res.json({ success: true, data: proxies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Translation API listening at http://localhost:${port}`);
  console.log(`Swagger UI available at http://localhost:${port}/api`);
});
