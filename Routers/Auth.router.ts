import { Router } from "express";
import { loginUser, logoutUser, registerUser, getCurrentUser } from "../Controllers/Auth.controller";
import { authMiddleware } from "../Middleware/AuthMiddleware";

const AuthRouter = Router();

// Register, Login, Logout routes
AuthRouter.post("/register", registerUser);
AuthRouter.post("/login", loginUser);
AuthRouter.post("/logout", logoutUser);

// Protected route - get current user
AuthRouter.get("/me", authMiddleware, getCurrentUser);

export default AuthRouter;