import type { Request, Response } from "express"
import pool from "../DbConnect";

export const addClientBasicDetailsController = async (req: Request, res: Response): Promise<Response> => {
    const { userId, name, phone } = req.body;
    if (!userId || !name || !phone) {
        return res.status(400).json({ message: "All fields are required!" });
    }

    const { role } = (req as any).user;
    if (role != 'client')
        return res.status(403).json({ message: "Unauthorized! Only clients can add clients!" });

    try {
        const doesClientExists = await pool.query(
            `SELECT * FROM clients WHERE user_id = $1`,
            [userId]
        );
        if (doesClientExists.rows.length > 0) {
            return res.status(400).json({ message: "Client already exists!" });
        }

        const result = await pool.query(
            `INSERT INTO clients (user_id, name, phone) VALUES ($1, $2, $3) RETURNING *`,
            [userId, name, phone]
        );
        const client = result.rows[0];
        return res.status(201).json({ message: "Client added successfully!", client });
    }
    catch (e) {
        console.error("Error occurred while adding client: ", e);
        return res.status(500).json({ message: "Error occurred while adding client!" });
    }
}

export const updateClientBasicDetailsController = async (req: Request, res: Response): Promise<Response> => {
    const { userId, name, phone } = req.body;
    if (!userId || !name || !phone) {
        return res.status(400).json({ message: "All fields are required!" });
    }

    const { role } = (req as any).user;
    if (role != 'client')
        return res.status(403).json({ message: "Unauthorized! Only clients can update their basic details!" });

    try {
        const doesClientExists = await pool.query(
            `SELECT * FROM clients WHERE user_id = $1`,
            [userId]
        );
        if (doesClientExists.rows.length === 0) {
            return res.status(404).json({ message: "Client not found!" });
        }

        const result = await pool.query(
            `UPDATE clients SET name = $1, phone = $2 WHERE user_id = $3 RETURNING *`,
            [name, phone, userId]
        );
        const client = result.rows[0];
        return res.status(200).json({ message: "Client basic details updated successfully!", client });
    }
    catch (e) {
        console.error("Error occurred while updating client basic details: ", e);
        return res.status(500).json({ message: "Error occurred while updating client basic details!" });
    }
}

export const addClientAddressController = async (req: Request, res: Response): Promise<Response> => {
    const { userId, address, city, state, country, pincode, latitude, longitude } = req.body;
    
    if (!userId || !address || !city || !state || !country || !pincode || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ message: "All fields are required!" });
    }

    const { role } = (req as any).user;
    if (role != 'client')
        return res.status(403).json({ message: "Unauthorized! Only clients can add addresses!" });

    try {
        const doesUserClientExist = await pool.query(
            `SELECT id FROM users WHERE id = $1 AND role = 'client' AND is_active = true`,
            [userId]
        );
        if (doesUserClientExist.rows.length === 0) {
            return res.status(404).json({ message: "Client not found or not active!" });
        }

        const doesAddressExists = await pool.query(
            `SELECT * FROM addresses WHERE user_id = $1`,
            [userId]
        );
        if (doesAddressExists.rows.length > 0) {
            return res.status(400).json({ message: "Address already exists for this client!" });
        }

        const result = await pool.query(
            `INSERT INTO addresses (user_id, address, city, state, country, pincode, latitude, longitude) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [userId, address, city, state, country, pincode, latitude, longitude]
        );
        const newAddress = result.rows[0];
        return res.status(201).json({ message: "Client address added successfully!", address: newAddress });
    }
    catch (e) {
        console.error("Error occurred while adding client address: ", e);
        return res.status(500).json({ message: "Error occurred while adding client address!" });
    }
}

export const updateClientAddressController = async (req: Request, res: Response): Promise<Response> => {
    const { userId, address, city, state, country, pincode, latitude, longitude } = req.body;
    
    if (!userId || !address || !city || !state || !country || !pincode || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ message: "All fields are required!" });
    }

    const { role } = (req as any).user;
    if (role != 'client')
        return res.status(403).json({ message: "Unauthorized! Only clients can update their address!" });

    try {
        const doesUserClientExist = await pool.query(
            `SELECT id FROM users WHERE id = $1 AND role = 'client' AND is_active = true`,
            [userId]
        );
        
        if (doesUserClientExist.rows.length === 0) {
            return res.status(404).json({ message: "Client not found or not active!" });
        }

        const doesAddressExists = await pool.query(
            `SELECT * FROM addresses WHERE user_id = $1`,
            [userId]
        );
        if (doesAddressExists.rows.length === 0) {
            return res.status(404).json({ message: "Address not found!" });
        }

        const result = await pool.query(
            `UPDATE addresses 
             SET address = $1, city = $2, state = $3, country = $4, pincode = $5, latitude = $6, longitude = $7, updated_at = NOW() 
             WHERE user_id = $8 RETURNING *`,
            [address, city, state, country, pincode, latitude, longitude, userId]
        );
        const updatedAddress = result.rows[0];
        return res.status(200).json({ message: "Client address updated successfully!", address: updatedAddress });
    }
    catch (e) {
        console.error("Error occurred while updating client address: ", e);
        return res.status(500).json({ message: "Error occurred while updating client address!" });
    }
}