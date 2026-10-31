import bcrypt from 'bcryptjs';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { requireAuth } from '../middleware/auth';
import { User } from '../models';

export const authRouter = Router();

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: '7d' });
}

function publicUser(user: any) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt,
  };
}

// 1. REGISTER ROUTE
authRouter.post('/register', async (req, res) => {
  try {
    const { name, password, role } = req.body;
    const email = (req.body.email || '').toLowerCase().trim();

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const allowedRoles = ['citizen', 'collector', 'supervisor', 'admin'];
    const assignedRole = allowedRoles.includes(role) ? role : 'citizen';

    const passwordHash = await bcrypt.hash(password, 10);
    const user: any = await User.create({
      name: name.trim(),
      email,
      passwordHash,
      role: assignedRole,
    });

    const token = signToken(String(user._id));
    return res.status(201).json({
      token,
      user: publicUser(user),
    });
  } catch (err: any) {
    console.error('Register error:', err);
    return res.status(500).json({ message: err?.message || 'Registration failed' });
  }
});

// 2. LOGIN ROUTE
authRouter.post('/login', async (req, res) => {
  try {
    const password = req.body.password || '';
    const email = (req.body.email || '').toLowerCase().trim();

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user: any = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'No account found with this email' });
    }

    // Support both passwordHash and password field if seed data used plaintext
    const hash = user.passwordHash || user.password;
    let isMatch = false;

    if (hash) {
      if (hash.startsWith('$2')) {
        isMatch = await bcrypt.compare(password, hash);
      } else {
        isMatch = password === hash;
      }
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    const token = signToken(String(user._id));
    return res.json({
      token,
      user: publicUser(user),
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ message: err?.message || 'Login failed' });
  }
});

// 3. ME ROUTE
// 3. ME ROUTE
authRouter.get('/me', requireAuth, async (req, res) => {
  try {
    const user: any = await User.findById((req as any).userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({ user: publicUser(user) });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Server error' });
  }
});