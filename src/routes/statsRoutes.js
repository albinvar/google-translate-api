const express = require("express");
const { fetchStats } = require("../services/databaseService");
const checkAuth = require("../middleware/auth");

const router = express.Router();

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
 *                 globalStats:
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
 *                 perLanguageStats:
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
 *                 perIpStats:
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
router.get("/", checkAuth, async (req, res) => {
  try {
    const stats = await fetchStats();
    res.json({
      success: true,
      globalStats: stats.globalStats[0],
      perLanguageStats: stats.perLanguageStats,
      perIpStats: stats.perIpStats,
    });
  } catch (error) {
    console.error("Error fetching stats:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to retrieve stats" });
  }
});

module.exports = router;
