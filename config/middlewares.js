// ===================================================================
// FILE: config/middlewares.js
// ===================================================================
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');

const configureMiddlewares = (app) => {
  // Body parsing
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'change_this_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  }));

  // Static files and uploads
  app.use(express.static(path.join(__dirname, '../public')));
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  // Flash messages
  app.use(flash());

  // Passport initialization
  app.use(passport.initialize());
  app.use(passport.session());

  // View engine setup
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '../views'));
  app.use(expressLayouts);
  app.set('layout', 'layout');

  // Expose user + flash messages to all templates
  app.use((req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.messages = {
      error: req.flash('error') || [],
      success: req.flash('success') || [],
    };
    next();
  });
};

module.exports = { configureMiddlewares };
