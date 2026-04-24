import { Router } from "express";
import {
    addVendorController,
    createVendorAddress,
    getVendorDetailsController,
    updateVendorAddress,
    updateVendorBasicDetailsController,
    addVendorProduct,
    updateVendorProduct,
    removeVendorProduct,
    getMyVendorProducts,
} from "../Controllers/Vendors.Controller";
import { authMiddleware } from "../Middleware/AuthMiddleware";

const VendorsRouter = Router();

VendorsRouter.use(authMiddleware);

// ─── Vendor Profile ────────────────────────────────────────────────────────────
VendorsRouter.post("/createVendor",               addVendorController);
VendorsRouter.put("/updateVendorBasicDetails",     updateVendorBasicDetailsController);
VendorsRouter.post("/createVendorAddress",         createVendorAddress);
VendorsRouter.put("/updateVendorAddress",          updateVendorAddress);
VendorsRouter.get("/getVendorDetails",             getVendorDetailsController);

// ─── Vendor Product Listings (requires approved account) ──────────────────────
VendorsRouter.post("/products",                    addVendorProduct);
VendorsRouter.put("/products/:vpId",               updateVendorProduct);
VendorsRouter.delete("/products/:vpId",            removeVendorProduct);
VendorsRouter.get("/products/my-listings",         getMyVendorProducts);

export default VendorsRouter;