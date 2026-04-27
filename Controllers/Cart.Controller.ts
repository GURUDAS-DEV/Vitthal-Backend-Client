import type { Request, Response } from "express";
import pool from "../DbConnect";


export const getCartDataController = async (req: Request, res: Response): Promise<Response> => {
    const userId = (req as any).user?.userId;
    if (!userId) {
        return res.status(401).json({ message: "User Id doesn't found" });
    }
    try {
        const query = `
            SELECT
                ci.id as cart_item_id,
                ci.product_id,
                ci.vendor_id,
                ci.quantity,
                ci.price_at_added,
                ci.created_at,
                p.name as product_name,
                vp.price as current_price,
                vp.moq,
                vp.stock_quantity,
                (SELECT image_url FROM products_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as image_url,
                v.company_name as vendor_name
            FROM carts c
            JOIN cart_items ci ON c.id = ci.cart_id
            JOIN products p ON ci.product_id = p.id
            JOIN vendors v ON ci.vendor_id = v.id
            JOIN vendor_products vp ON vp.product_id = ci.product_id AND vp.vendor_id = ci.vendor_id
            WHERE c.user_id = $1 AND c.status = 'active'
            ORDER BY ci.created_at DESC
        `;

        const result = await pool.query(query, [userId]);
        return res.status(200).json({ data: result.rows });
    } catch (error) {
        console.error("Error in getCartDataController: ", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const addCartItemController = async (req: Request, res: Response): Promise<Response> => {
    const userId = (req as any).user?.userId;
    if (!userId) {
        return res.status(401).json({ message: "User Id not found" });
    }

    const { product_id, vendor_id, quantity } = req.body;
    if (!product_id || !vendor_id || !quantity || quantity < 1) {
        return res.status(400).json({ message: "product_id, vendor_id, and quantity (>=1) are required" });
    }

    try {
        // 1. Get or create cart
        let cartResult = await pool.query(
            `SELECT id FROM carts WHERE user_id = $1 AND status = 'active'`,
            [userId]
        );

        let cartId: string;
        if (cartResult.rows.length === 0) {
            cartResult = await pool.query(
                `INSERT INTO carts (user_id, status, total_amount) VALUES ($1, 'active', 0) RETURNING id`,
                [userId]
            );
            cartId = cartResult.rows[0].id;
        } else {
            cartId = cartResult.rows[0].id;
        }

        // 2. Get current price from vendor_products (price lives here, not in products)
        const priceResult = await pool.query(
            `SELECT price, moq FROM vendor_products WHERE product_id = $1 AND vendor_id = $2 AND is_active = true`,
            [product_id, vendor_id]
        );
        if (priceResult.rows.length === 0) {
            return res.status(404).json({ message: "Product not available from this vendor" });
        }
        const currentPrice = priceResult.rows[0].price;

        // 3. Upsert cart item
        await pool.query(
            `INSERT INTO cart_items (cart_id, product_id, vendor_id, quantity, price_at_added)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (cart_id, product_id, vendor_id)
             DO UPDATE SET quantity = cart_items.quantity + $4, updated_at = NOW()`,
            [cartId, product_id, vendor_id, quantity, currentPrice]
        );

        return res.status(201).json({ message: "Item added to cart", cart_id: cartId });
    } catch (e) {
        console.error("Error in addCartItemController: ", e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const updateCartItemController = async (req: Request, res: Response): Promise<Response> => {
    const userId = (req as any).user?.userId;
    if (!userId) {
        return res.status(401).json({ message: "User Id not found" });
    }

    const { product_id, vendor_id, quantity } = req.body;
    if (!product_id || !vendor_id || !quantity || quantity < 1) {
        return res.status(400).json({ message: "product_id, vendor_id, and quantity (>=1) are required" });
    }

    try {
        // Get user's cart
        const cartResult = await pool.query(
            `SELECT id FROM carts WHERE user_id = $1 AND status = 'active'`,
            [userId]
        );
        if (cartResult.rows.length === 0) {
            return res.status(404).json({ message: "Cart not found" });
        }
        const cartId = cartResult.rows[0].id;

        // Update quantity
        const updateResult = await pool.query(
            `UPDATE cart_items SET quantity = $1, updated_at = NOW()
             WHERE cart_id = $2 AND product_id = $3 AND vendor_id = $4
             RETURNING id`,
            [quantity, cartId, product_id, vendor_id]
        );

        if (updateResult.rows.length === 0) {
            return res.status(404).json({ message: "Cart item not found" });
        }

        return res.status(200).json({ message: "Quantity updated" });
    } catch (e) {
        console.error("Error in updateCartItemController: ", e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const removeCartItemController = async (req: Request, res: Response): Promise<Response> => {
    const userId = (req as any).user?.userId;
    if (!userId) {
        return res.status(401).json({ message: "User Id not found" });
    }

    const { product_id, vendor_id } = req.body;
    if (!product_id || !vendor_id) {
        return res.status(400).json({ message: "product_id and vendor_id are required" });
    }

    try {
        // Get user's cart
        const cartResult = await pool.query(
            `SELECT id FROM carts WHERE user_id = $1 AND status = 'active'`,
            [userId]
        );
        if (cartResult.rows.length === 0) {
            return res.status(404).json({ message: "Cart not found" });
        }
        const cartId = cartResult.rows[0].id;

        // Delete item
        const deleteResult = await pool.query(
            `DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2 AND vendor_id = $3 RETURNING id`,
            [cartId, product_id, vendor_id]
        );

        if (deleteResult.rows.length === 0) {
            return res.status(404).json({ message: "Cart item not found" });
        }

        return res.status(200).json({ message: "Item removed" });
    } catch (e) {
        console.error("Error in removeCartItemController: ", e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const clearCartController = async (req: Request, res: Response): Promise<Response> => {
    const userId = (req as any).user?.userId;
    if (!userId) {
        return res.status(401).json({ message: "User Id not found" });
    }

    try {
        // Get user's cart
        const cartResult = await pool.query(
            `SELECT id FROM carts WHERE user_id = $1 AND status = 'active'`,
            [userId]
        );
        if (cartResult.rows.length === 0) {
            return res.status(200).json({ message: "Cart is already empty" });
        }
        const cartId = cartResult.rows[0].id;

        // Delete all items
        await pool.query(`DELETE FROM cart_items WHERE cart_id = $1`, [cartId]);

        return res.status(200).json({ message: "Cart cleared" });
    } catch (e) {
        console.error("Error in clearCartController: ", e);
        return res.status(500).json({ message: "Internal server error" });
    }
};