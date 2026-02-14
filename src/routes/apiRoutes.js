const express = require('express');
const apiController = require('../controllers/apiController');
const { requireApiAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/generate', apiController.generate);
router.post('/preview', apiController.preview);
router.post('/save', requireApiAuth, apiController.save);
router.post('/favorite/:id', requireApiAuth, apiController.favorite);
router.get('/templates', apiController.templates);
router.get('/history', requireApiAuth, apiController.history);

module.exports = router;
