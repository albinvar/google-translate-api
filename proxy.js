const fetchProxyList = async () => {
  const url =
    "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=1000&country=all";
  const response = await axios.get(url);
  const proxies = response.data.split("\n").map((proxy) => {
    const [ip, port] = proxy.split(":");
    return { ip, port };
  });
  return proxies.filter((proxy) => proxy.ip && proxy.port);
};
