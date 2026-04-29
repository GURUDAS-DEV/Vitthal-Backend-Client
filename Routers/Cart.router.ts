import { Router } from "express";
import { authMiddleware } from "../Middleware/AuthMiddleware";
import {
    addCartItemController,
    getCartDataController,
    updateCartItemController,
    removeCartItemController,
    clearCartController
} from "../Controllers/Cart.Controller";

const cartRouter = Router();

cartRouter.get("/", authMiddleware, getCartDataController);
cartRouter.post("/", authMiddleware, addCartItemController);
cartRouter.patch("/item", authMiddleware, updateCartItemController);
cartRouter.delete("/item", authMiddleware, removeCartItemController);
cartRouter.delete("/", authMiddleware, clearCartController);

export default cartRouter;