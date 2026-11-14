const express = require('express');
const protect = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const {getFarmerReport,getDeliveryReport} = require('../controllers/roleReportController');
const router = express.Router();
router.use(protect);
router.get('/farmer',authorizeRoles('farmer'),getFarmerReport);
router.get('/delivery',authorizeRoles('deliveryAgent'),getDeliveryReport);
module.exports = router;
