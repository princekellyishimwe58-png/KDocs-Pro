const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String }, // absent for Google-only accounts
  googleId: { type: String },
  authProvider: { type: String, enum: ['email', 'google'], required: true },
  uiLanguage: { type: String, default: 'en' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
