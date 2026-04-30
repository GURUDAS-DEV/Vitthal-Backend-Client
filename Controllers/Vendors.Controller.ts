import type { Request, Response } from "express";
import pool from "../DbConnect";

export const addVendorController = async (req: Request, res: Response): Promise<Response> => {
    const { companyName, phone, gstNumber } = req.body;
    const { userId } = (req as any).user;
    if (!userId || !companyName || !phone || !gstNumber) {
        return res.status(400).json({ message: "All fields are required!" });
    }

    const { role } = (req as any).user;
    if (role != 'vendor')
        return res.status(403).json({ message: "Unauthorized! Only vendors can add vendors!" });

    try {
        const result = await pool.query(
            'INSERT INTO vendors (user_id, phone, gst_number, company_name) VALUES ($1, $2, $3, $4) RETURNING id, phone,     gst_number',
            [userId, phone, gstNumber, companyName]
        );
        const vendor = result.rows[0];
        return res.status(201).json({ message: "Vendor added successfully!", vendor });
    }
    catch (e) {
        console.error("Error occurred while adding vendor: ", e);
        return res.status(500).json({ message: "Error occurred while adding vendor!" });
    }
}

export const updateVendorBasicDetailsController = async (req: Request, res: Response): Promise<Response> => {
    const { companyName, phone, gstNumber } = req.body;
    const { userId } = (req as any).user;
    if (!userId || !companyName || !phone || !gstNumber) {
        return res.status(400).json({ message: "All fields are required!" });
    }

    const { role } = (req as any).user;
    if (role != 'vendor')
        return res.status(403).json({ message: "Unauthorized! Only vendors can add vendors!" });


    try {
        const doesVendorExists = await pool.query(
            `SELECT * FROM vendors WHERE user_id = $1`,
            [userId]
        );

        if (doesVendorExists.rows.length === 0) {
            return res.status(400).json({ message: "Vendor Does Not Exists with given userId! You have to create new!" });
        }

        if (doesVendorExists.rows[0].is_blocked === true) {
            return res.status(400).json({ message: "Vendor is blocked! You cannot update it" });
        }

        const result = await pool.query(
            `UPDATE vendors SET phone = $1, gst_number = $2, company_name = $3 WHERE user_id = $4 RETURNING id, phone, gst_number, company_name`,
            [phone, gstNumber, companyName, userId]
        );
        const vendor = result.rows[0];

        return res.status(200).json({ message: "Vendor updated successfully!", vendor });
    }
    catch (e) {
        console.log("Error occurred while updating vendor: ", e);
        return res.status(500).json({ message: "Error occurred while updating vendor!" });
    }
}

export const createVendorAddress = async (req: Request, res: Response): Promise<Response> => {
    const { address, city, state, country, pincode, latitude, longitude } = req.body;
    const { userId } = (req as any).user;
    if (!userId || !address || !city || !state || !country || !pincode || !latitude || !longitude) {
        return res.status(400).json({ message: "All fields are required!" });
    }

    const { role } = (req as any).user;
    if (role != 'vendor')
        return res.status(403).json({ message: "Unauthorized! Only vendors can add vendors!" });

    try {

        const query = `SELECT 
                            u.id as user_exists,
                            u.role,
                            v.is_blocked,
                            a.id as address_exists
                        FROM users u
                        LEFT JOIN vendors v ON u.id = v.user_id
                        LEFT JOIN addresses a ON u.id = a.user_id
                        WHERE u.id = $1`;

        const userDetail = await pool.query(query, [userId]);

        if (userDetail.rows.length === 0) {
            return res.status(400).json({ message: "User does not exist!" });
        }

        const userDetails = userDetail.rows[0];

        if (userDetails.role !== 'vendor') {
            return res.status(400).json({ message: "User is not a vendor!" });
        }

        if (userDetails.is_blocked) {
            return res.status(400).json({ message: "Vendor is blocked! You cannot create an address! Ask Admin to unblock you!" });
        }

        if (userDetails.address_exists) {
            return res.status(400).json({ message: "Address already exists for this user! You can update it" });
        }

        const result = await pool.query(
            `INSERT INTO addresses (user_id, address, city, state, country, pincode, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, user_id, address, city, state, country, pincode, latitude, longitude`,
            [userId, address, city, state, country, pincode, latitude, longitude]
        );
        const vendorAddress = result.rows[0];

        return res.status(201).json({ message: "Vendor address added successfully!", vendorAddress });
    }
    catch (e) {
        console.log("Error occurred while adding vendor address: ", e);
        return res.status(500).json({ message: "Error occurred while adding vendor address!" });
    }
}

