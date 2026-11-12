
const express = require('express');
const router = express.Router();

const { register, login } = require('../controllers/authController');

const { rateLimit } = require('express-rate-limit');

// Limitar intentos de autenticacion
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Demasiados intentos. Intenta nuevamente mas tarde.'
    }
});

// POST /api/auth/register
router.post('/register', authLimiter, register);

// POST /api/auth/login
router.post('/login', authLimiter, login);

module.exports = router;
