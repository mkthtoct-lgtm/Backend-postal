const express = require('express');
const router = express.Router();
const courseLeadController = require('../controllers/courseLead.controller');

// Định tuyến API cho Course Leads
router.post('/', courseLeadController.createLead);
router.get('/', courseLeadController.getLeads);
router.patch('/:id/status', courseLeadController.updateLeadStatus);

module.exports = router;
