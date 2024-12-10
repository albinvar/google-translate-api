const { translate } = require("@vitalets/google-translate-api");
const { HttpProxyAgent } = require("http-proxy-agent");

const translateWithProxy = async (text, lang, proxies, maxRetries = 15) => {
  let retries = 0;
  while (retries < maxRetries && proxies.length > retries) {
    const proxy = proxies[retries];
    const proxyAgent = new HttpProxyAgent(`http://${proxy.ip}:${proxy.port}`);
    try {
      const { text: translatedText } = await translate(text, {
        to: lang,
        fetchOptions: { agent: proxyAgent },
      });
      return { success: true, translatedText, proxyUsed: proxy.ip };
    } catch {
      retries++;
    }
  }
  return { success: false, message: "Failed to translate using proxies." };
};

module.exports = { translateWithProxy };
