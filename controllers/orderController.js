const Order = require('../models/Order');
const { orderQueue } = require('../config/bull');
const User = require('../models/User');
const { sendEmail } = require('../utils/emailSender');

exports.createOrder = async (req, res) => {
  try {
    // Retrieve user's email from req.user (authentication must be done prior)
    const userId = req.user.userId; // Assuming userId is saved in the token

    if (!userId) {
      return res.status(400).json({ message: 'User not authenticated' });
    }

    const { products, totalPrice } = req.body;
    // Create order with user's email and details
    const order = new Order({
      userId,
      products,
      totalPrice,
    });
    await order.save();

    // Fetch the user's details (in case you need more info, like their name)
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Send email before responding
    const subject = 'Order Confirmation';
    const body = `<p>Hi, </p><p>Your order has been placed successfully. Order ID: ${order._id}</p>`;
    await sendEmail(user.email, subject, body);

    // Respond with the created order
    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Error creating order' });
  }
};


exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.userId });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders' });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(id, { status }, { new: true });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error updating order status' });
  }
};

