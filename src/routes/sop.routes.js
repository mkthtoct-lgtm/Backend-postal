const express = require('express');
const sopController = require('../controllers/sop.controller');
const authMiddleware = require('../middlewares/auth');
const checkPermission = require('../middlewares/checkPermission');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: SOP Management
 *   description: Các API quản lý quy trình hoạt động chuẩn (Standard Operating Procedures)
 */

router.get('/', authMiddleware, sopController.getSops);
router.get('/:id', authMiddleware, sopController.getSopDetail);

router.post('/', authMiddleware, checkPermission('settings:manage'), sopController.createSop);
router.patch('/:id', authMiddleware, checkPermission('settings:manage'), sopController.updateSop);
router.delete('/:id', authMiddleware, checkPermission('settings:manage'), sopController.deleteSop);

module.exports = router;
