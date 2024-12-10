const express = require("express");
const setupSwagger = require("./config/swagger");
const translateRoutes = require("./routes/translateRoutes");
const statsRoutes = require("./routes/statsRoutes");
const proxyRoutes = require("./routes/proxyRoutes");

const app = express();
app.use(express.json());

setupSwagger(app);

// Route registrations
app.use("/v1/translate", translateRoutes);
app.use("/v1/stats", statsRoutes);
app.use("/v1/proxies", proxyRoutes);

module.exports = app;
