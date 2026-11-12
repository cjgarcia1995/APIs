
const express = require('express');
const router = express.Router();

const {
    getLeaderboard
} = require('../controllers/gameController');

// Consultar clasificacion
router.get('/leaderboard', getLeaderboard);

module.exports = router;
