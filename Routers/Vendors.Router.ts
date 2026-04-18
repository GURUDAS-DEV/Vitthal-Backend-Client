import { Router } from "express";
import { addVendorController, createVendorAddress, getVendorDetailsController, updateVendorAddress, updateVendorBasicDetailsController } from "../Controllers/Vendors.Controller";
import { authMiddleware } from "../Middleware/AuthMiddleware";


const VendorsRouter = Router();

VendorsRouter.use(authMiddleware);

VendorsRouter.post("/createVendor", addVendorController);
VendorsRouter.put("/updateVendorBasicDetails", updateVendorBasicDetailsController);
VendorsRouter.post("/createVendorAddress", createVendorAddress);
VendorsRouter.put("/updateVendorAddress", updateVendorAddress);

VendorsRouter.get("/getVendorDetails", getVendorDetailsController);

export default VendorsRouter;