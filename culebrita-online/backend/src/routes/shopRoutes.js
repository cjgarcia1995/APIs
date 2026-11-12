
const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../middleware/authMiddleware');

const {
    buySkin,
    equipSkin
} = require('../controllers/shopController');

// Comprar una apariencia
router.post('/buy', authenticateToken, buySkin);

// Equipar una apariencia
router.post('/equip', authenticateToken, equipSkin);

module.exports = router;