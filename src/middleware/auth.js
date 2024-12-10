const apitoken = process.env.API_TOKEN || "you-are-lucky";

const checkAuth = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) {
    return res
      .status(401)
      .json({ error: "Unauthorized: Missing Bearer Token" });
  }

  const tokenValue = token.split(" ")[1];
  if (!tokenValue || tokenValue !== apitoken) {
    return res
      .status(401)
      .json({ error: "Unauthorized: Invalid Bearer Token" });
  }

  next();
};

module.exports = checkAuth;
