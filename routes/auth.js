const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const User = require('../models/User');
const Document = require('../models/Document');
const { connectDb, isDbConnected } = require('../utils/db');

const router = express.Router();

const COOKIE_NAME = 'kdocs_session';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

function signToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function publicUser(user) {
  return {
    name: user.name,
    email: user.email,
    authProvider: user.authProvider,
    uiLanguage: user.uiLanguage,
    createdAt: user.createdAt,
  };
}

function dbUnavailable(res) {
  res.status(503).json({ error: 'Accounts are temporarily unavailable. You can still use KDocs-Pro as a guest.' });
}

// Attaches req.user if a valid session cookie is present. Never blocks the
// request either way - every route stays usable by guests.
async function attachUser(req, res, next) {
  req.user = null;
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next();
  try {
    const ok = await connectDb();
    if (!ok) return next();
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (user) req.user = user;
  } catch (err) {
    // Invalid/expired token - just treat as guest, don't error out.
  }
  next();
}

router.post('/signup', async (req, res) => {
  if (!(await connectDb())) return dbUnavailable(res);
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are all required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'An account with that email already exists. Try logging in instead.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, authProvider: 'email' });
    const token = signToken(user);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).json({ error: 'Could not create your account. Please try again.' });
  }
});

router.post('/login', async (req, res) => {
  if (!(await connectDb())) return dbUnavailable(res);
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: 'Incorrect email or password.' });

    const token = signToken(user);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Could not log you in. Please try again.' });
  }
});

// Verifies the Google ID token server-side (never trusts the frontend alone),
// then finds or creates the matching account.
router.post('/google', async (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Google sign-in is not set up yet.' });
  }
  if (!(await connectDb())) return dbUnavailable(res);
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Missing Google credential.' });

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();

    let user = await User.findOne({ googleId: payload.sub });
    if (!user) {
      // Also check if an email/password account already uses this email, to avoid duplicate accounts.
      user = await User.findOne({ email: payload.email.toLowerCase() });
      if (user) {
        user.googleId = payload.sub;
        await user.save();
      } else {
        user = await User.create({
          name: payload.name || payload.email.split('@')[0],
          email: payload.email,
          googleId: payload.sub,
          authProvider: 'google',
        });
      }
    }

    const token = signToken(user);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(401).json({ error: 'Could not verify your Google sign-in. Please try again.' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, COOKIE_OPTS);
  res.json({ ok: true });
});

// Permanently delete the signed-in account: profile + every saved document
// in their locker. Required by Google Play for apps with account creation,
// and it is the user's right under Kenya's Data Protection Act, 2019.
// Gated twice: a valid session AND an explicit { confirm: "DELETE" } body
// (the CSRF token is already enforced by middleware for DELETE requests).
// Payment references are not linked to the account and simply age out of
// the payment store on their existing 90-day TTL.
router.delete('/account', attachUser, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Sign in first.' });
  if (req.body?.confirm !== 'DELETE') {
    return res.status(400).json({ error: 'Confirmation required: send { "confirm": "DELETE" }.' });
  }
  if (!(await connectDb())) return dbUnavailable(res);
  try {
    await Document.deleteMany({ userId: req.user._id });
    await User.deleteOne({ _id: req.user._id });
    res.clearCookie(COOKIE_NAME, COOKIE_OPTS);
    res.json({ ok: true });
  } catch (err) {
    console.error('Account deletion error:', err.message);
    res.status(500).json({ error: 'Could not delete your account. Please try again or email us.' });
  }
});

router.get('/me', attachUser, (req, res) => {
  res.json({ user: req.user ? publicUser(req.user) : null });
});

router.patch('/language', attachUser, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not signed in.' });
  const { uiLanguage } = req.body;
  req.user.uiLanguage = uiLanguage;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

module.exports = { router, attachUser };
