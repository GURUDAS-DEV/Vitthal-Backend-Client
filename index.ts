import cookieParser from 'cookie-parser';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import pool from './DbConnect';
import productRouter from './Routers/Product.router';
import clientRouter from './Routers/ClientRouter';
import checkoutRouter from './Routers/Checkout.Router';
import authRouter from './Routers/Auth.router';
import vendorsRouter from './Routers/Vendors.Router';
import cartRouter from './Routers/Cart.router';
import orderRouter from './Routers/Order.router';

dotenv.config();

// Create an Express application
const app = express();
const PORT = 9000;


//cors configuration
const allowedOrigins = ['http://localhost:3000', 'http://localhost:4000', "http://192.168.29.150:4000","https://vitthal-frontend.vercel.app", "https://vitthal-vendor-frontend.vercel.app"];

app.use("/", cors({
    origin: allowedOrigins,
    credentials: true,
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
app.use("/api/auth", authRouter);
app.use("/api/products", productRouter);
app.use("/api/vendors", vendorsRouter);
app.use("/api/client", clientRouter);
app.use("/api/cart", cartRouter);
app.use("/api/checkout", checkoutRouter);
app.use("/api/orders", orderRouter);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}🚀🚀`);
})