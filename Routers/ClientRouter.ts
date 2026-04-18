import { Router } from "express";
import { updateClientAddressController, addClientDetailsController, updateClientNumberController, clientDetails } from "../Controllers/Client.controller";
import { authMiddleware } from "../Middleware/AuthMiddleware";


const clientRouter = Router();

clientRouter.use(authMiddleware);

clientRouter.post("/addClientDetails", addClientDetailsController);
clientRouter.patch("/updateClientAddress", updateClientAddressController);
clientRouter.patch("/updateClientNumber", updateClientNumberController);
clientRouter.get("/clientDetails", clientDetails);

export default clientRouter;