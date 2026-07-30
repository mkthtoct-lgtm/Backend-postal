const express = require('express');
const schoolController = require('../controllers/school.controller');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// ──── Filter options (public, authenticated) ────────────────────────────────
router.get('/countries', authMiddleware, schoolController.getCountries);
router.get('/programs', authMiddleware, schoolController.getPrograms);
router.get('/regions', authMiddleware, schoolController.getRegions);
router.get('/systems', authMiddleware, schoolController.getSystems);

// ──── Sources management (Admin) ────────────────────────────────────────────
router.get('/sources', authMiddleware, schoolController.getSources);
router.post('/sources', authMiddleware, schoolController.createSource);
router.put('/sources/:id', authMiddleware, schoolController.updateSource);
router.delete('/sources/:id', authMiddleware, schoolController.deleteSource);
router.post('/sources/:id/sync', authMiddleware, schoolController.syncSource);

// ──── Tabs (backward compatible) ────────────────────────────────────────────
router.get('/tabs', authMiddleware, schoolController.getSpreadsheetTabs);

// ──── Schools CRUD ──────────────────────────────────────────────────────────
router.get('/', authMiddleware, schoolController.getAllSchools);
router.post('/', authMiddleware, schoolController.createSchool);
router.put('/:id', authMiddleware, schoolController.updateSchool);
router.delete('/:id', authMiddleware, schoolController.deleteSchool);

module.exports = router;
