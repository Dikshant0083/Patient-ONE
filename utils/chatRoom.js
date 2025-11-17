// utils/chatRoom.js
function generateRoomId(user1, user2) {
  
  return [user1.toString(), user2.toString()].sort().join('_');
}
module.exports = { generateRoomId };
