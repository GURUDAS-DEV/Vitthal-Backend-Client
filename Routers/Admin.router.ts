import { Router } from "express";
import {
    getAdminDashboard,
    getPendingVendors,
    getAllVendors,
    approveVendor,
    rejectVendor,
    blockVendor,
    unblockVendor,
    createEmployee,
    getEmployees,
    toggleEmployeeStatus,
    getAllClients,
} from "../Controllers/Admin.controller";
import { authMiddleware } from "../Middleware/AuthMiddleware";

const adminRouter = Router();

// All admin routes require authentication
adminRouter.use(authMiddleware);

// Dashboard 
adminRouter.get("/dashboard", getAdminDashboard);

//  Vendor Management 
adminRouter.get("/vendors",                  getAllVendors);
adminRouter.get("/vendors/pending",          getPendingVendors);
adminRouter.patch("/vendors/:vendorId/approve", approveVendor);
adminRouter.patch("/vendors/:vendorId/reject",  rejectVendor);
adminRouter.patch("/vendors/:vendorId/block",   blockVendor);
adminRouter.patch("/vendors/:vendorId/unblock", unblockVendor);

//  Employee Management 
adminRouter.post("/employees",                          createEmployee);
adminRouter.get("/employees",                           getEmployees);
adminRouter.patch("/employees/:employeeId/toggle-status", toggleEmployeeStatus);

//  Client Management 
adminRouter.get("/clients", getAllClients);

export default adminRouter;
