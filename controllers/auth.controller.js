import { getLoginInfo, getUserById } from "#services/auth.service";
import { APPROVER_ROLES } from "#config/roles";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "90d";

export async function loginController(req,res){
    try {
        const email = (req.body.email ?? "").toLowerCase().trim();
        const password = (req.body.password ?? "").trim();

        if (!email || !password) {
        return res.status(400).json({
            error: "Email dan password wajib diisi",
        });
        }

        const user = await getLoginInfo(email);
        if (!user)
        return res.status(401).json({ error: "Email atau password salah" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
        return res.status(401).json({ error: "Email atau password salah" });

        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
            );

            res.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    photoUrl: user.photoUrl
                },
                approverRoles: APPROVER_ROLES
            }
        );
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }

}

export async function meController(req, res) {
  try {
    const user = await getUserById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        photoUrl: user.photoUrl,
      },
      approverRoles: APPROVER_ROLES,
    });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}