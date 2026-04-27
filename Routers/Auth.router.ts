import { Router } from "express";
import { loginUser, logoutUser, registerUser, getCurrentUser, OTPSendingController, OTPVerificationController, verifyRegisteredUser, resetPasswordController } from "../Controllers/Auth.controller";
import { authMiddleware } from "../Middleware/AuthMiddleware";

const AuthRouter = Router();

// Register, Login, Logout routes
AuthRouter.post("/register", registerUser);
AuthRouter.post("/login", loginUser);
AuthRouter.post("/logout", logoutUser);
AuthRouter.post("/reset-password", resetPasswordController)

//OTP ROUTES : 
AuthRouter.post("/otp/send", OTPSendingController);
AuthRouter.post("/otp/verify", OTPVerificationController);

// Registration verification route
AuthRouter.post("/verify-registration", verifyRegisteredUser);

// Protected route - get current user
AuthRouter.get("/me", authMiddleware, getCurrentUser);

export default AuthRouter;