import type { Request, Response } from "express";
import pool from "../DbConnect";

const actionTaker = ['super_admin', 'admin'];

export const addProductController = async (req: Request, res: Response): Promise<Response> => {
    const { name, description, category, productType, specifications } = req.body;

    const { role } = (req as any).user;
    if (!name || !description || !category || !productType || !specifications) {
        return res.status(400).json({ message: "All fields are required" });
    }

    let parsedSpecifications: Record<string, unknown> | unknown[];
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
    else {
        return res.status(400).json({ message: "Specifications must be a JSON object or array." });
    }

    if (!actionTaker.includes(role)) {
        return res.status(403).json({ message: "Unauthorized! Only admins and super admins can add products." });
    }

    try {
        const query = `INSERT INTO products (name, description, category, product_type, specifications) VALUES ($1, $2, $3, $4, $5) returning *`;
        const values = [name, description, category, productType, parsedSpecifications];
        const result = await pool.query(query, values);
        return res.status(201).json({ message: "Product added successfully", result });
    }
    catch (error) {
        console.log("Error while adding Products : ", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

export const deleteProduct = async (req: Request, res: Response): Promise<Response> => {
    const { productId } = req.body;
    const { role } = (req as any).user;

    if (!productId) {
        return res.status(400).json({ message: "Product ID is required" });
    }

    if (!actionTaker.includes(role)) {
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

    if (!actionTaker.includes(role)) {
        return res.status(403).json({ message: "Unauthorized! Only admins and super admins can update products." });
    }

    try {
        const query = `UPDATE products SET name = $1, description = $2, category = $3, product_type = $4, specification = $5 WHERE id = $6`;
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
        const { offset, limit } = req.query;
        if (offset === undefined || offset === null || isNaN(Number(offset))) {
            return res.status(400).json({ message: "Invalid offset value" });
        }
        const limitValue = Number(limit) > 20 ? 20 : Number(limit) || 20;
        const offsetValue = Number(offset) * limitValue;
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
                COALESCE(vc.vendor_count, 0) AS seller_count

            FROM (
                SELECT id, name, description, category, product_type, specifications
                FROM products
                ORDER BY created_at DESC, id ASC
                LIMIT $2 OFFSET $1
            ) p

            -- Primary image (no duplication)
            LEFT JOIN products_images pImg 
                ON p.id = pImg.product_id 
                AND pImg.is_primary = true

            -- Vendor count (lightweight aggregation)
            LEFT JOIN (
                SELECT product_id, COUNT(DISTINCT vendor_id) AS vendor_count
                FROM vendor_products
                GROUP BY product_id
            ) vc 
            ON p.id = vc.product_id;
        `;

        const result = await pool.query(query, [offsetValue, limitValue]);
        const countResult = await pool.query('SELECT COUNT(*)::int AS total_count FROM products');
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
                COALESCE(vc.vendor_count, 0) AS vendor_count

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
            ) vc ON true;
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

    if (offset === undefined || offset === null || isNaN(Number(offset))) {
        return res.status(400).json({ message: "Invalid offset value" });
    }

    const limitValue = Number(limit) > 20 ? 20 : Number(limit) || 20;
    const offsetValue = Number(offset) * limitValue;

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

            LEFT JOIN product_images pImg 
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