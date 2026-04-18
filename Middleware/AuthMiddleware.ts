import type { Request, Response, NextFunction } from "express";
import { generateAccessToken, verifyToken } from "../helpers/jwt.helper";
import { COOKIE_OPTIONS } from "../shared/CokkieSetting.shared";

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        const { refreshToken, accessToken } = req.cookies;
        if (!refreshToken)
            return res.status(401).json({ message: "Unauthorized" });

        if (!accessToken) {
            const newAccessToken = generateNewAccessToken(refreshToken);
            res.cookie("accessToken", newAccessToken, {
                ...COOKIE_OPTIONS,
                maxAge: 30 * 60 * 1000,
            });
            next();
        }

        const decodedAccessToken = verifyToken(accessToken, "access");
        const decodedRefreshToken = verifyToken(refreshToken, "refresh");
        if (decodedAccessToken.userId !== decodedRefreshToken.userId)
            return res.status(401).json({ message: "Refresh Token and Access Token are not issued for same user!!" });

        const { userId, username, email, role } = decodedAccessToken;
        (req as any).user = { userId, username, email, role };
        next();

    } catch (error) {
        return res.status(401).json({ message: "Unauthorized! Failed to verify Tokens." });
    }
}

//helpers : 
const generateNewAccessToken = (refreshToken: string) => {
    try {
        const decoded = verifyToken(refreshToken, "refresh");
        const { userId, username, email, role } = decoded;
        const newAccessToken = generateAccessToken(userId, username, email, role);
        return newAccessToken;
    }
    catch (error) {
        console.error("Error generating new access token:", error);
        throw new Error("Failed to generate new access token");
    }
}