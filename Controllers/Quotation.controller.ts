import type { Request, Response } from "express";
import pool from "../DbConnect";

// ─── Client: Request a Quote ───────────────────────────────────────────────────

export const requestQuote = async (req: Request, res: Response): Promise<Response> => {
    const { userId, role } = (req as any).user;
    const { vendorId, productId, quantity, message } = req.body;

    if (role !== 'client') {
        return res.status(403).json({ message: "Only clients can request quotes." });
    }
    if (!vendorId || !productId || !quantity) {
        return res.status(400).json({ message: "vendorId, productId, and quantity are required." });
    }
    if (!Number.isInteger(Number(quantity)) || Number(quantity) <= 0) {
        return res.status(400).json({ message: "Quantity must be a positive integer." });
    }

    try {
        // 1. Validate vendor is approved, active, not blocked
        const vendorCheck = await pool.query(`
            SELECT id, is_blocked, approval_status
            FROM   vendors
            WHERE  id = $1 AND is_active = true
        `, [vendorId]);

        if (vendorCheck.rows.length === 0) {
            return res.status(404).json({ message: "Vendor not found or inactive." });
        }

        const vendor = vendorCheck.rows[0];
        if (vendor.is_blocked) {
            return res.status(400).json({ message: "This vendor is currently unavailable." });
        }
        if (vendor.approval_status !== 'approved') {
            return res.status(400).json({ message: "This vendor is not yet approved to receive orders." });
        }

        // 2. Validate vendor sells this product and quantity meets MOQ
        const vpCheck = await pool.query(`
            SELECT moq, price, stock_quantity
            FROM   vendor_products
            WHERE  vendor_id = $1 AND product_id = $2 AND is_active = true
        `, [vendorId, productId]);

        if (vpCheck.rows.length === 0) {
            return res.status(404).json({ message: "This vendor does not list this product." });
        }

        const vp = vpCheck.rows[0];
        if (Number(quantity) < vp.moq) {
            return res.status(400).json({
                message: `Quantity ${quantity} is below the Minimum Order Quantity (MOQ) of ${vp.moq} for this vendor.`,
            });
        }

        // 3. Block duplicate open quotes
        const existingQuote = await pool.query(`
            SELECT id FROM quotations
            WHERE  client_user_id = $1
              AND  vendor_id      = $2
              AND  product_id     = $3
              AND  status         IN ('pending', 'responded')
        `, [userId, vendorId, productId]);

        if (existingQuote.rows.length > 0) {
            return res.status(409).json({
                message:           "You already have an open quote for this product with this vendor.",
                existing_quote_id: existingQuote.rows[0].id,
            });
        }

        // 4. Create quote
        const result = await pool.query(`
            INSERT INTO quotations (client_user_id, vendor_id, product_id, quantity, client_message)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [userId, vendorId, productId, quantity, message || null]);

        return res.status(201).json({ message: "Quote requested successfully.", data: result.rows[0] });
    } catch (e) {
        console.error("Error requesting quote:", e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ─── Client: List My Quotes ────────────────────────────────────────────────────

export const getMyQuotesClient = async (req: Request, res: Response): Promise<Response> => {
    const { userId, role } = (req as any).user;
    const { status, offset = '0' } = req.query;

    if (role !== 'client') {
        return res.status(403).json({ message: "Only clients can view their quotes." });
    }

    const validStatuses = ['pending', 'responded', 'accepted', 'rejected', 'expired'];
    const values: any[] = [userId, Number(offset) * 20];

    let statusFilter = '';
    if (status && validStatuses.includes(status as string)) {
        statusFilter = ` AND q.status = $3`;
        values.push(status);
    }

    try {
        const result = await pool.query(`
            SELECT
                q.id               AS quote_id,
                q.quantity,
                q.client_message,
                q.status,
                q.vendor_price,
                q.vendor_message,
                q.valid_until,
                q.responded_at,
                q.accepted_at,
                q.rejected_at,
                q.rejection_reason,
                q.created_at,
                p.id               AS product_id,
                p.name             AS product_name,
                p.category,
                p.product_type,
                v.id               AS vendor_id,
                v.company_name,
                pi.image_url       AS product_image
            FROM  quotations q
            JOIN  products   p  ON q.product_id = p.id
            JOIN  vendors    v  ON q.vendor_id  = v.id
            LEFT  JOIN products_images pi
                  ON p.id = pi.product_id AND pi.is_primary = true
            WHERE q.client_user_id = $1
            ${statusFilter}
            ORDER BY q.created_at DESC
            LIMIT 20 OFFSET $2
        `, values);

        return res.status(200).json({ message: "Quotes fetched successfully", data: result.rows });
    } catch (e) {
        console.error("Error fetching client quotes:", e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ─── Vendor: List Incoming Quotes ─────────────────────────────────────────────

export const getMyQuotesVendor = async (req: Request, res: Response): Promise<Response> => {
    const { userId, role } = (req as any).user;
    const { status, offset = '0' } = req.query;

    if (role !== 'vendor') {
        return res.status(403).json({ message: "Only vendors can view incoming quotes." });
    }

    try {
        const vendorResult = await pool.query(
            `SELECT id, approval_status FROM vendors WHERE user_id = $1`,
            [userId]
        );
        if (vendorResult.rows.length === 0) {
            return res.status(404).json({ message: "Vendor profile not found." });
        }
        const vendor = vendorResult.rows[0];
        if (vendor.approval_status !== 'approved') {
            return res.status(403).json({ message: "Your vendor account is not yet approved." });
        }

        const validStatuses = ['pending', 'responded', 'accepted', 'rejected', 'expired'];
        const values: any[] = [vendor.id, Number(offset) * 20];

        let statusFilter = '';
        if (status && validStatuses.includes(status as string)) {
            statusFilter = ` AND q.status = $3`;
            values.push(status);
        }

        const result = await pool.query(`
            SELECT
                q.id                  AS quote_id,
                q.quantity,
                q.client_message,
                q.status,
                q.vendor_price,
                q.vendor_message,
                q.valid_until,
                q.responded_at,
                q.created_at,
                p.id                  AS product_id,
                p.name                AS product_name,
                p.category,
                vp.price              AS your_listed_price,
                vp.moq,
                u.name                AS client_name,
                u.email               AS client_email
            FROM  quotations     q
            JOIN  products       p  ON q.product_id = p.id
            JOIN  vendor_products vp
                  ON q.vendor_id = vp.vendor_id AND q.product_id = vp.product_id
            JOIN  users          u  ON q.client_user_id = u.id
            WHERE q.vendor_id = $1
            ${statusFilter}
            ORDER BY q.created_at DESC
            LIMIT 20 OFFSET $2
        `, values);

        return res.status(200).json({ message: "Incoming quotes fetched successfully", data: result.rows });
    } catch (e) {
        console.error("Error fetching vendor quotes:", e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ─── Vendor: Respond to a Quote ───────────────────────────────────────────────

export const respondToQuote = async (req: Request, res: Response): Promise<Response> => {
    const { quoteId } = req.params;
    const { userId, role } = (req as any).user;
    const { vendorPrice, vendorMessage, validUntil } = req.body;

    if (role !== 'vendor') {
        return res.status(403).json({ message: "Only vendors can respond to quotes." });
    }
    if (!vendorPrice || Number(vendorPrice) <= 0) {
        return res.status(400).json({ message: "A valid vendorPrice (> 0) is required." });
    }

    try {
        // Resolve vendor ID and ensure they are approved
        const vendorResult = await pool.query(
            `SELECT id FROM vendors WHERE user_id = $1 AND approval_status = 'approved'`,
            [userId]
        );
        if (vendorResult.rows.length === 0) {
            return res.status(403).json({ message: "Approved vendor profile not found." });
        }
        const vendorId = vendorResult.rows[0].id;

        // Quote must belong to this vendor and still be pending
        const quoteCheck = await pool.query(
            `SELECT id, status FROM quotations WHERE id = $1 AND vendor_id = $2`,
            [quoteId, vendorId]
        );
        if (quoteCheck.rows.length === 0) {
            return res.status(404).json({ message: "Quote not found." });
        }
        if (quoteCheck.rows[0].status !== 'pending') {
            return res.status(400).json({
                message: `Cannot respond to a quote with status '${quoteCheck.rows[0].status}'. Only 'pending' quotes can receive a response.`,
            });
        }

        const result = await pool.query(`
            UPDATE quotations
            SET   status        = 'responded',
                  vendor_price  = $1,
                  vendor_message = $2,
                  valid_until   = $3,
                  responded_at  = NOW(),
                  updated_at    = NOW()
            WHERE id = $4
            RETURNING *
        `, [vendorPrice, vendorMessage || null, validUntil || null, quoteId]);

        return res.status(200).json({ message: "Quote responded to successfully.", data: result.rows[0] });
    } catch (e) {
        console.error("Error responding to quote:", e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ─── Client: Accept a Quote → creates Order ────────────────────────────────────

export const acceptQuote = async (req: Request, res: Response): Promise<Response> => {
    const { quoteId } = req.params;
    const { userId, role } = (req as any).user;

    if (role !== 'client') {
        return res.status(403).json({ message: "Only clients can accept quotes." });
    }

    try {
        // Fetch quote + client shipping address in a single query
        const quoteResult = await pool.query(`
            SELECT
                q.*,
                a.address   AS sh_address,
                a.city      AS sh_city,
                a.state     AS sh_state,
                a.country   AS sh_country,
                a.pincode   AS sh_pincode
            FROM  quotations q
            LEFT  JOIN addresses a ON q.client_user_id = a.user_id
            WHERE q.id = $1 AND q.client_user_id = $2
        `, [quoteId, userId]);

        if (quoteResult.rows.length === 0) {
            return res.status(404).json({ message: "Quote not found." });
        }

        const quote = quoteResult.rows[0];

        if (quote.status !== 'responded') {
            return res.status(400).json({
                message: `Cannot accept a quote with status '${quote.status}'. Vendor must respond first.`,
            });
        }

        // Check validity window
        if (quote.valid_until && new Date(quote.valid_until) < new Date()) {
            await pool.query(
                `UPDATE quotations SET status = 'expired', updated_at = NOW() WHERE id = $1`,
                [quoteId]
            );
            return res.status(400).json({ message: "This quote has expired. Please request a new one." });
        }

        await pool.query('BEGIN');

        // 1. Mark quote accepted
        await pool.query(
            `UPDATE quotations SET status = 'accepted', accepted_at = NOW(), updated_at = NOW() WHERE id = $1`,
            [quoteId]
        );

        // 2. Create order from accepted quote
        const totalAmount = parseFloat(quote.vendor_price) * parseInt(quote.quantity);
        const orderResult = await pool.query(`
            INSERT INTO orders (
                client_user_id, vendor_id, product_id, quotation_id,
                quantity, unit_price, total_amount,
                shipping_address, shipping_city, shipping_state,
                shipping_country, shipping_pincode
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
            RETURNING *
        `, [
            userId, quote.vendor_id, quote.product_id, quoteId,
            quote.quantity, quote.vendor_price, totalAmount,
            quote.sh_address, quote.sh_city, quote.sh_state,
            quote.sh_country, quote.sh_pincode,
        ]);

        await pool.query('COMMIT');

        return res.status(201).json({
            message: "Quote accepted! Order created successfully.",
            data: {
                quote_id: quoteId,
                order:    orderResult.rows[0],
            },
        });
    } catch (e) {
        await pool.query('ROLLBACK');
        console.error("Error accepting quote:", e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ─── Client: Reject a Quote ───────────────────────────────────────────────────

export const rejectQuote = async (req: Request, res: Response): Promise<Response> => {
    const { quoteId } = req.params;
    const { userId, role } = (req as any).user;
    const { reason } = req.body;

    if (role !== 'client') {
        return res.status(403).json({ message: "Only clients can reject quotes." });
    }

    try {
        const quoteCheck = await pool.query(
            `SELECT id, status FROM quotations WHERE id = $1 AND client_user_id = $2`,
            [quoteId, userId]
        );

        if (quoteCheck.rows.length === 0) {
            return res.status(404).json({ message: "Quote not found." });
        }

        const { status } = quoteCheck.rows[0];
        if (!['pending', 'responded'].includes(status)) {
            return res.status(400).json({
                message: `Cannot reject a quote with status '${status}'.`,
            });
        }

        const result = await pool.query(`
            UPDATE quotations
            SET   status           = 'rejected',
                  rejection_reason = $1,
                  rejected_at      = NOW(),
                  updated_at       = NOW()
            WHERE id = $2
            RETURNING id, status, rejection_reason, rejected_at
        `, [reason || null, quoteId]);

        return res.status(200).json({ message: "Quote rejected.", data: result.rows[0] });
    } catch (e) {
        console.error("Error rejecting quote:", e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

//  Admin: View All Quotes 

export const getAllQuotesAdmin = async (req: Request, res: Response): Promise<Response> => {
    const { role } = (req as any).user;
    const { status, offset = '0' } = req.query;

    if (!['admin', 'super_admin'].includes(role)) {
        return res.status(403).json({ message: "Unauthorized!" });
    }

    const validStatuses = ['pending', 'responded', 'accepted', 'rejected', 'expired'];
    const values: any[] = [Number(offset) * 20];

    let statusFilter = '';
    if (status && validStatuses.includes(status as string)) {
        statusFilter = ` WHERE q.status = $2`;
        values.push(status);
    }

    try {
        const result = await pool.query(`
            SELECT
                q.id              AS quote_id,
                q.quantity,
                q.status,
                q.vendor_price,
                q.valid_until,
                q.created_at,
                p.name            AS product_name,
                v.company_name    AS vendor_company,
                u.name            AS client_name,
                u.email           AS client_email
            FROM  quotations q
            JOIN  products   p ON q.product_id     = p.id
            JOIN  vendors    v ON q.vendor_id       = v.id
            JOIN  users      u ON q.client_user_id = u.id
            ${statusFilter}
            ORDER BY q.created_at DESC
            LIMIT 20 OFFSET $1
        `, values);

        return res.status(200).json({ message: "All quotes fetched successfully", data: result.rows });
    } catch (e) {
        console.error("Error fetching all quotes:", e);
        return res.status(500).json({ message: "Internal server error" });
    }
};
