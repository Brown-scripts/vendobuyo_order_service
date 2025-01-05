const Queue = require('bull');
const axios = require('axios');

const orderQueue = new Queue('orderQueue', process.env.REDIS_URL);

exports.setupBullQueue = () => {
  orderQueue.process('processOrder', async (job) => {
    const { orderId } = job.data;
    // Process the order (e.g., update inventory, notify seller)
    console.log(`Processing order: ${orderId}`);

    // Notify the user about the order
    try {
      await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/api/notifications`, {
        type: 'email',
        recipient: 'ofapatrick04@gmail.com', // Replace with actual user email
        data: {
          subject: 'Order Confirmation',
          body: `Your order ${orderId} has been received and is being processed.`,
        },
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  });
};

exports.orderQueue = orderQueue;

