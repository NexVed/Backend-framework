/**
 * Server Entry Point
 */

require('dotenv').config();

const { startServer } = require('./core/server');

startServer();
