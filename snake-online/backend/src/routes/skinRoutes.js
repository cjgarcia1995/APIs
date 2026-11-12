
const express = require('express');
const router = express.Router();

const { getSkins } = require('../controllers/skinController');

router.get('/', getSkins);

module.exports = router;
