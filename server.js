const express = require("express");
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

// Initialize SwaggerJSdoc
const swaggerDocs = swaggerJsdoc(swaggerOptions);

// Serve Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

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

// Start the server
app.listen(port, () => {
  console.log(`Translation API listening at http://localhost:${port}`);
  console.log(`Swagger UI available at http://localhost:${port}/api-docs`);
});
