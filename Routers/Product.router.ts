import { Router } from "express";

import { addProductController, deleteProduct, getAllProducts, getProductById, getProductByName, getProductsByCategory, updateProduct, addVendorProductController, getVendorProductsController } from "../Controllers/Product.controller";

import { authMiddleware } from "../Middleware/AuthMiddleware";

const productRouter = Router();

// Public routes
productRouter.get("/getAllProducts", getAllProducts);
productRouter.get("/getProductById/:productId", getProductById);
productRouter.get("/getProductsByCategory/:category", getProductsByCategory);
productRouter.get("/getProductByName", getProductByName);

// Secured routes
productRouter.use(authMiddleware);

productRouter.get("/getVendorProducts", getVendorProductsController);
productRouter.post("/addProduct", addProductController);
productRouter.post("/addVendorProduct", addVendorProductController);
productRouter.delete("/deleteProduct", deleteProduct);
productRouter.put("/updateProduct", updateProduct);

export default productRouter;