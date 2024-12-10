const proxiflyPlugin = require("./proxiflyPlugin");
const scrapeProxyPlugin = require("./scrapeProxyPlugin");
const proxyFreeOnlyPlugin = require("./proxyFreeOnlyPlugin");

const cache = {
  proxies: [],
  lastFetched: null,
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const proxyPluginManager = {
  plugins: [proxiflyPlugin, scrapeProxyPlugin, proxyFreeOnlyPlugin], // Add ProxyFreeOnly plugin

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
