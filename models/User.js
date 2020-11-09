const mongoose = require('mongoose');

var UserSchema = new mongoose.Schema({
  name: {
    type: String
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: Number
  },
  mobile: {
    type: Number,
    required: true
  },
  zipCode: {
    type: String,
    required: true
  },
  profile: {
    type: String
  },
  location: {
    type: { type: String },
    coordinates: []
  },
});

UserSchema.index({ location: "2dsphere" });
const User = mongoose.model('User', UserSchema);

module.exports = User;