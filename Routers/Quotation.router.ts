import { Router } from "express";
import {
    requestQuote,
    getMyQuotesClient,
    getMyQuotesVendor,
    respondToQuote,
    acceptQuote,
    rejectQuote,
    getAllQuotesAdmin,
} from "../Controllers/Quotation.controller";
import { authMiddleware } from "../Middleware/AuthMiddleware";

const quotationRouter = Router();

// All quotation routes require authentication
quotationRouter.use(authMiddleware);

//  Client Routes 
quotationRouter.post("/request",                requestQuote);      
quotationRouter.get("/my-quotes",               getMyQuotesClient);  
quotationRouter.post("/:quoteId/accept",        acceptQuote);        
quotationRouter.patch("/:quoteId/reject",       rejectQuote);        

//  Vendor Routes 
quotationRouter.get("/incoming",                getMyQuotesVendor);  
quotationRouter.patch("/:quoteId/respond",      respondToQuote);     

//  Admin Routes 
quotationRouter.get("/all",                     getAllQuotesAdmin);   

export default quotationRouter;
