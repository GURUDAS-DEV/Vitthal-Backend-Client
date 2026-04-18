import type { Request, Response } from "express";
import bcrypt from 'bcrypt';
import type { DatabaseError } from 'pg';
import { generateAccessToken, generateRefreshToken, verifyToken } from "../helpers/jwt.helper";
import pool from "../DbConnect";
import { COOKIE_OPTIONS } from "../shared/CokkieSetting.shared";

export async function registerUser(req: Request, res: Response): Promise<Response> {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    if (!/^[\w.-]+@[\w.-]+\.\w{2,}$/.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email',
            [name, email, hashedPassword, role]
        );
        const user = result.rows[0];

        const refreshToken = generateRefreshToken(user.id, user.name, user.email, role);
        const accessToken = generateAccessToken(user.id, user.name, user.email, role);

        // Store refresh token in database for revocation and session tracking
        await pool.query('UPDATE users SET refresh_token = $1 WHERE id = $2', [refreshToken, user.id]);

        res.cookie('refreshToken', refreshToken, {
            ...COOKIE_OPTIONS,
            maxAge: 45 * 24 * 60 * 60 * 1000, // 45 days
        });

        res.cookie('accessToken', accessToken, {
            ...COOKIE_OPTIONS,
            maxAge: 30 * 60 * 1000, // 30 minutes
        });

        return res.status(200).json({ message: 'User registered successfully' });
    }
    catch (error) {
        const dbError = error as DatabaseError;
        if (dbError.code === '23505') {
            return res.status(409).json({ message: 'User with this email already exists' });
        }
        console.error('Error registering user:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export async function loginUser(req: Request, res: Response): Promise<Response> {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        if (!user) {
            return res.status(401).json({ message: 'Invalid email' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        const refreshToken = generateRefreshToken(user.id, user.name, user.email, user.role);
        const accessToken = generateAccessToken(user.id, user.name, user.email, user.role);

        // Store refresh token in database for revocation and session tracking
        await pool.query('UPDATE users SET refresh_token = $1 WHERE id = $2', [refreshToken, user.id]);

        res.cookie('refreshToken', refreshToken, {
            ...COOKIE_OPTIONS,
            maxAge: 45 * 24 * 60 * 60 * 1000, // 45 days
        });

        res.cookie('accessToken', accessToken, {
            ...COOKIE_OPTIONS,
            maxAge: 30 * 60 * 1000, // 30 minutes
        });

        return res.status(200).json({ message: 'Login successful' });
    }
    catch (error) {
        console.error('Error logging in user:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export async function logoutUser(req: Request, res: Response): Promise<Response> {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required' });
    }

    try {

        const isVerified = verifyToken(refreshToken, 'refresh');
        if (!isVerified) {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }

        // Clear refresh token from database
        await pool.query('UPDATE users SET refresh_token = NULL WHERE refresh_token = $1', [refreshToken]);

        res.clearCookie('refreshToken', COOKIE_OPTIONS);
        res.clearCookie('accessToken', COOKIE_OPTIONS);

        return res.status(200).json({ message: 'Logout successful' });
    }
    catch (error) {
        console.error('Error logging out user:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}