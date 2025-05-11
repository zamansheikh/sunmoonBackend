import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Create the Express application
const app: Application = express();
const PORT = process.env.PORT || 3000;

// Load environment variables
dotenv.config();

// Middleware
app.use(cors());
app.use(morgan('dev'));

// Middleware
app.use(express.json());

// Routes (Presentation Layer)
app.use('/api', (req: Request, res: Response) => {
  res.send('API is working');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});