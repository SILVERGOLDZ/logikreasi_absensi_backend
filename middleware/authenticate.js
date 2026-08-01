import jwt from "jsonwebtoken";

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err){

    // check apakah expired
    if (err.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Token expired" });
  }

    return res.status(401).json({ error: "Invalid token" });
  }
}