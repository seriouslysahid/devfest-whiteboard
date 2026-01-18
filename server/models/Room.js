const mongoose = require('mongoose');

const PointSchema = new mongoose.Schema({
  x: Number,
  y: Number
}, { _id: false });

const OperationSchema = new mongoose.Schema({
  id: String,
  type: String,
  points: [PointSchema],
  color: String,
  lineWidth: Number,
  text: String,
  x: Number,
  y: Number,
  shapeType: String,
  pathData: String,
  fill: String,
  timestamp: Number,
  userId: String
}, { _id: false });

const RoomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  hostId: {
    type: String,
    required: true
  },
  password: {
    type: String,
    default: null
  },
  hasPassword: {
    type: Boolean,
    default: false
  },
  operations: {
    type: [OperationSchema],
    default: []
  },
  createdAt: {
    type: Number,
    default: Date.now
  }
});

// Optional: Index for faster lookup
RoomSchema.index({ roomId: 1 });

module.exports = mongoose.model('Room', RoomSchema);