export const updateVendorAddress = async (req: Request, res: Response): Promise<Response> => {
    const { address, city, state, country, pincode, latitude, longitude } = req.body;
    const { userId } = (req as any).user;
    if (!userId || !address || !city || !state || !country || !pincode || !latitude || !longitude) {
        return res.status(400).json({ message: "All fields are required!" });
    }

    const { role } = (req as any).user;
    if (role != 'vendor')
        return res.status(403).json({ message: "Unauthorized! Only vendors can add vendors!" });

    try {
        const checkQuery = `
            SELECT 
                u.id as user_exists,
                u.role,
                v.is_blocked,
                a.id as address_exists
            FROM users u
            LEFT JOIN vendors v ON u.id = v.user_id
            LEFT JOIN addresses a ON u.id = a.user_id
            WHERE u.id = $1
        `;

        const checkResult = await pool.query(checkQuery, [userId]);

        if (checkResult.rows.length === 0) {
            return res.status(400).json({ message: "User does not exist!" });
        }

        const userDetails = checkResult.rows[0];

        if (userDetails.role !== 'vendor') {
            return res.status(400).json({ message: "User is not a vendor!" });
        }

        if (userDetails.is_blocked) {
            return res.status(400).json({ message: "Vendor is blocked! You cannot update the address! Ask Admin to unblock you!" });
        }

        if (!userDetails.address_exists) {
            return res.status(400).json({ message: "Address does not exist for this user! Please create an address first." });
        }

        const result = await pool.query(
            `UPDATE addresses SET address = $1, city = $2, state = $3, country = $4, pincode = $5, latitude = $6, longitude = $7 WHERE user_id = $8 RETURNING id, user_id, address, city, state, country, pincode, latitude, longitude`,
            [address, city, state, country, pincode, latitude, longitude, userId]
        );
        const vendorAddress = result.rows[0];

        return res.status(200).json({ message: "Vendor address updated successfully!", vendorAddress });
    }
    catch (e) {
        console.log("Error occurred while updating vendor address: ", e);
        return res.status(500).json({ message: "Error occurred while updating vendor address!" });
    }
}

export const getVendorDetailsController = async (req: Request, res: Response): Promise<Response> => {
    const { userId, role } = (req as any).user;
    if (!userId) {
        return res.status(400).json({ message: "User ID is required!" });
    }

    if(role !== 'vendor') {
        return res.status(403).json({ message: "Unauthorized! Only vendors can access their details!" });
    }

    try{
        const query = `
            SELECT 
                u.id as user_id,
                u.name as user_name,
                u.email as user_email,
                u.is_active as user_is_active,
                v.phone as vendor_phone,
                v.company_name as vendor_company_name,
                v.gst_number as vendor_gst_number,
                a.address as vendor_address,
                a.city as vendor_city,
                a.state as vendor_state,
                a.country as vendor_country,
                a.pincode as vendor_pincode,
                a.latitude as vendor_latitude,
                a.longitude as vendor_longitude
            FROM users u
            LEFT JOIN vendors v ON u.id = v.user_id
            LEFT JOIN addresses a ON u.id = a.user_id
            WHERE u.id = $1 AND u.role = 'vendor'
        `;

        const result = await pool.query(query, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Vendor not found." });
        }

        return res.status(200).json({
            message: "Vendor details fetched successfully",
            data: result.rows[0]
        });
    }
    catch (e) {
        console.error("Error : ", e);
        return res.status(500).json({ message: 'internal server error' });
    }
}

export const checkVendorSetupStatus = async (req: Request, res: Response): Promise<Response> => {
    const { userId, role } = (req as any).user;
    if (!userId) {
        return res.status(400).json({ message: "User ID is required!" });
    }

    if(role !== 'vendor') {
        return res.status(403).json({ message: "Unauthorized! Only vendors can access their details!" });
    }

    try{
        const query = `
            SELECT 
                v.id as vendor_exists,
                a.id as address_exists
            FROM users u
            LEFT JOIN vendors v ON u.id = v.user_id
            LEFT JOIN addresses a ON u.id = a.user_id
            WHERE u.id = $1 AND u.role = 'vendor'
        `;

        const result = await pool.query(query, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Vendor not found." });
        }

        const row = result.rows[0];
        const isSetupComplete = row.vendor_exists !== null && row.address_exists !== null;

        return res.status(200).json({
            message: "Setup status fetched successfully",
            isSetupComplete,
            hasVendorProfile: row.vendor_exists !== null,
            hasAddress: row.address_exists !== null
        });
    }
    catch (e) {
        console.error("Error : ", e);
        return res.status(500).json({ message: 'internal server error' });
    }
}

