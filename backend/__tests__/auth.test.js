import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../server.js'; // Import the full app
import User from '../models/userModel.js';
import Admin from '../models/adminModel.js';
import jwt from 'jsonwebtoken';

describe('Auth API', () => {
  const validPassword = 'Password123';

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: validPassword,
          mobile: '1234567890',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.username).toBe('testuser');

      // Verify user is in the database
      const user = await User.findOne({ email: 'test@example.com' });
      expect(user).not.toBeNull();
    });

    it('should return 400 if email already exists', async () => {
      // First, create a user
      await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: validPassword,
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'anotheruser',
          email: 'test@example.com',
          password: validPassword,
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe('User with this email already exists');
    });

    it('should return 400 for invalid data (e.g., missing password)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('password: Required');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a user to login with
      const user = new User({
        username: 'loginuser',
        email: 'login@example.com',
        password: validPassword,
      });
      await user.save();
    });

    it('should login a user with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: validPassword,
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.email).toBe('login@example.com');
    });

    it('should return 401 for incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword',
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toBe('Invalid email or password');
    });
  });

  describe('Auth Middleware', () => {
    it('should return 401 for a protected route if no token is provided', async () => {
      const res = await request(app).get('/api/auth/profile');
      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toBe('Not authorized, please log in');
    });

    it('should allow access to a protected route with a valid token', async () => {
        // Create user and token
        const user = await User.create({
            username: 'protecteduser',
            email: 'protected@example.com',
            password: validPassword,
        });
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

        const res = await request(app)
            .get('/api/auth/profile')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.email).toBe('protected@example.com');
    });

    it('should return 401 for a protected route with an invalid token', async () => {
        const res = await request(app)
            .get('/api/auth/profile')
            .set('Authorization', 'Bearer invalidtoken');

        expect(res.statusCode).toEqual(401);
        expect(res.body.message).toBe('Invalid token, please log in again');
    });
  });

  describe('Admin Middleware', () => {
    it('should return 401 for admin route if no token is provided', async () => {
        const res = await request(app).get('/api/admin/dashboard');
        expect(res.statusCode).toEqual(401);
        expect(res.body.message).toBe('Not authorized, no token');
    });

    it('should return 401 for admin route if a regular user token is provided', async () => {
        const user = await User.create({
            username: 'notadmin',
            email: 'notadmin@example.com',
            password: validPassword,
        });
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

        const res = await request(app)
            .get('/api/admin/dashboard')
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.statusCode).toEqual(401);
        expect(res.body.message).toBe('Not authorized, token failed');
    });

    it('should allow access to admin route with a valid admin token', async () => {
        const admin = await Admin.create({
            username: 'adminuser',
            email: 'admin@example.com',
            password: validPassword,
        });
        const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET);

        const res = await request(app)
            .get('/api/admin/dashboard')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.email).toBe('admin@example.com');
        expect(res.body.role).toBe('admin');
    });
  });
});