import type { Request, Response } from "express";

export const addVendorController = async(req: Request, res: Response) : Promise<void> => {
    const { userId, name, email, phone, address, gstNumber } = req.body;
    if(!userId || !name || !email || !phone || !address){
        res.status(400).json({ message : "All fields are required!" });
        return;
    }

    try{
        
    }
    catch(e){
        console.error("Error occurred while adding vendor: ", e);
        res.status(500).json({ message : "Error occurred while adding vendor!" });
    }

}