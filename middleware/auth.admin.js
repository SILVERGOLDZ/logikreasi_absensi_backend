import { APPROVER_ROLES } from "#config/roles";

export function isAdmin(req, res, next) {
  if (!APPROVER_ROLES.includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}