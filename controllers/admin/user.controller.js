import { registerUserByAdmin, getDistinctUserRoles } from "#services/admin/user.service";

const ROLE_REGEX = /^[a-z_]+$/; // wajib huruf kecil, boleh underscore, tanpa spasi/simbol lain

export async function registerUserController(req, res) {
  try {
    const { username, email } = req.body;
    let { role } = req.body;

    if (!username || !email || !role) {
      return res.status(400).json({ error: "username, email, dan role wajib diisi" });
    }

    role = role.trim().toLowerCase();

    if (!ROLE_REGEX.test(role)) {
      return res.status(400).json({ error: "Role hanya boleh huruf kecil dan underscore, tanpa spasi" });
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

export async function getUserRolesController(req, res) {
  try {
    const roles = await getDistinctUserRoles();
    res.status(200).json({ roles });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message || "Gagal mengambil daftar role" });
  }
}