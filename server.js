const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const translate = require("vitalets/google-translate-api");
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
  },
  // Path to the API docs
  apis: ["./server.js"], // This points to the file with the JSDoc comments
};

// Initialize SwaggerJSdoc
const swaggerDocs = swaggerJsdoc(swaggerOptions);

// Serve Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Translation endpoint
/**
 * @swagger
 * /translate:
 *   post:
 *     description: Translate text into the target language
 *     parameters:
 *       - name: text
 *         in: body
 *         description: Text to translate
 *         required: true
 *         schema:
 *           type: string
 *       - name: targetLang
 *         in: body
 *         description: Language to translate into
 *         required: true
 *         schema:
 *           type: string
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
 *       400:
 *         description: Bad request if required fields are missing
 *       500:
 *         description: Internal server error
 */
app.post("/translate", (req, res) => {
  const { text, targetLang } = req.body;

  if (!text || !targetLang) {
    return res
      .status(400)
      .json({ error: "Text and target language are required." });
  }

  translate(text, { to: targetLang })
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
