import { Router } from "express";
import { addClientBasicDetailsController, updateClientBasicDetailsController, addClientAddressController, updateClientAddressController } from "../Controllers/Client.controller";
import { authMiddleware } from "../Middleware/AuthMiddleware";


const clientRouter = Router();

clientRouter.use(authMiddleware);

clientRouter.post("/addClientBasicDetails", addClientBasicDetailsController);
clientRouter.patch("/updateClientBasicDetails", updateClientBasicDetailsController);
clientRouter.post("/addClientAddress", addClientAddressController);
clientRouter.patch("/updateClientAddress", updateClientAddressController);

export default clientRouter;