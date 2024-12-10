const axios = require("axios");
const cheerio = require("cheerio");

const scrapeProxyList = async () => {
  const url = "https://free-proxy-list.net/";
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);
  const proxies = [];

  $("table.table tbody tr").each((_, element) => {
    const row = $(element).find("td");
    const ip = $(row[0]).text().trim();
    const port = $(row[1]).text().trim();
    const anonymity = $(row[4]).text().trim().toLowerCase();
    const google = $(row[5]).text().trim().toLowerCase();

    if (anonymity === "anonymous" && google === "yes") {
      proxies.push({ ip, port });
    }
  });

  return proxies;
};

module.exports = { scrapeProxyList };
