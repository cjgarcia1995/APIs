
const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

const {
    getUsers,
    banUser,
    unbanUser
} = require('../controllers/adminController');

// Todas estas rutas requieren autenticación y rol de administrador
router.use(authenticateToken, requireAdmin);

// Consultar usuarios
router.get('/users', getUsers);

// Bloquear usuario
router.post('/ban/:id', banUser);

// Desbloquear usuario
router.post('/unban/:id', unbanUser);

module.exports = router;
