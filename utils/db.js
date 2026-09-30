const mongoose = require('mongoose');

let connected = false;
let connecting = null;
let lastError = null;

// Connects lazily and only once. If MONGODB_URI isn't set yet (e.g. the
// person hasn't finished setting up their database), this fails quietly -
// account features return a friendly error, but the rest of the app
// (catalog, templates, preview, Ready Score, payments, downloads) keeps
// working exactly as before, since none of that depends on a database.
async function connectDb() {
  if (connected) return true;
  if (!process.env.MONGODB_URI) return false;
  if (!connecting) {
    connecting = mongoose
      .connect(process.env.MONGODB_URI)
      .then(() => {
        connected = true;
        lastError = null;
        console.log('Connected to MongoDB');
        return true;
      })
      .catch((err) => {
        console.error('MongoDB connection failed:', err.message);
        lastError = err.message;
        connecting = null;
        return false;
      });
  }
  return connecting;
}

function isDbConnected() {
  return connected;
}

// Last connection failure, for /api/health. Cleared on a successful connect.
function lastDbError() {
  return lastError;
}

module.exports = { connectDb, isDbConnected, lastDbError };
