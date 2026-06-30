const express = require('express');
const checklistController = require('../controllers/checklist.controller');
const authMiddleware = require('../middlewares/auth');
const checkPermission = require('../middlewares/checkPermission');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Checklist Management
 *   description: Các API quản lý checklist công việc nội bộ của các phòng ban
 */

router.get('/', authMiddleware, checklistController.getChecklists);
router.get('/:id', authMiddleware, checklistController.getChecklistDetail);

router.post('/', authMiddleware, checkPermission('settings:manage'), checklistController.createChecklist);
router.patch('/:id', authMiddleware, checklistController.updateChecklist);
router.delete('/:id', authMiddleware, checkPermission('settings:manage'), checklistController.deleteChecklist);

module.exports = router;
