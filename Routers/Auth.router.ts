import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../Controllers/Auth.controller";

const AuthRouter = Router();

// Register, Login, Logout routes
AuthRouter.post("/register", registerUser);
AuthRouter.post("/login", loginUser);
AuthRouter.post("/logout", logoutUser);

export default AuthRouter;  