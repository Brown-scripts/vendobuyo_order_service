const express = require('express');
const { createOrder, getOrders, updateOrderStatus, updateOrderProductStatus, getSellerOrders, getOrdersBySeller } = require('../controllers/orderController');
const { authenticate, authenticateAdmin, authenticateSellerOrAdmin, authenticateSeller } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, createOrder);
router.get('/seller-orders', authenticateSeller, getSellerOrders);
router.get('/seller-orders/:sellerId', authenticate, getOrdersBySeller);
router.get('/', authenticate, getOrders);
router.get('/:sellerId', authenticate, getOrders);
router.put('/:id/status', authenticate, updateOrderStatus);
router.put('/:orderId/product-status', authenticateSellerOrAdmin, updateOrderProductStatus);

module.exports = router;
