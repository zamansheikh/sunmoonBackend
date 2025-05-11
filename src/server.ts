// src/server.ts
import express, { Application } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import session from 'express-session';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Initialize dotenv for environment variables
dotenv.config();

// Create the Express application
const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS
app.use(morgan('dev')); // Logging middleware
app.use(express.json()); // Parse JSON request bodies

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false, // Don’t save the session to the store if it wasn’t modified during the request.
    saveUninitialized: true, // Save a new session even if it hasn't been modified.
  })
);



// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
