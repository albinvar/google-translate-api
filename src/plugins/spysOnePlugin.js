const axios = require("axios");

const spysOnePlugin = {
  name: "SpysOne",
  fetchProxies: async () => {
    const url = "https://spys.me/proxy.txt"; // URL to fetch the proxy text file
    try {
      const response = await axios.get(url);
      const proxies = [];

      // Split the text into lines
      const lines = response.data.split("\n");

      // Skip the header lines (first few lines that don't contain proxy data)
      for (const line of lines) {
        if (
          !line.includes(":") || // Skip lines without IP:Port
          line.startsWith("Proxy list") || // Skip header lines
          line.startsWith("Socks proxy") || // Skip additional info lines
          line.startsWith("Support by donations") || // Skip donation lines
          line.startsWith("BTC") || // Skip Bitcoin info
          !line.trim() // Skip empty lines
        ) {
          continue;
        }

        // Extract proxy data using refined regex
        const match = line.match(
          /^(?<ip>\d{1,3}(?:\.\d{1,3}){3}):(?<port>\d+)\s+(?<country>\w{2})-(?<anonymity>[NH!]+)(?:-(?<ssl>S))?(?:-(?<google>\+))?/
        );

        if (match) {
          const { ip, port, country, anonymity, ssl, google } = match.groups;

          //   console.log(
          //     `[SpysOne] Found proxy: ${ip}:${port} (${country}) - ${anonymity} ${
          //       ssl ? "SSL" : ""
          //     } ${google ? "Google" : ""}`
          //   );
          // Filter: Only Google-compatible (`google: true`) and anonymous (`N` or `H`) proxies
          if ((anonymity === "N" || anonymity === "H") && google === "+") {
            proxies.push({
              ip,
              port,
              protocol: ssl ? "https" : "http",
              country,
              anonymity: anonymity === "H" ? "high" : "normal",
              google: true,
            });
          }
        }
      }

      return proxies;
    } catch (error) {
      console.error(`[SpysOne] Error fetching proxies: ${error.message}`);
      return [];
    }
  },
};

module.exports = spysOnePlugin;
