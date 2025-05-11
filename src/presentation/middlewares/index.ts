// src/presentation/middleware/index.ts
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import session from 'express-session';
import passport from '../../infrastructure/auth/passport';

export const loadMiddlewares = (app: express.Application) => {
  app.use(cors());
  app.use(morgan('dev'));
  app.use(express.json());

  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'default_secret',
      resave: false,
      saveUninitialized: true,
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());
};
