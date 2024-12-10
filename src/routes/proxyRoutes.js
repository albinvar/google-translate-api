const express = require("express");
const proxyPluginManager = require("../plugins/proxyPluginManager");
const checkAuth = require("../middleware/auth");

const router = express.Router();

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
 *                         example: "103.152.112.157"
 *                       port:
 *                         type: string
 *                         example: "80"
 *                       protocol:
 *                         type: string
 *                         example: "http"
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
router.get("/", checkAuth, async (req, res) => {
  try {
    const proxies = await proxyPluginManager.fetchProxies();
    res.json({ success: true, data: proxies });
  } catch (error) {
    console.error("Error fetching proxies:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch proxies" });
  }
});

module.exports = router;
