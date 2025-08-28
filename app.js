
// ===================================================================
// FILE: app.js (UPDATED MAIN FILE)
// ===================================================================
require('dotenv').config();
const express = require('express');
const path = require('path');

// Import configuration and setup modules
const { connectDatabase } = require('./config/database');
const { configureMiddlewares } = require('./config/middlewares');
const { configurePassport } = require('./config/passport');

// Import route modules
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const patientRoutes = require('./routes/patient');
const doctorRoutes = require('./routes/doctor');
const recordRoutes = require('./routes/records');

// Import utilities
const { errorHandler } = require('./utils/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(express.static(path.join(__dirname, 'public')));
// Database connection
connectDatabase();

// Configure middlewares (session, passport, flash, etc.)
configureMiddlewares(app);

// Configure Passport strategies
configurePassport();

// Home route
app.get('/', (req, res) => {
  res.render('index', { title: 'Welcome' });
});

// Mount route modules
app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);
app.use('/patient', patientRoutes);
app.use('/doctor', doctorRoutes);
app.use('/records', recordRoutes);

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});