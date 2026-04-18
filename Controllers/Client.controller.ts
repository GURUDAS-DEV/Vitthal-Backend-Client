import type { Request, Response } from "express"
import pool from "../DbConnect";


export const addClientDetailsController = async (req: Request, res: Response): Promise<Response> => {
    const { address, city, state, country, pincode, latitude, longitude, phone } = req.body;
    const { userId, role } = (req as any).user;

    if (!userId || !address || !city || !state || !country || !pincode || latitude === undefined || longitude === undefined || !phone) {
        return res.status(400).json({ message: "All fields are required!" });
    }

    if (role != 'client')
        return res.status(403).json({ message: "Unauthorized! Only clients can add addresses!" });

    try {
        const clientQuery = await pool.query(`
            SELECT u.id, c.id as client_id, a.id as address_id 
            FROM users u
            LEFT JOIN client c ON u.id = c.user_id
            LEFT JOIN addresses a ON u.id = a.user_id
            WHERE u.id = $1 AND u.role = 'client' AND u.is_active = true
        `, [userId]);

        if (clientQuery.rows.length === 0) {
            return res.status(404).json({ message: "Client not found or not active!" });
        }

        const { client_id, address_id } = clientQuery.rows[0];

        if (client_id && address_id) {
            return res.status(400).json({ message: "Client details already exist. You can update them, but cannot add again." });
        }

        // Use a transaction since we are inserting into multiple tables
        await pool.query('BEGIN');

        let newClient = null;
        let newAddress = null;

        if (!client_id) {
            const clientResult = await pool.query(
                `INSERT INTO client (user_id, phone) VALUES ($1, $2) RETURNING *`,
                [userId, phone]
            );
            newClient = clientResult.rows[0];
        }

        if (!address_id) {
            const addressResult = await pool.query(
                `INSERT INTO addresses (user_id, address, city, state, country, pincode, latitude, longitude) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                [userId, address, city, state, country, pincode, latitude, longitude]
            );
            newAddress = addressResult.rows[0];
        }

        await pool.query('COMMIT');

        return res.status(201).json({ message: "Client details added successfully!", client: newClient, address: newAddress });
    }
    catch (e) {
        await pool.query('ROLLBACK');
        console.error("Error occurred while adding client details: ", e);
        return res.status(500).json({ message: "Error occurred while adding client details!" });
    }
}

export const updateClientAddressController = async (req: Request, res: Response): Promise<Response> => {
    const { address, city, state, country, pincode, latitude, longitude } = req.body;
    const { userId, role } = (req as any).user;
    if (!userId || !address || !city || !state || !country || !pincode || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ message: "All fields are required!" });
    }

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

export const updateClientNumberController = async (req: Request, res: Response): Promise<Response> => {
    const { userId, role } = (req as any).user;
    if (role != 'client')
        return res.status(403).json({ message: "Unauthorized! Only clients can update their phone number!" });

    if (!userId)
        return res.status(400).json({ message: "User ID is required!" });

    const { phone } = req.body;
    if (!phone)
        return res.status(400).json({ message: "Phone number is required to update!" });

    try {
        const doesUserClientExist = await pool.query(
            `SELECT id FROM users WHERE id = $1 AND role = 'client' AND is_active = true`,
            [userId]
        );

        if (doesUserClientExist.rows.length === 0) {
            return res.status(404).json({ message: "Client not found or not active!" });
        }

        const updateResult = await pool.query(
            `UPDATE client SET phone = $1, updated_at = NOW() WHERE user_id = $2 RETURNING *`,
            [phone, userId]
        );

        if (updateResult.rows.length === 0) {
            return res.status(404).json({ message: "Client details not found. Please add them first." });
        }

        return res.status(200).json({ message: "Client phone updated successfully!", client: updateResult.rows[0] });
    }
    catch (e) {
        console.error("Error occurred while updating client phone: ", e);
        return res.status(500).json({ message: "Error occurred while updating client phone!" });
    }
}

export const clientDetails = async (req: Request, res: Response): Promise<Response> => {
    const { userId, role } = (req as any).user;

    if (!userId || !role)
        return res.status(400).json({ message: "Required all field" });

    if (role !== 'client') {
        return res.status(403).json({ message: "Unauthorized! Only clients can access their details." });
    }

    try {
        const query = `
            SELECT 
                u.id AS user_id, 
                u.name AS user_name, 
                u.email, 
                u.is_active,
                c.phone, 
                a.address, 
                a.city, 
                a.state, 
                a.country, 
                a.pincode, 
                a.latitude, 
                a.longitude
            FROM users u
            LEFT JOIN client c ON u.id = c.user_id
            LEFT JOIN addresses a ON u.id = a.user_id
            WHERE u.id = $1 AND u.role = 'client'
        `;

        const result = await pool.query(query, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Client not found." });
        }

        return res.status(200).json({ 
            message: "Client details fetched successfully",
            data: result.rows[0]
        });
    }
    catch (e) {
        console.log("Error : ", e);
        return res.status(500).json({ message: 'internal server error' });
    }
}