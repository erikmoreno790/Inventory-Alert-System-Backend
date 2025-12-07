const express = require('express');
const router = express.Router();
const { register, login, validateToken } = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { validateLogin, validateRegister } = require('../middleware/validators');

// El rate limiter se inyectará desde server.js
const getAuthLimiter = (req) => req.app.get('authLimiter');

// Rutas con rate limiting estricto
router.post('/register', (req, res, next) => {
    const limiter = getAuthLimiter(req);
    limiter(req, res, next);
}, validateRegister, register);

router.post('/login', (req, res, next) => {
    const limiter = getAuthLimiter(req);
    limiter(req, res, next);
}, validateLogin, login);

router.get('/validate', authenticate, validateToken);

module.exports = router;
