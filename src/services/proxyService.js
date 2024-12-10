const proxyPluginManager = require("../plugins/proxyPluginManager");

const fetchProxies = async () => {
  try {
    const proxies = await proxyPluginManager.fetchProxies();
    console.log(`[ProxyService] Fetched ${proxies.length} proxies`);
    return proxies;
  } catch (error) {
    console.error(`[ProxyService] Error fetching proxies: ${error.message}`);
    return [];
  }
};

module.exports = { fetchProxies };