export const getVendorProductByIdController = async (req: Request, res: Response): Promise<Response> => {
    const { productId } = req.params;
    const { userId, role } = (req as any).user;

    if (!userId) {
        return res.status(400).json({ message: "User ID is required!" });
    }

    if (role !== 'vendor') {
        return res.status(403).json({ message: "Unauthorized! Only vendors can access their products!" });
    }

    if (!productId) {
        return res.status(400).json({ message: "Product ID is required!" });
    }

    try {
        const vendorResult = await pool.query('SELECT id FROM vendors WHERE user_id = $1', [userId]);

        if (vendorResult.rows.length === 0) {
            return res.status(404).json({ message: "Vendor not found!" });
        }

        const vendorId = vendorResult.rows[0].id;

        const query = `
            SELECT 
                p.id AS product_id,
                p.name AS product_name,
                p.description,
                p.category,
                p.product_type,
                p.specifications,
                vp.id AS vendor_product_id,
                vp.price,
                vp.moq,
                vp.stock_quantity,
                vp.is_active,
                vp.created_at,
                vp.updated_at,
                COALESCE(
                    JSON_AGG(
                        JSONB_BUILD_OBJECT(
                            'image_url', pImg.image_url,
                            'is_primary', pImg.is_primary,
                            'display_order', pImg.display_order
                        )
                        ORDER BY pImg.display_order
                    ) FILTER (WHERE pImg.id IS NOT NULL),
                    '[]'
                ) AS images
            FROM vendor_products vp
            JOIN products p ON vp.product_id = p.id
            LEFT JOIN products_images pImg ON p.id = pImg.product_id
            WHERE vp.vendor_id = $1 AND p.id = $2
            GROUP BY p.id, vp.id, vp.price, vp.moq, vp.stock_quantity, vp.is_active, vp.created_at, vp.updated_at
        `;

        const result = await pool.query(query, [vendorId, productId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Product not found or you don't have access to it!" });
        }

        return res.status(200).json({
            message: "Vendor product fetched successfully",
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Error fetching vendor product:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

export const updateVendorProductController = async (req: Request, res: Response): Promise<Response> => {
    const { productId, price, moq, stockQuantity, isActive } = req.body;
    const { userId, role } = (req as any).user;

    if (!userId) {
        return res.status(400).json({ message: "User ID is required!" });
    }

    if (role !== 'vendor') {
        return res.status(403).json({ message: "Unauthorized! Only vendors can update their products!" });
    }

    if (!productId) {
        return res.status(400).json({ message: "Product ID is required!" });
    }

    if (price === undefined || moq === undefined || stockQuantity === undefined) {
        return res.status(400).json({ message: "Price, MOQ, and Stock Quantity are required!" });
    }

    try {
        const vendorResult = await pool.query('SELECT id FROM vendors WHERE user_id = $1', [userId]);

        if (vendorResult.rows.length === 0) {
            return res.status(404).json({ message: "Vendor not found!" });
        }

        const vendorId = vendorResult.rows[0].id;

        const updateQuery = `
            UPDATE vendor_products 
            SET price = $1, moq = $2, stock_quantity = $3, is_active = $4, updated_at = NOW()
            WHERE vendor_id = $5 AND product_id = $6
            RETURNING *
        `;

        const result = await pool.query(updateQuery, [
            Number(price),
            Number(moq),
            Number(stockQuantity),
            isActive !== undefined ? isActive : true,
            vendorId,
            productId
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Product not found or you don't have permission to update it!" });
        }

        return res.status(200).json({
            message: "Product updated successfully",
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Error updating vendor product:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

export const deleteVendorProductController = async (req: Request, res: Response): Promise<Response> => {
    const { productId } = req.params;
    const { userId, role } = (req as any).user;

    if (!userId) {
        return res.status(400).json({ message: "User ID is required!" });
    }

    if (role !== 'vendor') {
        return res.status(403).json({ message: "Unauthorized! Only vendors can delete their products!" });
    }

    if (!productId) {
        return res.status(400).json({ message: "Product ID is required!" });
    }

    try {
        const vendorResult = await pool.query('SELECT id FROM vendors WHERE user_id = $1', [userId]);

        if (vendorResult.rows.length === 0) {
            return res.status(404).json({ message: "Vendor not found!" });
        }

        const vendorId = vendorResult.rows[0].id;

        const deleteQuery = `DELETE FROM vendor_products WHERE vendor_id = $1 AND product_id = $2 RETURNING *`;
        const result = await pool.query(deleteQuery, [vendorId, productId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Product not found or you don't have permission to delete it!" });
        }

        return res.status(200).json({
            message: "Product removed from your catalog successfully"
        });
    } catch (error) {
        console.error("Error deleting vendor product:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}