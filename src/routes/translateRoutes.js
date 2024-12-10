const express = require("express");
const { translateWithProxy } = require("../services/translateService");
const { fetchProxies } = require("../services/proxyService");
const { recordStats } = require("../services/databaseService");
const checkAuth = require("../middleware/auth");

const router = express.Router();

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
 *                 proxyUsed:
 *                   type: string
 *                   example: "161.123.115.53"
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
 */
router.post("/", checkAuth, async (req, res) => {
  const { text, lang } = req.body;
  if (!text || !lang) return res.status(400).json({ error: "Missing fields" });

  // Fetch proxies using the proxy service
  const proxies = await fetchProxies();

  // Perform translation with proxies
  const result = await translateWithProxy(text, lang, proxies);

  // Record translation stats
  recordStats(
    req.ip,
    lang,
    text.length,
    result.success ? "success" : "failure"
  );

  // Respond with the translation result
  res.json(result);
});

module.exports = router;
