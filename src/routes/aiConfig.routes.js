const express = require('express');
const aiConfigController = require('../controllers/aiConfig.controller');
const authMiddleware = require('../middlewares/auth');
const checkPermission = require('../middlewares/checkPermission');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: AI Configuration Hub
 *   description: Các API quản lý và huấn luyện tri thức trợ lý AI (Gemini AI Config)
 */

router.get('/config', authMiddleware, aiConfigController.getAIConfig);
router.patch('/config', authMiddleware, checkPermission('settings:manage'), aiConfigController.updateAIConfig);
router.get('/document-groups', authMiddleware, aiConfigController.getDocumentGroups);

router.get('/questions/pending', authMiddleware, aiConfigController.getPendingQuestions);
router.patch('/questions/:id/resolve', authMiddleware, aiConfigController.resolveQuestion);
router.patch('/questions/:id/reviewing', authMiddleware, aiConfigController.markQuestionReviewing);

router.get('/history', authMiddleware, aiConfigController.getHistory);

module.exports = router;
