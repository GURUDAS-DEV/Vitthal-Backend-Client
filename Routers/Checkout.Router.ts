import { Router } from "express";
import { placeOrderController } from "../Controllers/Checkout.controller";
import { authMiddleware } from "../Middleware/AuthMiddleware";

const checkoutRouter = Router();

checkoutRouter.use(authMiddleware);

checkoutRouter.post("/placeOrder", placeOrderController);

export default checkoutRouter;