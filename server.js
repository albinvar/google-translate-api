const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const { HttpProxyAgent } = require("http-proxy-agent");
const { translate } = require("@vitalets/google-translate-api");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const app = express();
const port = process.env.PORT || 3000;

// Create a router for API v1
const v1Router = express.Router();

// Middleware to parse JSON body
app.use(express.json());

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
  if (!tokenValue || tokenValue !== "your-valid-token") {
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

      // Basic validation for proxies
      const isValidIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(ip);
      const isValidPort = !isNaN(port) && port > 0 && port <= 65535;
      const isValidCountry = country && !/^\d+%$/.test(country); // Exclude percentage-like countries

      if (isValidIp && isValidPort && isValidCountry) {
        proxies.push({
          ip,
          port,
          country,
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

  if (!text || !lang) {
    return res.status(400).json({ error: "Text and lang are required." });
  }

  try {
    const proxies = await scrapeProxyList();
    const result = await translateWithProxy(text, lang, proxies);

    if (result.success) {
      res.json({
        translatedText: result.translatedText,
        proxyEnabled: false,
        proxyIp: null,
        retries: 0,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        proxyEnabled: result.proxyEnabled,
        proxyIp: result.proxyIp,
        retries: result.retries,
      });
    }
  } catch (error) {
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

// Use the router with a prefix
app.use("/v1", v1Router);

// Start the server
app.listen(port, () => {
  console.log(`Translation API listening at http://localhost:${port}`);
  console.log(`Swagger Docs at http://localhost:${port}/api`);
});
