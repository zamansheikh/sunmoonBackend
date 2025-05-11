// src/presentation/routes/auth.routes.ts
import { Router } from 'express';
import passport from '../../infrastructure/auth/passport';

const router = Router();

router.get('/sign-up', (req, res) => {
  res.send("<a href='/auth/google'>Login with Google</a>");
});


router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/auth/sign-up' }), (req, res) => {
  res.redirect('/auth/profile');
});

router.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/auth/sign-up');
  });
});

router.get('/profile', (req, res) => {
  if (req.user) {
    res.send(`Welcome ${req.user.displayName}`);
  } else {
    res.redirect('/auth/sign-up');
  }
});

export default router;
