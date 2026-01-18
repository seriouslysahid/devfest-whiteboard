const Room = require('../models/Room');

async function loadRooms() {
  try {
    console.log('[PERSISTENCE] Loading rooms from MongoDB...');
    const roomsDoc = await Room.find({});
    const roomsMap = new Map();
    
    for (const room of roomsDoc) {
      roomsMap.set(room.roomId, {
        roomId: room.roomId,
        hostId: room.hostId,
        password: room.password,
        hasPassword: room.hasPassword,
        operations: room.operations || [],
        createdAt: room.createdAt,
        users: new Map() // Reset users on load
      });
    }
    return roomsMap;
  } catch (error) {
    console.error('[PERSISTENCE] Error loading rooms:', error);
    return new Map();
  }
}

async function saveRoom(roomId, roomData) {
  try {
    const update = {
      roomId: roomData.roomId,
      hostId: roomData.hostId,
      password: roomData.password,
      hasPassword: roomData.hasPassword,
      operations: roomData.operations,
      createdAt: roomData.createdAt
    };

    await Room.findOneAndUpdate(
      { roomId },
      update,
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error(`[PERSISTENCE] Error saving room ${roomId}:`, error);
  }
}

async function deleteRoom(roomId) {
  try {
    await Room.findOneAndDelete({ roomId });
  } catch (error) {
    console.error(`[PERSISTENCE] Error deleting room ${roomId}:`, error);
  }
}

async function getRoom(roomId) {
  try {
    const room = await Room.findOne({ roomId });
    if (!room) return null;
    
    return {
      ...room.toObject(),
      users: new Map()
    };
  } catch (error) {
    console.error(`[PERSISTENCE] Error getting room ${roomId}:`, error);
    return null;
  }
}

module.exports = {
  loadRooms,
  saveRoom,
  deleteRoom,
  getRoom
};
