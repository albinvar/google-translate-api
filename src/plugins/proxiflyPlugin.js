const proxifly = new (require("proxifly"))({
  apiKey: process.env.PROXIFLY_API_KEY || "api_test_key", // Use your API key
});

const proxiflyPlugin = {
  name: "Proxifly",
  fetchProxies: async (options = {}) => {
    const defaultOptions = {
      protocol: "http",
      anonymity: "anonymous", // anonymous proxies
      https: true, // Google support
      format: "json",
      quantity: 10, // Fetch up to 10 proxies
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
      const proxies = await proxifly.getProxy(finalOptions);

      console.log(`[Proxifly] Fetched ${proxies.length} proxies`);
      return proxies.map((proxy) => ({
        ip: proxy.ip,
        port: proxy.port,
        protocol: proxy.protocol,
      }));
    } catch (error) {
      console.error(`[Proxifly] Error fetching proxies: ${error.message}`);
      return [];
    }
  },
};

module.exports = proxiflyPlugin;
