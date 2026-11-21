const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const env = require('./config/env');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.CORS_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin not allowed by CORS'));
  },
}));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cookieParser());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => req.originalUrl.startsWith('/api/v1/payments/webhook'),
}));

// Keep the Paystack webhook body raw so its signature can be verified later.
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

app.get('/health', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return res.status(200).json({
    success: true,
    message: 'Service is healthy',
    data: {
      status: 'ok',
      database: states[mongoose.connection.readyState] || 'unknown',
    },
  });
});

const moduleRoutes = {
  auth: require('./modules/auth/routes'),
  users: require('./modules/users/routes'),
  hotels: require('./modules/hotels/routes'),
  rooms: require('./modules/rooms/routes'),
  bookings: require('./modules/bookings/routes'),
  payments: require('./modules/payments/routes'),
  checkins: require('./modules/checkins/routes'),
  roomkeys: require('./modules/roomkeys/routes'),
  servicerequests: require('./modules/servicerequests/routes'),
  auditlogs: require('./modules/auditlogs/routes'),
};

Object.entries(moduleRoutes).forEach(([name, router]) => {
  app.use(`/api/v1/${name}`, router);
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;

