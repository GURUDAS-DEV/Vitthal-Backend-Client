import cookieParser from 'cookie-parser';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import pool from './DbConnect';
import AuthRouter from './Routers/Auth.router';
import productRouter from './Routers/Product.router';
import VendorsRouter from './Routers/Vendors.Router';

dotenv.config();

// Create an Express application
const app = express();
const PORT = 9000;


//cors configuration
const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173',];

app.use("/", cors({
    origin : allowedOrigins,
    credentials : true,
}));

//using Middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//database connection
pool.connect()
    .then(() => console.log('Connected to the database successfully!'))
    .catch((err) => console.error('Database connection error:', err.stack));

// Define routes
app.use("/api/auth", AuthRouter);
app.use("/api/products", productRouter);
app.use("/api/vendors", VendorsRouter);


// Start the server
app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}🚀🚀`);
})