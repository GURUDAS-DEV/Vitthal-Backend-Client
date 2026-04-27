import { Router } from "express";
import { authMiddleware } from "../Middleware/AuthMiddleware";
import {
    addCartItemController,
    getCartDataController,
    updateCartItemController,
    removeCartItemController,
    clearCartController
} from "../Controllers/Cart.Controller";

const CartRouter = Router();

CartRouter.get("/", authMiddleware, getCartDataController);
CartRouter.post("/", authMiddleware, addCartItemController);
CartRouter.patch("/item", authMiddleware, updateCartItemController);
CartRouter.delete("/item", authMiddleware, removeCartItemController);
CartRouter.delete("/", authMiddleware, clearCartController);

export default CartRouter;