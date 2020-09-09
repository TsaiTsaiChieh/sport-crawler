const express = require('express');
const router = express.Router();
/* ------------ 盤口 ------------ */
router.get('/hwHandicap', require('../controller/handicap/hwHandicapController'));

