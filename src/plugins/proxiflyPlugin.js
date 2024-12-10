const axios = require("axios");

const proxiflyPlugin = {
  name: "Proxifly",
  fetchProxies: async (options = {}) => {
    const httpUrl =
      "https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/http/data.json";
    const httpsUrl =
      "https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/https/data.json";

    // Combine HTTP and HTTPS proxies
    try {
      const [httpResponse, httpsResponse] = await Promise.all([
        axios.get(httpUrl),
        axios.get(httpsUrl),
      ]);

      const httpProxies = httpResponse.data || [];
      const httpsProxies = httpsResponse.data || [];

      // Combine and filter proxies
      const combinedProxies = [...httpProxies, ...httpsProxies]
        .filter((proxy) => {
          return (
            proxy.anonymity === "anonymous" || // Only anonymous proxies
            proxy.anonymity === "elite" // Elite proxies
          );
        })
        .slice(0, 50); // Take a maximum of 50 proxies

      console.log(`[Proxifly] Fetched ${combinedProxies.length} proxies`);

      // Map to a unified format
      return combinedProxies.map((proxy) => ({
        ip: proxy.ip,
        port: proxy.port,
        protocol: proxy.protocol,
        country: proxy.geolocation?.country || "Unknown",
        city: proxy.geolocation?.city || "Unknown",
        anonymity: proxy.anonymity,
        https: proxy.https,
      }));
    } catch (error) {
      console.error(`[Proxifly] Error fetching proxies: ${error.message}`);
      return [];
    }
  },
};

module.exports = proxiflyPlugin;
