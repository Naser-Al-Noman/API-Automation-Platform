const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../db/pool');
const config = require('../config');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = '7d';

function validateCredentials(email, password) {
  const errors = [];

  if (!email || typeof email !== 'string' || !email.trim()) {
    errors.push('Email is required');
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.push('Email format is invalid');
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
  } else if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  return errors;
}

function signToken(user) {
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(
    { id: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

async function register(req, res) {
  try {
    if (!config.jwtSecret) {
      return res.status(500).json({ message: 'Server auth is not configured' });
    }

    const { email, password } = req.body || {};
    const errors = validateCredentials(email, password);

    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join('. '), errors });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, created_at`,
      [normalizedEmail, passwordHash]
    );

    const user = result.rows[0];
    const token = signToken(user);

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    if (err.message === 'JWT_SECRET is not configured') {
      return res.status(500).json({ message: 'Server auth is not configured' });
    }

    console.error('register error:', err);
    return res.status(500).json({ message: 'Failed to register user' });
  }
}

async function login(req, res) {
  try {
    if (!config.jwtSecret) {
      return res.status(500).json({ message: 'Server auth is not configured' });
    }

    const { email, password } = req.body || {};
    const errors = validateCredentials(email, password);

    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join('. '), errors });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const result = await query(
      `SELECT id, email, password_hash, created_at
       FROM users
       WHERE email = $1`,
      [normalizedEmail]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    if (err.message === 'JWT_SECRET is not configured') {
      return res.status(500).json({ message: 'Server auth is not configured' });
    }

    console.error('login error:', err);
    return res.status(500).json({ message: 'Failed to log in' });
  }
}

async function getMe(req, res) {
  try {
    const result = await query(
      `SELECT id, email, created_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    return res.json({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    });
  } catch (err) {
    console.error('getMe error:', err);
    return res.status(500).json({ message: 'Failed to fetch user' });
  }
}

module.exports = {
  register,
  login,
  getMe,
};
