const express = require('express');
const pageController = require('../controllers/pageController');
const { requirePageAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', pageController.renderLanding);
router.get('/generator', pageController.renderGenerator);
router.get('/login', pageController.renderLogin);
router.get('/register', pageController.renderRegister);
router.get('/history', requirePageAuth, pageController.renderHistory);

module.exports = router;
