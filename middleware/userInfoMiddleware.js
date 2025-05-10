const useragent = require("express-useragent");
const geoip = require("geoip-lite");

exports.extractUserInfo = (req, res, next) => {
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  req.ipAddress = ip;

  const userAgent = req.headers["user-agent"];
  const source = useragent.parse(userAgent);
  req.deviceInfo = `${source.browser} ${source.version} on ${source.os} ${source.platform}`;

  const geo = geoip.lookup(ip);
  if (geo) {
    req.location = `${geo.city}, ${geo.region}, ${geo.country}`;
  } else {
    req.location = "Unknown";
  }

  next();
};
