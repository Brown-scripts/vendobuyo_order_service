const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { sendEmail } = require('../utils/emailSender');
const amqp = require("amqplib/callback_api");

const sendToQueue = (queue, message) => {
  const rabbitmqURL = process.env.RABBITMQ_URL;
  amqp.connect(rabbitmqURL, (error0, connection) => {
    if (error0) {
      console.error("RabbitMQ connection error:", error0);
      return;
    }
    connection.createChannel((error1, channel) => {
      if (error1) {
        console.error("RabbitMQ channel error:", error1);
        return;
      }

      channel.assertQueue(queue, { durable: true });
      channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
      console.log("Sent message to queue:", message);
    });

    setTimeout(() => connection.close(), 500);
  });
};

// CREATE ORDER (without extra User model query)
exports.createOrder = async (req, res) => {
  try {
    const userId = req.user.userId; // Assuming userId is in the token

    if (!userId) {
      return res.status(400).json({ message: 'User not authenticated' });
    }

    const { sellerIds, products, totalPrice } = req.body;

    console.log(1)
    // Create and save the order
    const order = await new Order({ userId, sellerIds, products, totalPrice }).save();
    console.log(2)

    // Populate user details from Order itself (no extra User query)
    const populatedOrder = await Order.findById(order._id)
      .populate({ path: "userId", select: "email phone _id" }); // Get only email and phone
    console.log(3)

    if (!populatedOrder.userId) {
      console.log(4)
      return res.status(404).json({ message: 'User not found' });
    }
    console.log(5)

    // Prepare notification message
    const message = {
      orderId: populatedOrder._id,
      status: populatedOrder.status,
      userId: populatedOrder.userId._id,
      products: populatedOrder.products,
      totalPrice: populatedOrder.totalPrice,
      targetEmail: populatedOrder.userId.email,
      targetPhone: populatedOrder.userId.phone,
    };
    console.log(6)

    sendToQueue("order_status_queue", message);
    console.log(7)

    // Send email notification
    const subject = 'Order Confirmation';
    const body = `<p>Hi, </p><p>Your order has been placed successfully. Order ID: ${populatedOrder._id}</p>`;
    await sendEmail(populatedOrder.userId.email, subject, body);
    console.log(8)

    res.status(201).json(populatedOrder);
    console.log(9)
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Error creating order' });
  }
};

// GET ORDERS
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.userId })
      .populate({ path: "userId", select: "email phone -_id" }); // Include user email & phone

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
};

// UPDATE ORDER STATUS
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(id, { status }, { new: true })
      .populate({ path: "userId", select: "email phone -_id" });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const message = {
      orderId: order._id,
      status: order.status,
      userId: order.userId._id,
      products: order.products,
      totalPrice: order.totalPrice,
      targetEmail: order.userId.email,
      targetPhone: order.userId.phone,
    };

    sendToQueue("order_status_queue", message);
    res.json(order);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Error updating order status' });
  }
};

exports.getOrdersBySeller = async (req, res) => {
  try {
    // Seller's ID from request params
    const sellerId = req.params.sellerId;

    const orders = await Order.find({ sellerIds: sellerId })
      .populate({
        path: "products.productId",
        select: "title description stockQuantity price sellerId imageUrl shopId", // Only necessary fields
      })
      .populate("userId", "name email phone"); // Optional: Fetch user details

    console.log(orders)
    console.log(sellerId)
    // Filter each order to only include the seller's products
    const filteredOrders = orders.map(order => {
      const sellerProducts = order.products.filter(product =>
        product.productId.sellerId.toString() === sellerId
      );

      return {
        orderId: order._id,
        buyer: order.userId, // Basic user details
        products: sellerProducts, // Only products associated with this seller
        status: order.status,
        createdAt: order.createdAt,
      };
    });

    res.status(200).json({ orders: filteredOrders });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch seller orders", error: err.message });
  }
};

// Get all orders involving a particular seller
exports.getSellerOrders = async (req, res) => {
  try {
    const sellerId = req.user.userId; // Seller's ID from request params

    const orders = await Order.find({ sellerIds: sellerId })
      .populate({
        path: "products.productId",
        select: "title description stockQuantity price sellerId imageUrl shopId", // Only necessary fields
      })
      .populate("userId", "name email phone"); // Optional: Fetch user details

    console.log(orders)
    console.log(sellerId)
    // Filter each order to only include the seller's products
    const filteredOrders = orders.map(order => {
      const sellerProducts = order.products.filter(product =>
        product.productId.sellerId.toString() === sellerId
      );

      return {
        orderId: order._id,
        buyer: order.userId, // Basic user details
        products: sellerProducts, // Only products associated with this seller
        status: order.status,
        createdAt: order.createdAt,
      };
    });

    res.status(200).json({ orders: filteredOrders });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch seller orders", error: err.message });
  }
};

// ✅ Update the status of a seller's product in an order
exports.updateOrderProductStatus = async (req, res) => {
  try {
    const { orderId } = req.params; // Order ID from params
    const { productId, status } = req.body; // Product ID & new status
    const { sellerId } = req.user.userId; // Seller's ID (assuming authentication)

    // Find the order and ensure it contains the seller's product
    const order = await Order.findOne({ _id: orderId, sellerIds: sellerId }).populate("products.productId");

    if (!order) {
      return res.status(404).json({ message: "Order not found or unauthorized" });
    }

    // Find the specific product in the order
    const productIndex = order.products.findIndex(
      product => product.productId._id.toString() === productId && product.productId.sellerId.toString() === sellerId
    );

    if (productIndex === -1) {
      return res.status(403).json({ message: "You cannot update this product" });
    }

    // Update the product's status
    order.products[productIndex].status = status;
    await order.save();

    res.status(200).json({ message: "Product status updated successfully", order });
  } catch (err) {
    res.status(500).json({ message: "Failed to update product status", error: err.message });
  }
};
