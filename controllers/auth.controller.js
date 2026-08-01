import { getLoginInfo } from "#services/auth.service";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "90d"; // Session bertahan 90 hari (bisa diubah ke 30d atau "never" dengan logic refresh)

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

        // TOKEN USER SESSION
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
                }
            }
        );
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }

}