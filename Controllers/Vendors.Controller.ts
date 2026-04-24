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
        return res.status(201).json({
            message: "Vendor profile created successfully! Your account is pending admin approval. You will be able to list products once approved.",
            vendor,
        });
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

// ─── Vendor Product Listings ───────────────────────────────────────────────────

export const addVendorProduct = async (req: Request, res: Response): Promise<Response> => {
    const { productId, price, moq, stockQuantity, commissionPercentage } = req.body;
    const { userId, role } = (req as any).user;

    if (role !== 'vendor') {
        return res.status(403).json({ message: "Unauthorized! Only vendors can list products." });
    }
    if (!productId || price === undefined || !moq || stockQuantity === undefined) {
        return res.status(400).json({ message: "productId, price, moq, and stockQuantity are required." });
    }
    if (Number(price) < 0 || Number(moq) <= 0 || Number(stockQuantity) < 0) {
        return res.status(400).json({ message: "price must be >= 0, moq must be > 0, stockQuantity must be >= 0." });
    }

    try {
        // Gate: vendor must be approved and not blocked
        const vendorCheck = await pool.query(
            `SELECT id, is_blocked, approval_status FROM vendors WHERE user_id = $1`,
            [userId]
        );

        if (vendorCheck.rows.length === 0) {
            return res.status(404).json({ message: "Vendor profile not found. Please complete your profile first." });
        }

        const vendor = vendorCheck.rows[0];

        if (vendor.approval_status === 'pending') {
            return res.status(403).json({ message: "Your vendor account is pending admin approval. You cannot list products yet." });
        }
        if (vendor.approval_status === 'rejected') {
            return res.status(403).json({ message: "Your vendor account has been rejected. Please contact admin." });
        }
        if (vendor.is_blocked) {
            return res.status(403).json({ message: "Your vendor account is blocked. Please contact admin." });
        }

        // Validate the product exists in the catalog
        const productCheck = await pool.query(`SELECT id FROM products WHERE id = $1`, [productId]);
        if (productCheck.rows.length === 0) {
            return res.status(404).json({ message: "Product not found in catalog." });
        }

        const result = await pool.query(`
            INSERT INTO vendor_products
                (product_id, vendor_id, price, moq, stock_quantity, commision_percentage)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [productId, vendor.id, price, moq, stockQuantity, commissionPercentage ?? 0]);

        return res.status(201).json({ message: "Product listed successfully.", data: result.rows[0] });
    } catch (e: any) {
        if (e.code === '23505') {
            return res.status(409).json({ message: "You have already listed this product. Update it instead." });
        }
        console.error("Error adding vendor product:", e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const updateVendorProduct = async (req: Request, res: Response): Promise<Response> => {
    const { vpId } = req.params;
    const { price, moq, stockQuantity, isActive } = req.body;
    const { userId, role } = (req as any).user;

    if (role !== 'vendor') {
        return res.status(403).json({ message: "Unauthorized! Only vendors can update their listings." });
    }
    if (!vpId) {
        return res.status(400).json({ message: "Vendor product ID is required." });
    }

    try {
        // Ownership check — listing must belong to this vendor
        const ownerCheck = await pool.query(`
            SELECT vp.id
            FROM   vendor_products vp
            JOIN   vendors v ON vp.vendor_id = v.id
            WHERE  vp.id = $1 AND v.user_id = $2
        `, [vpId, userId]);

        if (ownerCheck.rows.length === 0) {
            return res.status(404).json({ message: "Product listing not found or you don't have permission." });
        }

        const result = await pool.query(`
            UPDATE vendor_products
            SET
                price          = COALESCE($1, price),
                moq            = COALESCE($2, moq),
                stock_quantity = COALESCE($3, stock_quantity),
                is_active      = COALESCE($4, is_active),
                updated_at     = NOW()
            WHERE id = $5
            RETURNING *
        `, [
            price        !== undefined ? price        : null,
            moq          !== undefined ? moq          : null,
            stockQuantity !== undefined ? stockQuantity : null,
            isActive     !== undefined ? isActive     : null,
            vpId,
        ]);

        return res.status(200).json({ message: "Product listing updated.", data: result.rows[0] });
    } catch (e) {
        console.error("Error updating vendor product:", e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const removeVendorProduct = async (req: Request, res: Response): Promise<Response> => {
    const { vpId } = req.params;
    const { userId, role } = (req as any).user;

    if (role !== 'vendor') {
        return res.status(403).json({ message: "Unauthorized! Only vendors can remove their listings." });
    }

    try {
        const result = await pool.query(`
            DELETE FROM vendor_products
            WHERE id        = $1
              AND vendor_id = (SELECT id FROM vendors WHERE user_id = $2)
            RETURNING id
        `, [vpId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Product listing not found or you don't have permission." });
        }

        return res.status(200).json({ message: "Product listing removed successfully." });
    } catch (e) {
        console.error("Error removing vendor product:", e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getMyVendorProducts = async (req: Request, res: Response): Promise<Response> => {
    const { userId, role } = (req as any).user;
    const { offset = '0' } = req.query;

    if (role !== 'vendor') {
        return res.status(403).json({ message: "Unauthorized! Only vendors can view their listings." });
    }

    try {
        const result = await pool.query(`
            SELECT
                vp.id                  AS vendor_product_id,
                vp.price,
                vp.moq,
                vp.stock_quantity,
                vp.commision_percentage,
                vp.is_active,
                vp.created_at,
                p.id                   AS product_id,
                p.name                 AS product_name,
                p.description,
                p.category,
                p.product_type,
                pi.image_url           AS primary_image
            FROM  vendor_products vp
            JOIN  vendors         v  ON vp.vendor_id  = v.id
            JOIN  products        p  ON vp.product_id = p.id
            LEFT  JOIN products_images pi
                  ON p.id = pi.product_id AND pi.is_primary = true
            WHERE v.user_id = $1
            ORDER BY vp.created_at DESC
            LIMIT 20 OFFSET $2
        `, [userId, Number(offset) * 20]);

        return res.status(200).json({ message: "Your product listings fetched.", data: result.rows });
    } catch (e) {
        console.error("Error fetching vendor products:", e);
        return res.status(500).json({ message: "Internal server error" });
    }
};