const express = require('express');
const { createOrder, getOrders, updateOrderStatus } = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, createOrder);
router.get('/', authenticate, getOrders);
router.put('/:id/status', authenticate, updateOrderStatus);

module.exports = router;

