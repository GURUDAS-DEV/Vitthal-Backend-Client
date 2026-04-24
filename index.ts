import cookieParser from 'cookie-parser';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import pool from './DbConnect';
import AuthRouter from './Routers/Auth.router';
import productRouter from './Routers/Product.router';
import VendorsRouter from './Routers/Vendors.Router';
import clientRouter from './Routers/ClientRouter';
import adminRouter from './Routers/Admin.router';
import quotationRouter from './Routers/Quotation.router';

dotenv.config();

const app = express();
const PORT = 9000;


//cors configuration
const allowedOrigins = ['https://vitthal-frontend.vercel.app', 'http://localhost:5173', 'http://localhost:3000'];

app.use("/", cors({
    origin: allowedOrigins,
    credentials: true,
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

pool.on('error', (err) => {
    console.error('Idle pool client error (Neon dropped connection):', err.message);
});

pool.query('SELECT 1')
    .then(() => console.log('Connected to the database successfully!'))
    .catch((err) => {
        console.error('Database connection error:', err.stack);
        process.exit(1);
    });

app.use("/api/auth",       AuthRouter);
app.use("/api/products",   productRouter);
app.use("/api/vendors",    VendorsRouter);
app.use("/api/client",     clientRouter);
app.use("/api/admin",      adminRouter);
app.use("/api/quotations", quotationRouter);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}🚀🚀`);
})