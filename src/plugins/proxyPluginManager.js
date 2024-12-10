const proxiflyPlugin = require("./proxiflyPlugin");
const scrapeProxyPlugin = require("./scrapeProxyPlugin");
const proxyFreeOnlyPlugin = require("./proxyFreeOnlyPlugin");
const spysOnePlugin = require("./spysOnePlugin");

const cache = {
  proxies: [],
  lastFetched: null,
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Dynamically load plugins based on environment variables
const plugins = [];

if (process.env.ENABLE_SCRAPE_PROXY_PLUGIN === "true") {
  plugins.push(scrapeProxyPlugin);
}

if (process.env.ENABLE_PROXY_FREE_ONLY_PLUGIN === "true") {
  plugins.push(proxyFreeOnlyPlugin);
}

if (process.env.ENABLE_PROXIFLY_PLUGIN === "true") {
  plugins.push(proxiflyPlugin);
}

if (process.env.ENABLE_SPYS_ONE_PLUGIN === "true") {
  plugins.push(spysOnePlugin);
}

const proxyPluginManager = {
  plugins,

  fetchProxies: async () => {
    const now = Date.now();

    // Return cached proxies if cache is valid
    if (
      cache.proxies.length > 0 &&
      cache.lastFetched &&
      now - cache.lastFetched < CACHE_DURATION
    ) {
      console.log("[ProxyPluginManager] Returning cached proxies");
      return cache.proxies;
    }

    try {
      // Fetch from all enabled plugins in parallel
      const results = await Promise.all(
        proxyPluginManager.plugins.map((plugin) => {
          console.log(
            `[ProxyPluginManager] Fetching proxies using ${plugin.name}`
          );
          return plugin.fetchProxies();
        })
      );

      // Combine results from all plugins and remove duplicates
      const uniqueProxies = [
        ...new Map(
          results.flat().map((proxy) => [`${proxy.ip}:${proxy.port}`, proxy])
        ).values(),
      ];

      // Cache the combined result
      cache.proxies = uniqueProxies;
      cache.lastFetched = now;

      console.log(
        `[ProxyPluginManager] Successfully fetched ${uniqueProxies.length} unique proxies`
      );
      return uniqueProxies;
    } catch (error) {
      console.error(
        "[ProxyPluginManager] Error fetching proxies:",
        error.message
      );
      return [];
    }
  },
};

module.exports = proxyPluginManager;
