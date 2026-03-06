const jwt = require("jsonwebtoken");
const { ACCESS_COOKIE_NAME, getJwtSecrets } = require("../utils/tokenHelpers");

const parseEnvList = (value = "") =>
  value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

const isAllowlistedAdmin = (user = {}) => {
  const allowlistedIds = parseEnvList(process.env.ADMIN_ALLOWLIST_IDS || process.env.BEDS4CREW_ADMIN_ID || "");
  // const allowlistedEmails = parseEnvList(
  //   process.env.ADMIN_ALLOWLIST_EMAILS || process.env.BEDS4CREW_ADMIN_EMAIL || ""
  // );

  const userId = (user.id || user._id || "").toString().toLowerCase();
  const userEmail = (user.email || "").toString().toLowerCase();

  return (
    (allowlistedIds.length > 0 && allowlistedIds.includes(userId))
    // (allowlistedEmails.length > 0 && allowlistedEmails.includes(userEmail))
  );
};

const verifyToken = (req, res, next) => {
  const authHeaderToken = req.headers["authorization"]?.split(" ")[1];
  const cookieToken = req.cookies?.[ACCESS_COOKIE_NAME];
  const token = cookieToken || authHeaderToken;
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const { accessSecret } = getJwtSecrets();
    const decoded = jwt.verify(token, accessSecret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token invalid/expired" });
  }
};

const verifyAdmin = (req, res, next) => {
  if (!isAllowlistedAdmin(req.user)) {
    return res.status(403).json({ message: "Unauthorized: Admin access required" });
  }
  next();
};

module.exports = verifyToken;
module.exports.verifyAdmin = verifyAdmin;
module.exports.isAllowlistedAdmin = isAllowlistedAdmin;
