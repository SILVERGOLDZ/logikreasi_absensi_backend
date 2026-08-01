import { updateUserToken, deleteUserToken } from "#services/notification.service";

export async function updateUserTokenController(req, res, next) {
  try {
    const userId = req.user.id;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token wajib diisi" });
    }

    await updateUserToken(userId, token);
    res.status(200).json({ message: "Token updated" });
  } catch (err) {
    next(err);
  }
}

export async function deleteUserTokenController(req, res, next) {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token wajib diisi" });
    }

    await deleteUserToken(token);
    res.status(200).json({ message: "Token deleted" });
  } catch (err) {
    next(err);
  }
}