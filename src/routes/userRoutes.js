const express = require('express');
const router = express.Router();
const { createUser, getAll, getById, update, remove, assignRole, changeUserCredentials } = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.use(authenticate);
router.post('/assign-role/:id', authorize('admin'), assignRole);
router.post('/change-credentials/:id', authorize('admin', 'user'), changeUserCredentials);
router.post('/nuevo-usuario', authorize('admin'), createUser);
router.get('/', authorize('admin'), getAll);
router.get('/:id', authorize('admin'), getById);
router.put('/:id', authorize('admin'), update);
router.delete('/:id', authorize('admin'), remove);

module.exports = router;
