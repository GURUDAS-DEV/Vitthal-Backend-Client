import type { Request, Response } from "express";
import pool from "../DbConnect";

const actionTaker = ['super_admin', 'admin', 'vendor'];

export const addProductController = async (req: Request, res: Response): Promise<Response> => {
    const { name, description, category, productType, specifications } = req.body;

    const { role } = (req as any).user;
    if (!name || !description || !category || !productType) {
        return res.status(400).json({ message: "Name, description, category, and productType are required" });
    }

    let parsedSpecifications: Record<string, unknown> | unknown[] = {};
    if (specifications) {
        if (typeof specifications === "string") {
            try {
                parsedSpecifications = JSON.parse(specifications);
            }
            catch {
                return res.status(400).json({ message: "Specifications must be valid JSON." });
            }
        }
        else if (typeof specifications === "object" && specifications !== null) {
            parsedSpecifications = specifications;
        }
    }

    if (!actionTaker.includes(role)) {
        return res.status(403).json({ message: "Unauthorized! Only admins, super admins, and vendors can add products." });
    }

    try {
        const query = `INSERT INTO products (name, description, category, product_type, specifications) VALUES ($1, $2, $3, $4, $5) returning *`;
        const values = [name, description, category, productType, parsedSpecifications];
        const result = await pool.query(query, values);
        return res.status(201).json({ message: "Product added successfully", result: result.rows[0] });
    }
    catch (error) {
        console.log("Error while adding Products : ", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

export const addVendorProductController = async (req: Request, res: Response): Promise<Response> => {
    const { productId, price, moq, stockQuantity } = req.body;
    const { userId, role } = (req as any).user;

    if (!productId || price === undefined || !moq || stockQuantity === undefined) {
        return res.status(400).json({ message: "Product ID, price, moq, and stockQuantity are required" });
    }

    if (role !== "vendor") {
        return res.status(403).json({ message: "Unauthorized! Only vendors can add pricing/stock to products." });
    }

    try {
        // Get the vendor's ID from the vendors table using the authenticated user's ID
        const vendorResult = await pool.query('SELECT id FROM vendors WHERE user_id = $1', [userId]);

        if (vendorResult.rows.length === 0) {
            return res.status(404).json({ message: "Please setup your profile first! Profile -> Setup Profile and then try again!." });
        }

        const vendorId = vendorResult.rows[0].id;

        const query = `
            INSERT INTO vendor_products (product_id, vendor_id, price, moq, stock_quantity) 
            VALUES ($1, $2, $3, $4, $5) 
            ON CONFLICT (vendor_id, product_id) 
            DO UPDATE SET price = EXCLUDED.price, moq = EXCLUDED.moq, stock_quantity = EXCLUDED.stock_quantity
            RETURNING *`;
        const values = [productId, vendorId, price, moq, stockQuantity];
        const result = await pool.query(query, values);
        return res.status(201).json({ message: "Vendor product details saved successfully", result: result.rows[0] });
    }
    catch (error) {
        console.log("Error while saving Vendor Product details : ", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

export const deleteProduct = async (req: Request, res: Response): Promise<Response> => {
    const { productId } = req.body;
    const { role } = (req as any).user;

    if (!productId) {
        return res.status(400).json({ message: "Product ID is required" });
    }

    if (role !== "admin" && role !== "super_admin") {
        return res.status(403).json({ message: "Unauthorized! Only admins and super admins can delete products." });
    }

    try {
        const query = `DELETE FROM products WHERE id = $1`;
        const values = [productId];
        const result = await pool.query(query, values);
        return res.status(200).json({ message: "Product deleted successfully", result });
    }
    catch (error) {
        console.log("Error while deleting Products : ", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

export const updateProduct = async (req: Request, res: Response): Promise<Response> => {
    const { productId, name, description, category, productType, specification } = req.body;
    const { role } = (req as any).user;

    if (!productId) {
        return res.status(400).json({ message: "Product ID is required" });
    }

    if (role !== "admin" && role !== "super_admin") {
        return res.status(403).json({ message: "Unauthorized! Only admins and super admins can update products." });
    }

    try {
        const query = `UPDATE products SET name = $1, description = $2, category = $3, product_type = $4, specifications = $5 WHERE id = $6`;
        const values = [name, description, category, productType, specification, productId];
        const result = await pool.query(query, values);
        return res.status(200).json({ message: "Product updated successfully", result });
    }
    catch (error) {
        console.log("Error while updating Products : ", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

export const getAllProducts = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { offset, limit, search, category, productType } = req.query;
        if (offset === undefined || offset === null || isNaN(Number(offset))) {
            return res.status(400).json({ message: "Invalid offset value" });
        }
        const limitValue = Number(limit) > 20 ? 20 : Number(limit) || 20;
        const offsetValue = Number(offset) * limitValue;

        let baseQuery = `SELECT id, name, description, category, product_type, specifications FROM products WHERE 1=1`;
        let countQuery = `SELECT COUNT(*)::int AS total_count FROM products WHERE 1=1`;

        const values: any[] = [];
        let paramCount = 1;

        if (search && typeof search === 'string' && search.trim() !== '') {
            baseQuery += ` AND name ILIKE $${paramCount}`;
            countQuery += ` AND name ILIKE $${paramCount}`;
            values.push(`%${search.trim()}%`);
            paramCount++;
        }

        if (category && typeof category === 'string' && category.trim() !== '') {
            baseQuery += ` AND category = $${paramCount}`;
            countQuery += ` AND category = $${paramCount}`;
            values.push(category.trim());
            paramCount++;
        }

        if (productType && typeof productType === 'string' && productType.trim() !== '') {
            baseQuery += ` AND product_type = $${paramCount}`;
            countQuery += ` AND product_type = $${paramCount}`;
            values.push(productType.trim());
            paramCount++;
        }

        baseQuery += ` ORDER BY created_at DESC, id ASC LIMIT $${paramCount + 1} OFFSET $${paramCount}`;
        const queryValues = [...values, offsetValue, limitValue];

        const query = `
            SELECT 
                p.id AS product_id,
                p.name AS product_name,
                p.description,
                p.category,
                p.product_type,
                p.specifications,

                -- Primary image
                pImg.image_url AS primary_image,

                -- Seller count
                COALESCE(vc.vendor_count, 0) AS seller_count,

                -- Price range
                COALESCE(pr.min_price, 0) AS min_price,
                COALESCE(pr.max_price, 0) AS max_price,
                COALESCE(pr.min_moq, 1) AS min_moq

            FROM (
                ${baseQuery}
            ) p

            -- Primary image (no duplication)
            LEFT JOIN products_images pImg 
                ON p.id = pImg.product_id 
                AND pImg.is_primary = true

            -- Vendor count (lightweight aggregation)
            LEFT JOIN LATERAL (
                SELECT COUNT(DISTINCT vendor_id) AS vendor_count
                FROM vendor_products
                WHERE product_id = p.id
            ) vc ON true

            -- Price range from vendor_products
            LEFT JOIN LATERAL (
                SELECT 
                    MIN(price) AS min_price, 
                    MAX(price) AS max_price,
                    MIN(moq) AS min_moq
                FROM vendor_products
                WHERE product_id = p.id AND is_active = true
            ) pr ON true;
        `;

        const result = await pool.query(query, queryValues);
        const countResult = await pool.query(countQuery, values);
        const totalCount = countResult.rows[0].total_count;
        return res.status(200).json({ message: "Products fetched successfully", totalCount, data: result.rows });
    }
    catch (e) {
        console.log("Error while fetching Products : ", e);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

export const getProductById = async (req: Request, res: Response): Promise<Response> => {
    const { productId } = req.params;
    if (!productId) {
        return res.status(400).json({ message: "Product ID is required" });
    }

    try {
        const query = `
           SELECT 
                p.id AS product_id,
                p.name AS product_name,
                p.description,
                p.category,
                p.product_type,
                p.specifications,

                -- Images array
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
                ) AS images,

                -- Vendors array
                COALESCE(
                    JSON_AGG(DISTINCT JSONB_BUILD_OBJECT(
                        'vendor_id', v.id,
                        'company_name', v.company_name,
                        'price', vp.price,
                        'moq', vp.moq,
                        'stock_quantity', vp.stock_quantity
                    )) FILTER (WHERE v.id IS NOT NULL),
                    '[]'
                ) AS vendors

            FROM products p
            LEFT JOIN products_images pImg ON p.id = pImg.product_id
            LEFT JOIN vendor_products vp ON p.id = vp.product_id
            LEFT JOIN vendors v ON vp.vendor_id = v.id
            LEFT JOIN users u ON v.user_id = u.id

            WHERE p.id = $1

            GROUP BY p.id;
        `;
        const result = await pool.query(query, [productId]);

        return res.status(200).json({ message: "Product fetched successfully", data: result.rows[0] });
    }
    catch (e) {
        console.log("Error while fetching Product by Id : ", e);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getProductsByCategory = async (req: Request, res: Response): Promise<Response> => {
    const validCategories = ['plastic', 'metal', 'steel'];
    const { category } = req.params;
    const { offset, limit } = req.query;
    const limitValue = Number(limit) > 20 ? 20 : Number(limit) || 20;
    const offsetValue = Number(offset) * limitValue;

    try {
        if (!category || typeof category !== "string" || !validCategories.includes(category))
            return res.status(400).json({ message: "Invalid category! Category should be either plastic, metal or steel!" });

        if (offset === undefined || offset === null || isNaN(Number(offset)))
            return res.status(400).json({ message: "Invalid offset value" });

        const query = `
            SELECT 
                p.id AS product_id,
                p.name AS product_name,
                p.description,
                p.category,
                p.product_type,

                -- Primary image
                pImg.image_url AS primary_image,

                -- Vendor count (optimized)
                COALESCE(vc.vendor_count, 0) AS vendor_count,

                -- Price range
                COALESCE(pr.min_price, 0) AS min_price,
                COALESCE(pr.max_price, 0) AS max_price,
                COALESCE(pr.min_moq, 1) AS min_moq

            FROM (
                SELECT id, name, description, category, product_type
                FROM products
                WHERE category = $1
                ORDER BY created_at DESC, id ASC
                LIMIT $3 OFFSET $2
            ) p

            -- Primary image (no duplication)
            LEFT JOIN products_images pImg 
                ON p.id = pImg.product_id 
                AND pImg.is_primary = true

            -- Vendor count (ONLY for selected products)
            LEFT JOIN LATERAL (
                SELECT COUNT(DISTINCT vendor_id) AS vendor_count
                FROM vendor_products vp
                WHERE vp.product_id = p.id
            ) vc ON true

            -- Price range from vendor_products
            LEFT JOIN LATERAL (
                SELECT 
                    MIN(price) AS min_price, 
                    MAX(price) AS max_price,
                    MIN(moq) AS min_moq
                FROM vendor_products vp
                WHERE vp.product_id = p.id AND vp.is_active = true
            ) pr ON true;
        `;

        const result = await pool.query(query, [category, offsetValue, limitValue]);
        const countResult = await pool.query('SELECT COUNT(*)::int AS total_count FROM products WHERE category = $1', [category]);
        const totalCount = countResult.rows[0].total_count;
        return res.status(200).json({ message: "Products fetched successfully", totalCount, data: result.rows });
    }
    catch (e) {
        console.log("Error while fetching Product by category : ", e);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

export const getProductByName = async (req: Request, res: Response): Promise<Response> => {
    const { name } = req.query;
    const { offset, limit } = req.query;

    if (!name || typeof name !== "string") {
        return res.status(400).json({ message: "Product name is required and should be a string" });
    }

    const limitValue = Number(limit) > 20 ? 20 : Number(limit) || 20;
    const offsetValue = offset ? Number(offset) * limitValue : 0;

    try {
        //fuzzy search using ILIKE for case-insensitive partial matching
        const query = `
            SELECT 
                p.id AS product_id,
                p.name AS product_name,
                p.description,
                p.category,
                p.product_type,

                pImg.image_url AS primary_image,

                COALESCE(vc.vendor_count, 0) AS vendor_count

            FROM (
                SELECT id, name, description, category, product_type
                FROM products
                WHERE name ILIKE $1
                ORDER BY created_at DESC, id ASC
                LIMIT $3 OFFSET $2
            ) p

            LEFT JOIN products_images pImg 
                ON p.id = pImg.product_id 
                AND pImg.is_primary = true

            LEFT JOIN LATERAL (
                SELECT COUNT(DISTINCT vendor_id) AS vendor_count
                FROM vendor_products vp
                WHERE vp.product_id = p.id
            ) vc ON true;
        `;
        const result = await pool.query(query, [`%${name}%`, offsetValue, limitValue]);
        const countResult = await pool.query(`SELECT COUNT(*)::int AS total_count FROM products WHERE name ILIKE $1`, [`%${name}%`]);
        const totalCount = countResult.rows[0].total_count;
        return res.status(200).json({ message: "Product fetched successfully", totalCount, data: result.rows });
    }
    catch (e) {
        console.log("Error while fetching Product by name : ", e);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

export const getVendorProductsController = async (req: Request, res: Response): Promise<Response> => {
    const { userId, role } = (req as any).user;
    const { search, category, productType, status } = req.query;

    if (role !== "vendor") {
        return res.status(403).json({ message: "Unauthorized! Only vendors can access their products." });
    }

    try {
        const vendorResult = await pool.query('SELECT id FROM vendors WHERE user_id = $1', [userId]);

        if (vendorResult.rows.length === 0) {
            return res.status(403).json({ message: "Please setup your profile first! Go to Profile -> Setup Profile to complete your registration." });
        }

        const vendorId = vendorResult.rows[0].id;

        let query = `
            SELECT 
                p.id AS product_id,
                p.name AS product_name,
                p.category,
                p.product_type,
                vp.price,
                vp.moq,
                vp.stock_quantity,
                vp.is_active AS status,
                vp.created_at AS created_date,
                pImg.image_url AS primary_image
            FROM vendor_products vp
            JOIN products p ON vp.product_id = p.id
            LEFT JOIN products_images pImg ON p.id = pImg.product_id AND pImg.is_primary = true
            WHERE vp.vendor_id = $1
        `;

        const values: any[] = [vendorId];
        let paramCount = 2;

        if (search && typeof search === 'string' && search.trim() !== '') {
            query += ` AND p.name ILIKE $${paramCount}`;
            values.push(`%${search.trim()}%`);
            paramCount++;
        }

        if (category && typeof category === 'string' && category.trim() !== '') {
            query += ` AND p.category = $${paramCount}`;
            values.push(category.trim());
            paramCount++;
        }

        if (productType && typeof productType === 'string' && productType.trim() !== '') {
            query += ` AND p.product_type = $${paramCount}`;
            values.push(productType.trim());
            paramCount++;
        }

        if (status && typeof status === 'string' && status.trim() !== '') {
            query += ` AND vp.is_active = $${paramCount}`;
            values.push(status.trim() === 'active');
            paramCount++;
        }

        query += ` ORDER BY vp.created_at DESC`;

        const result = await pool.query(query, values);
        return res.status(200).json({ message: "Vendor products fetched successfully", data: result.rows });
    } catch (error) {
        console.log("Error while fetching vendor products : ", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}