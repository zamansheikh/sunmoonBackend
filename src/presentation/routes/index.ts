// src/presentation/routes/index.ts
import { Router } from 'express';
import authRoutes from './auth.routes';

const router = Router();

router.use('/auth', authRoutes);




router.get('/api', (req, res) => {
  res.send('API is working');
});

export default router;
