import { Router } from "express";
import { getOrdersController, getVendorOrdersController, getVendorOrderByIdController } from "../Controllers/Order.Controller";
import { authMiddleware } from "../Middleware/AuthMiddleware";

const orderRouter = Router();

orderRouter.use(authMiddleware);

orderRouter.get("/", getOrdersController);
orderRouter.get("/vendor", getVendorOrdersController);
orderRouter.get("/vendor/:id", getVendorOrderByIdController);

export default orderRouter;
