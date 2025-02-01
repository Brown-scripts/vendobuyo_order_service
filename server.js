const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const orderRoutes = require('./routes/order');
const { errorHandler } = require('./middleware/errorHandler');
const cors = require('cors');


dotenv.config();

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3003;

app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.get('/test', (req, res) => {
  res.status(200).json({ message: 'Hello from Vendobuyo API!' });
});

// Routes
app.use('', orderRoutes);

// Error handling middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Order service running on port ${PORT}`);
});

