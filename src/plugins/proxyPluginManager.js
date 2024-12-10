const proxiflyPlugin = require("./proxiflyPlugin");
const scrapeProxyPlugin = require("./scrapeProxyPlugin");

const cache = {
  proxies: [],
  lastFetched: null,
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const proxyPluginManager = {
  plugins: [proxiflyPlugin, scrapeProxyPlugin],

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
      // Fetch from all plugins in parallel
      const results = await Promise.all(
        proxyPluginManager.plugins.map((plugin) => plugin.fetchProxies())
      );

      // Flatten and filter unique proxies
      const proxies = [...new Set(results.flat())];

      // Cache the combined result
      cache.proxies = proxies;
      cache.lastFetched = now;

      return proxies;
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
