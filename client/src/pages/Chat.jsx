import { useEffect, useState } from 'react';
import useAuthStore from '../store/authStore';
import socket from '../services/socket';
import api from '../services/api';

function Chat() {
  const { user, logout } = useAuthStore();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typing, setTyping] = useState(null);

  // Connect socket and fetch conversations
  useEffect(() => {
    if (user) {
      socket.connect();
      socket.emit('user:online', user._id);
      fetchConversations();
    }

    socket.on('users:online', (users) => setOnlineUsers(users));
    socket.on('message:receive', (message) => {
      setMessages((prev) => [...prev, message]);
    });
    socket.on('typing:start', ({ username }) => setTyping(username));
    socket.on('typing:stop', () => setTyping(null));

    return () => {
      socket.off('users:online');
      socket.off('message:receive');
      socket.off('typing:start');
      socket.off('typing:stop');
    };
  }, [user]);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/chat/conversations');
      setConversations(res.data.conversations);
    } catch (err) {
      console.error(err);
    }
  };

  const openConversation = async (conversation) => {
    if (activeConversation) {
      socket.emit('conversation:leave', activeConversation._id);
    }
    setActiveConversation(conversation);
    socket.emit('conversation:join', conversation._id);
    try {
      const res = await api.get(`/chat/messages/${conversation._id}`);
      setMessages(res.data.messages);
    } catch (err) {
      console.error(err);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation) return;
    try {
      const res = await api.post('/chat/message', {
        conversationId: activeConversation._id,
        content: newMessage,
      });
      socket.emit('message:send', res.data.message);
      setMessages((prev) => [...prev, res.data.message]);
      setNewMessage('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    socket.emit('typing:start', {
      conversationId: activeConversation?._id,
      userId: user._id,
      username: user.username,
    });
    setTimeout(() => {
      socket.emit('typing:stop', {
        conversationId: activeConversation?._id,
        userId: user._id,
      });
    }, 1500);
  };

  const getOtherMember = (conversation) => {
    return conversation.members.find((m) => m._id !== user?._id);
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <div className="w-80 bg-gray-900 flex flex-col border-r border-gray-800">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">AllConnect</h1>
            <p className="text-xs text-gray-400">@{user?.username}</p>
          </div>
          <button
            onClick={logout}
            className="text-gray-400 hover:text-red-400 text-sm transition"
          >
            Logout
          </button>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="text-gray-500 text-sm text-center mt-8">No conversations yet</p>
          ) : (
            conversations.map((conv) => {
              const other = getOtherMember(conv);
              const isOnline = onlineUsers.includes(other?._id);
              return (
                <div
                  key={conv._id}
                  onClick={() => openConversation(conv)}
                  className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-800 transition ${
                    activeConversation?._id === conv._id ? 'bg-gray-800' : ''
                  }`}
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold">
                      {conv.isGroup ? '👥' : other?.username?.[0]?.toUpperCase()}
                    </div>
                    {isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {conv.isGroup ? conv.name : other?.username}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {conv.lastMessage?.content || 'No messages yet'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-800 bg-gray-900">
              <p className="font-semibold">
                {activeConversation.isGroup
                  ? activeConversation.name
                  : getOtherMember(activeConversation)?.username}
              </p>
              {typing && (
                <p className="text-xs text-green-400">{typing} is typing...</p>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg._id}
                  className={`flex ${msg.sender._id === user?._id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
                      msg.sender._id === user?._id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-white'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <form onSubmit={sendMessage} className="p-4 border-t border-gray-800 flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={handleTyping}
                placeholder="Type a message..."
                className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition font-semibold"
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-4xl mb-4">💬</p>
              <p className="text-gray-400">Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;