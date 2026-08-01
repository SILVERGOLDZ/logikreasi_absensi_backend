// routes/notification.route.js
import { deleteUserTokenController, updateUserTokenController } from "#controllers/notification.controller";
import express from "express";


const router = express.Router();

router.put("/update-token", updateUserTokenController);    
router.delete("/delete-token", deleteUserTokenController);

export default router;