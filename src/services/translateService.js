const { HttpProxyAgent } = require("http-proxy-agent");
const { translate } = require("@vitalets/google-translate-api");

const translateWithTimeout = (text, lang, fetchOptions, timeout = 3000) => {
  // Promise to handle translation
  const translatePromise = translate(text, { to: lang, fetchOptions });

  // Promise to enforce timeout
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Request timed out")), timeout)
  );

  // indicate failure on console
  translatePromise.catch((error) => {
    console.error(`[TranslateService] Translation failed: ${error.message}`);
  });

  // Return the race between translation and timeout
  return Promise.race([translatePromise, timeoutPromise]);
};

const translateWithProxy = async (text, lang, proxies, maxRetries = 999) => {
  let retries = 0;
  let proxyUsed = null;

  while (retries < maxRetries && proxies.length > retries) {
    const proxy = proxies[retries];
    const proxyString = `${proxy.ip}:${proxy.port}`;
    const fetchOptions = {
      agent: new HttpProxyAgent(`http://${proxyString}`),
    };

    try {
      proxyUsed = proxy;

      // Use translateWithTimeout to enforce timeout for each proxy attempt
      const { text: translatedText } = await translateWithTimeout(
        text,
        lang,
        fetchOptions,
        3000 // 3-second timeout
      );

      console.log(`[TranslateService] Proxy ${proxyString} succeeded`);

      return {
        success: true,
        translatedText,
        proxyUsed: proxy.ip,
        retries,
      };
    } catch (error) {
      retries++;
      console.error(
        `[TranslateService] Proxy ${proxyString} failed: ${error.message}. Retrying...`
      );
    }
  }

  return {
    success: false,
    message: "Failed to translate after multiple retries",
    proxyUsed: proxyUsed ? proxyUsed.ip : null,
    retries,
  };
};

module.exports = { translateWithProxy };
