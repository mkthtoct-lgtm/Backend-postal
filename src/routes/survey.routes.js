const express = require('express');
const surveyController = require('../controllers/survey.controller');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// Public endpoint — nhận phản hồi khảo sát từ Zalo Mini App / form bên ngoài
router.post('/submit', surveyController.submitResponse);
router.get('/public/:id', surveyController.getPublicById);

// Authenticated endpoints
router.get('/responses', authMiddleware, surveyController.getResponses);
router.get('/:id', authMiddleware, surveyController.getById);
router.get('/', authMiddleware, surveyController.getAll);
router.post('/', authMiddleware, surveyController.create);
router.put('/:id', authMiddleware, surveyController.update);
router.delete('/:id', authMiddleware, surveyController.delete);

module.exports = router;
