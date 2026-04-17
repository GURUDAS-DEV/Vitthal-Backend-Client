import { Router } from "express";
import { addVendorController, createVendorAddress, updateVendorAddress, updateVendorBasicDetailsController } from "../Controllers/Vendors.Controller";


const VendorsRouter = Router();

VendorsRouter.post("/createVendor", addVendorController);
VendorsRouter.put("/updateVendorBasicDetails", updateVendorBasicDetailsController);
VendorsRouter.post("/createVendorAddress", createVendorAddress);
VendorsRouter.put("/updateVendorAddress", updateVendorAddress);


export default VendorsRouter;