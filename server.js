const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const orderRoutes = require('./routes/order');
const { errorHandler } = require('./middleware/errorHandler');
const { setupBullQueue } = require('./config/bull');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Setup Bull queue
setupBullQueue();

// Routes
app.use('', orderRoutes);

// Error handling middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Order service running on port ${PORT}`);
});
