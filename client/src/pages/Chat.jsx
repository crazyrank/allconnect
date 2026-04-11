import { useEffect, useState } from 'react';
import useAuthStore from '../store/authStore';
import SearchUsers from '../components/SearchUsers';
import CreateGroup from '../components/CreateGroup';
import EmojiPicker from 'emoji-picker-react';
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
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      socket.connect();
      socket.emit('user:online', user._id);
      fetchConversations();
    }

    socket.on('users:online', (users) => setOnlineUsers(users));
    socket.on('message:receive', (message) => {
      setMessages((prev) => [...prev.message, message]);
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
  
      setNewMessage('');
    } catch (err) {
      console.error(err);
    }
  };

  const sendFile = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeConversation) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const res = await api.post('/chat/message', {
        conversationId: activeConversation._id,
        content: '',
        mediaUrl: uploadRes.data.url,
        mediaType: uploadRes.data.mediaType,
      });
      socket.emit('message:send', res.data.message);
      setMessages((prev) => [...prev, res.data.message]);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      await api.delete(`/chat/message/${messageId}`);
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
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
  
      <div className="w-80 bg-gray-900 flex flex-col border-r border-gray-800">
 
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Allconnect</h1>
            <p className="text-xs text-gray-400">Welcome {user?.username}</p>
          </div>
          <button
            onClick={logout}
            className="text-gray-400 hover:text-red-400 text-sm transition"
          >
            Logout
          </button>
        </div>

      
        <SearchUsers onConversationStart={(conv) => {
          setConversations((prev) => {
            const exists = prev.find((c) => c._id === conv._id);
            if (exists) return prev;
            return [conv, ...prev];
          });
          openConversation(conv);
        }} />

      
        <CreateGroup onGroupCreated={(conv) => {
          setConversations((prev) => [conv, ...prev]);
          openConversation(conv);
        }} />
 
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

 
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
 
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

   
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
               {messages.map((msg, index) => (
  
  <div
                  key={`${msg._id}-${index}`}
                  className={`flex group ${msg.sender._id === user?._id ? 
                    'justify-end' : 'justify-start'}`}  
                > <div className="mb-1">
  <p className="text-xs font-medium text-gray-300">
    {msg.sender?.fullName || msg.sender?.username }
    </p>
 
  <p className="text-xs text-gray-400">
    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
  </p>
</div>
                  <div className="relative">
                    <div
                      className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
                        msg.sender._id === user?._id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-white'
                      }`}
                    >
                      {msg.mediaType === 'image' ? (
  <img
    src={msg.mediaUrl}
    alt="media"
    className="rounded-xl max-w-full cursor-pointer"
    onClick={() => window.open(msg.mediaUrl, '_blank')}
  />
) : msg.mediaUrl ? (
  <a
    href={msg.mediaUrl}
    target="_blank"
    rel="noreferrer"
    className="underline text-blue-200 hover:text-blue-100 break-all"
  >
    📎 View File
  </a>
) : (
  msg.content
)}
                    </div>
                    {/* Delete button - only for own messages */}
                    {msg.sender._id === user?._id && (
                      <button
                        onClick={() => deleteMessage(msg._id)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 items-center justify-center hidden group-hover:flex"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

    
            <form onSubmit={sendMessage} className="p-4 border-t border-gray-800 flex gap-3 relative">
              {showEmoji && (
                <div className="absolute bottom-20 left-4 z-50">
                  <EmojiPicker
                    theme="dark"
                    onEmojiClick={(e) => {
                      setNewMessage((prev) => prev + e.emoji);
                      setShowEmoji(false);
                    }}
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowEmoji(!showEmoji)}
                className="text-gray-400 hover:text-yellow-400 text-xl transition"
              >
                😊
              </button>
              <label className="text-gray-400 hover:text-blue-400 text-xl transition cursor-pointer flex items-center">
                {uploading ? '⏳' : '📎'}
                <input
                  type="file"
                  className="hidden"
                  onChange={sendFile}
                  accept="image/*,application/pdf,audio/*"
                />
              </label>
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
              <p className="text-gray-400">Search / Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;