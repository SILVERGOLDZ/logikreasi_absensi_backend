import { registerUserByAdmin } from "#services/admin/user.service";

export async function registerUserController(req, res) {
  try {
    const { username, email, role } = req.body;

    if (!username || !email || !role) {
      return res.status(400).json({ error: "username, email, dan role wajib diisi" });
    }

    if (!["admin", "user"].includes(role)) {
      return res.status(400).json({ error: "Role tidak valid" });
    }

    const { user, generatedPassword } = await registerUserByAdmin({ username, email, role });

    res.status(201).json({
      message: "User berhasil dibuat",
      user,
      generatedPassword,
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message || "Gagal membuat user" });
  }
}