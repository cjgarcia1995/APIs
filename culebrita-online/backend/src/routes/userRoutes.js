
const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../middleware/authMiddleware');
const { getMyProfile } = require('../controllers/userController');

// GET /api/users/me
// Esta ruta requiere autenticacion
router.get('/me', authenticateToken, getMyProfile);

module.exports = router;
