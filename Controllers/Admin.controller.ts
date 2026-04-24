import type { Request, Response } from "express";
import bcrypt from 'bcrypt';
import type { DatabaseError } from 'pg';
import pool from "../DbConnect";

const adminRoles = ['admin', 'super_admin'];

//  Dashboard 

export const getAdminDashboard = async (req: Request, res: Response): Promise<Response> => {
    const { role } = (req as any).user;
    if (!adminRoles.includes(role)) {
        return res.status(403).json({ message: "Unauthorized! Only admins can access the dashboard." });
    }

    try {
        const [vendorStats, clientStats, productStats, pendingVendors, orderStats] = await Promise.all([
            pool.query(`
                SELECT
                    COUNT(*)                                          AS total,
                    COUNT(*) FILTER (WHERE is_active  = true)        AS active,
                    COUNT(*) FILTER (WHERE is_blocked = true)        AS blocked,
                    COUNT(*) FILTER (WHERE approval_status = 'pending')  AS pending
                FROM vendors
            `),
            pool.query(`SELECT COUNT(*) AS total FROM client`),
            pool.query(`SELECT COUNT(*) AS total FROM products`),
            pool.query(`SELECT COUNT(*) AS total FROM vendors WHERE approval_status = 'pending'`),
            pool.query(`
                SELECT
                    COUNT(*)                                              AS total,
                    COUNT(*) FILTER (WHERE status = 'placed')            AS new_orders,
                    COUNT(*) FILTER (WHERE status = 'delivered')         AS delivered,
                    COUNT(*) FILTER (WHERE status = 'cancelled')         AS cancelled,
                    COALESCE(SUM(total_amount) FILTER (WHERE payment_status IN ('paid', 'in_escrow', 'released')), 0) AS total_revenue
                FROM orders
            `),
        ]);

        return res.status(200).json({
            message: "Dashboard stats fetched successfully",
            data: {
                vendors: {
                    total:           parseInt(vendorStats.rows[0].total),
                    active:          parseInt(vendorStats.rows[0].active),
                    blocked:         parseInt(vendorStats.rows[0].blocked),
                    pending_approval: parseInt(vendorStats.rows[0].pending),
                },
                clients:  { total: parseInt(clientStats.rows[0].total) },
                products: { total: parseInt(productStats.rows[0].total) },
                orders: {
                    total:         parseInt(orderStats.rows[0].total),
                    new_orders:    parseInt(orderStats.rows[0].new_orders),
                    delivered:     parseInt(orderStats.rows[0].delivered),
                    cancelled:     parseInt(orderStats.rows[0].cancelled),
                    total_revenue: parseFloat(orderStats.rows[0].total_revenue),
                },
            },
        });
    } catch (e) {
        console.error("Dashboard error:", e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

//  Vendor Management ─

export const getPendingVendors = async (req: Request, res: Response): Promise<Response> => {
    const { role } = (req as any).user;
    if (!adminRoles.includes(role)) {
        return res.status(403).json({ message: "Unauthorized!" });
    }

    const { offset = '0' } = req.query;

    try {
        const result = await pool.query(`
            SELECT
                v.id          AS vendor_id,
                v.company_name,
                v.gst_number,
                v.phone,
                v.created_at,
                u.name        AS user_name,
                u.email       AS user_email,
                a.city,
                a.state
            FROM  vendors  v
            JOIN  users    u ON v.user_id = u.id
            LEFT  JOIN addresses a ON u.id = a.user_id
            WHERE v.approval_status = 'pending'
            ORDER BY v.created_at ASC
            LIMIT 20 OFFSET $1
        `, [Number(offset) * 20]);

        return res.status(200).json({
            message: "Pending vendors fetched successfully",
            data: result.rows,
        });
    } catch (e) {
        console.error("Error fetching pending vendors:", e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getAllVendors = async (req: Request, res: Response): Promise<Response> => {
    const { role } = (req as any).user;
    if (!adminRoles.includes(role)) {
        return res.status(403).json({ message: "Unauthorized!" });
    }

    const { status, offset = '0' } = req.query;
    const validStatuses = ['pending', 'approved', 'rejected'];
    const offsetValue = Number(offset) * 20;

    try {
        let query = `
            SELECT
                v.id              AS vendor_id,
                v.company_name,
                v.gst_number,
                v.phone,
                v.rating,
                v.is_active,
                v.is_blocked,
                v.approval_status,
                v.approved_at,
                v.rejection_reason,
                v.created_at,
                u.name            AS user_name,
                u.email           AS user_email,
                a.city,
                a.state
            FROM  vendors  v
            JOIN  users    u ON v.user_id  = u.id
            LEFT  JOIN addresses a ON u.id = a.user_id
        `;

        let result;
        if (status && validStatuses.includes(status as string)) {
            query += ` WHERE v.approval_status = $1 ORDER BY v.created_at DESC LIMIT 20 OFFSET $2`;
            result  = await pool.query(query, [status, offsetValue]);
        } else {
            query += ` ORDER BY v.created_at DESC LIMIT 20 OFFSET $1`;
            result  = await pool.query(query, [offsetValue]);
        }

        return res.status(200).json({ message: "Vendors fetched successfully", data: result.rows });
    } catch (e) {
        console.error("Error fetching vendors:", e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const approveVendor = async (req: Request, res: Response): Promise<Response> => {
    const { vendorId } = req.params;
    const { userId, role } = (req as any).user;

    if (!adminRoles.includes(role)) {
        return res.status(403).json({ message: "Unauthorized!" });
    }
    if (!vendorId) {
        return res.status(400).json({ message: "Vendor ID is required" });
    }

    try {
        const vendor = await pool.query(
            `SELECT id, approval_status FROM vendors WHERE id = $1`,
            [vendorId]
        );

        if (vendor.rows.length === 0) {
            return res.status(404).json({ message: "Vendor not found" });
        }
        if (vendor.rows[0].approval_status === 'approved') {
            return res.status(400).json({ message: "Vendor is already approved" });
        }

        const result = await pool.query(`
            UPDATE vendors
            SET   approval_status = 'approved',
                  approved_by     = $1,
                  approved_at     = NOW(),
                  rejection_reason = NULL,
                  updated_at      = NOW()
            WHERE id = $2
            RETURNING id, company_name, approval_status, approved_at
        `, [userId, vendorId]);

        return res.status(200).json({ message: "Vendor approved successfully", data: result.rows[0] });
    } catch (e) {
        console.error("Error approving vendor:", e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const rejectVendor = async (req: Request, res: Response): Promise<Response> => {
    const { vendorId } = req.params;
    const { userId, role } = (req as any).user;
    const { reason } = req.body;

    if (!adminRoles.includes(role)) {
        return res.status(403).json({ message: "Unauthorized!" });
    }
    if (!vendorId) {
        return res.status(400).json({ message: "Vendor ID is required" });
    }

    try {
        const vendor = await pool.query(
            `SELECT id, approval_status FROM vendors WHERE id = $1`,
            [vendorId]
        );

        if (vendor.rows.length === 0) {
            return res.status(404).json({ message: "Vendor not found" });
        }
        if (vendor.rows[0].approval_status === 'rejected') {
            return res.status(400).json({ message: "Vendor is already rejected" });
        }

        const result = await pool.query(`
            UPDATE vendors
            SET   approval_status    = 'rejected',
                  approved_by        = $1,
                  rejection_reason   = $2,
                  updated_at         = NOW()
            WHERE id = $3
            RETURNING id, company_name, approval_status, rejection_reason
        `, [userId, reason || null, vendorId]);

        return res.status(200).json({ message: "Vendor rejected", data: result.rows[0] });
    } catch (e) {
        console.error("Error rejecting vendor:", e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const blockVendor = async (req: Request, res: Response): Promise<Response> => {
    const { vendorId } = req.params;
    const { role } = (req as any).user;

    if (!adminRoles.includes(role)) {
        return res.status(403).json({ message: "Unauthorized!" });
    }

    try {
        const result = await pool.query(`
            UPDATE vendors
            SET is_blocked = true, updated_at = NOW()
            WHERE id = $1
            RETURNING id, company_name, is_blocked
        `, [vendorId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Vendor not found" });
        }
        return res.status(200).json({ message: "Vendor blocked successfully", data: result.rows[0] });
    } catch (e) {
        console.error("Error blocking vendor:", e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const unblockVendor = async (req: Request, res: Response): Promise<Response> => {
    const { vendorId } = req.params;
    const { role } = (req as any).user;

    if (!adminRoles.includes(role)) {
        return res.status(403).json({ message: "Unauthorized!" });
    }

    try {
        const result = await pool.query(`
            UPDATE vendors
            SET is_blocked = false, updated_at = NOW()
            WHERE id = $1
            RETURNING id, company_name, is_blocked
        `, [vendorId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Vendor not found" });
        }
        return res.status(200).json({ message: "Vendor unblocked successfully", data: result.rows[0] });
    } catch (e) {
        console.error("Error unblocking vendor:", e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

//  Employee Management 

export const createEmployee = async (req: Request, res: Response): Promise<Response> => {
    const { role } = (req as any).user;

    // Only super_admin can create admin-level accounts
    if (role !== 'super_admin') {
        return res.status(403).json({ message: "Unauthorized! Only super admins can create employees." });
    }

    const { name, email, password, employeeRole } = req.body;
    const validEmployeeRoles = ['admin', 'super_admin'];

    if (!name || !email || !password || !employeeRole) {
        return res.status(400).json({ message: "name, email, password, and employeeRole are required." });
    }
    if (!validEmployeeRoles.includes(employeeRole)) {
        return res.status(400).json({
            message: `Invalid employee role. Must be one of: ${validEmployeeRoles.join(', ')}`,
        });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(`
            INSERT INTO users (name, email, password_hash, role)
            VALUES ($1, $2, $3, $4)
            RETURNING id, name, email, role, created_at
        `, [name, email, hashedPassword, employeeRole]);

        return res.status(201).json({ message: "Employee created successfully", data: result.rows[0] });
    } catch (e) {
        const dbError = e as DatabaseError;
        if (dbError.code === '23505') {
            return res.status(409).json({ message: "An account with this email already exists." });
        }
        console.error("Error creating employee:", e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getEmployees = async (req: Request, res: Response): Promise<Response> => {
    const { role } = (req as any).user;
    if (!adminRoles.includes(role)) {
        return res.status(403).json({ message: "Unauthorized!" });
    }

    try {
        const result = await pool.query(`
            SELECT id, name, email, role, is_active, created_at
            FROM   users
            WHERE  role IN ('admin', 'super_admin')
            ORDER  BY created_at DESC
        `);

        return res.status(200).json({ message: "Employees fetched successfully", data: result.rows });
    } catch (e) {
        console.error("Error fetching employees:", e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const toggleEmployeeStatus = async (req: Request, res: Response): Promise<Response> => {
    const { employeeId } = req.params;
    const { role } = (req as any).user;

    if (role !== 'super_admin') {
        return res.status(403).json({ message: "Unauthorized! Only super admins can change employee status." });
    }

    try {
        const result = await pool.query(`
            UPDATE users
            SET    is_active   = NOT is_active,
                   updated_at  = NOW()
            WHERE  id   = $1
              AND  role IN ('admin', 'super_admin')
            RETURNING id, name, email, role, is_active
        `, [employeeId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Employee not found." });
        }
        return res.status(200).json({ message: "Employee status toggled", data: result.rows[0] });
    } catch (e) {
        console.error("Error toggling employee status:", e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

//  Client Management 

export const getAllClients = async (req: Request, res: Response): Promise<Response> => {
    const { role } = (req as any).user;
    if (!adminRoles.includes(role)) {
        return res.status(403).json({ message: "Unauthorized!" });
    }

    const { offset = '0' } = req.query;

    try {
        const result = await pool.query(`
            SELECT
                u.id         AS user_id,
                u.name,
                u.email,
                u.is_active,
                u.created_at,
                c.phone,
                a.city,
                a.state
            FROM  users u
            LEFT  JOIN client    c ON u.id = c.user_id
            LEFT  JOIN addresses a ON u.id = a.user_id
            WHERE u.role = 'client'
            ORDER BY u.created_at DESC
            LIMIT 20 OFFSET $1
        `, [Number(offset) * 20]);

        return res.status(200).json({ message: "Clients fetched successfully", data: result.rows });
    } catch (e) {
        console.error("Error fetching clients:", e);
        return res.status(500).json({ message: "Internal server error" });
    }
};
