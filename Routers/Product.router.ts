import { Router } from "express";
import { addProductController, deleteProduct, getAllProducts, getProductById, getProductsByCategory, updateProduct } from "../Controllers/Product.controller";
import { authMiddleware } from "../Middleware/AuthMiddleware";


const productRouter = Router();

productRouter.use(authMiddleware);

productRouter.post("/addProduct", addProductController);
productRouter.delete("/deleteProduct", deleteProduct);
productRouter.put("/updateProduct", updateProduct);

productRouter.get("/getAllProducts", getAllProducts);
productRouter.get("/getProductById/:productId", getProductById);
productRouter.get("/getProductsByCategory/:category", getProductsByCategory);

productRouter.get("/getProductByName");

export default productRouter;
