import { useEffect, useState, useRef } from 'react';
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const messagesEndRef = useRef(null);

  // Track screen size
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const closeConversation = () => {
    if (activeConversation) {
      socket.emit('conversation:leave', activeConversation._id);
    }
    setActiveConversation(null);
    setMessages([]);
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

  // On mobile: show sidebar OR chat, never both
  // On desktop: show both side by side
  const showSidebar = !isMobile || !activeConversation;
  const showChat = !isMobile || activeConversation;

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: '#030712', color: 'white' }}>

      {/* ── SIDEBAR ── */}
      {showSidebar && (
        <div style={{
          width: isMobile ? '100%' : '320px',
          minWidth: isMobile ? '100%' : '320px',
          background: '#111827',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #1f2937',
          overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{ padding: '16px', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>Allconnect</h1>
              <p style={{ fontSize: '12px', color: '#9ca3af' }}>Welcome {user?.username}</p>
            </div>
            <button
              onClick={logout}
              style={{ color: '#9ca3af', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer' }}
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

          {/* Conversations list */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            {conversations.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center', marginTop: '32px' }}>
                No conversations yet
              </p>
            ) : (
              conversations.map((conv) => {
                const other = getOtherMember(conv);
                const isOnline = onlineUsers.includes(other?._id);
                return (
                  <div
                    key={conv._id}
                    onClick={() => openConversation(conv)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px',
                      cursor: 'pointer',
                      background: activeConversation?._id === conv._id ? '#1f2937' : 'transparent',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1f2937'}
                    onMouseLeave={e => e.currentTarget.style.background = activeConversation?._id === conv._id ? '#1f2937' : 'transparent'}
                  >
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        background: '#2563eb', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontWeight: 'bold',
                      }}>
                        {conv.isGroup ? '👥' : other?.username?.[0]?.toUpperCase()}
                      </div>
                      {isOnline && (
                        <div style={{
                          position: 'absolute', bottom: 0, right: 0,
                          width: '12px', height: '12px', borderRadius: '50%',
                          background: '#22c55e', border: '2px solid #111827',
                        }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.isGroup ? conv.name : other?.username}
                      </p>
                      <p style={{ fontSize: '12px', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.lastMessage?.content || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── CHAT AREA ── */}
      {showChat && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          {activeConversation ? (
            <>
              {/* Chat header */}
              <div style={{
                padding: '16px', borderBottom: '1px solid #1f2937',
                background: '#111827', display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                {/* Back button — mobile only */}
                {isMobile && (
                  <button
                    onClick={closeConversation}
                    style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '22px', cursor: 'pointer', padding: '0 4px' }}
                  >
                    ←
                  </button>
                )}
                <div>
                  <p style={{ fontWeight: '600' }}>
                    {activeConversation.isGroup
                      ? activeConversation.name
                      : getOtherMember(activeConversation)?.username}
                  </p>
                  {typing && (
                    <p style={{ fontSize: '12px', color: '#4ade80' }}>{typing} is typing...</p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.map((msg, index) => (
                  <div
                    key={`${msg._id}-${index}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: msg.sender._id === user?._id ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {/* Sender name + time */}
                    <div style={{ marginBottom: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: '500', color: '#d1d5db' }}>
                        {msg.sender?.fullName || msg.sender?.username}
                      </span>
                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Bubble */}
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        maxWidth: '280px',
                        padding: '10px 16px',
                        borderRadius: '18px',
                        fontSize: '14px',
                        wordBreak: 'break-word',
                        background: msg.sender._id === user?._id ? '#2563eb' : '#1f2937',
                        color: 'white',
                      }}>
                        {msg.mediaType === 'image' ? (
                          <img
                            src={msg.mediaUrl}
                            alt="media"
                            style={{ borderRadius: '12px', maxWidth: '100%', cursor: 'pointer' }}
                            onClick={() => window.open(msg.mediaUrl, '_blank')}
                          />
                        ) : msg.mediaUrl ? (
                          <a href={msg.mediaUrl} target="_blank" rel="noreferrer"
                            style={{ color: '#bfdbfe', textDecoration: 'underline', wordBreak: 'break-all' }}>
                            📎 View File
                          </a>
                        ) : (
                          msg.content
                        )}
                      </div>

                      {/* Delete button */}
                      {msg.sender._id === user?._id && (
                        <button
                          onClick={() => deleteMessage(msg._id)}
                          style={{
                            position: 'absolute', top: '-8px', right: '-8px',
                            background: '#ef4444', color: 'white', border: 'none',
                            borderRadius: '50%', width: '20px', height: '20px',
                            fontSize: '10px', cursor: 'pointer', display: 'none',
                          }}
                          onMouseEnter={e => e.currentTarget.style.display = 'flex'}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message input */}
              <form
                onSubmit={sendMessage}
                style={{
                  padding: '16px', borderTop: '1px solid #1f2937',
                  display: 'flex', gap: '12px', alignItems: 'center',
                  position: 'relative', background: '#030712',
                }}
              >
                {showEmoji && (
                  <div style={{ position: 'absolute', bottom: '80px', left: '16px', zIndex: 50 }}>
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
                  style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer' }}
                >
                  😊
                </button>
                <label style={{ fontSize: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  {uploading ? '⏳' : '📎'}
                  <input type="file" style={{ display: 'none' }} onChange={sendFile} accept="image/*,application/pdf,audio/*" />
                </label>
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleTyping}
                  placeholder="Type a message..."
                  style={{
                    flex: 1, background: '#1f2937', color: 'white',
                    border: 'none', borderRadius: '12px', padding: '12px 16px',
                    fontSize: '14px', outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  style={{
                    background: '#2563eb', color: 'white', border: 'none',
                    borderRadius: '12px', padding: '12px 20px', fontWeight: '600',
                    cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  Send
                </button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '48px', marginBottom: '16px' }}>💬</p>
                <p style={{ color: '#9ca3af' }}>Search / Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Chat;
