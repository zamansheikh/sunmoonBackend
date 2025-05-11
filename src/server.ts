// src/server.ts
import express from 'express';
import dotenv from 'dotenv';
import { loadMiddlewares } from './presentation/middlewares';
import routes from './presentation/routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

loadMiddlewares(app);

app.use(routes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
