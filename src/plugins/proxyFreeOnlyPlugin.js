const axios = require("axios");

const proxyFreeOnlyPlugin = {
  name: "ProxyFreeOnly",
  fetchProxies: async (options = {}) => {
    const url = "https://proxyfreeonly.com/api/free-proxy-list";
    const defaultParams = {
      limit: 500,
      page: 1,
      sortBy: "lastChecked",
      sortType: "desc",
    };

    const params = { ...defaultParams, ...options };

    try {
      const response = await axios.get(url, { params });
      if (response.data && Array.isArray(response.data)) {
        // Filter proxies based on desired criteria
        const filteredProxies = response.data.filter((proxy) => {
          return (
            proxy.anonymityLevel.toLowerCase() === "anonymous" || // Match anonymous
            proxy.google === true // Google compatibility
          );
        });

        console.log(
          `[ProxyFreeOnly] Fetched ${filteredProxies.length} proxies`
        );

        // Map proxies to required structure
        return filteredProxies.map((proxy) => ({
          ip: proxy.ip,
          port: proxy.port,
          protocol: proxy.protocols[0], // Use the first protocol
        }));
      }
      return [];
    } catch (error) {
      console.error(`[ProxyFreeOnly] Error fetching proxies: ${error.message}`);
      return [];
    }
  },
};

module.exports = proxyFreeOnlyPlugin;
