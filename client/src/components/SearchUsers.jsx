import { useState } from 'react';
import api from '../services/api';

function SearchUsers({ onConversationStart }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchUsers = async (e) => {
    const value = e.target.value;
    setQuery(value);

    if (!value.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await api.get(`/users/search?q=${value}`);
      setResults(res.data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startConversation = async (userId) => {
    try {
      const res = await api.post('/chat/conversation', { receiverId: userId });
      onConversationStart(res.data.conversation);
      setQuery('');
      setResults([]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-3 border-b border-gray-800 relative">
      <input
        type="text"
        value={query}
        onChange={searchUsers}
        placeholder="Search users..."
        className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
      />

      {loading && (
        <p className="text-xs text-gray-400 mt-2 px-1">Searching...</p>
      )}

      {results.length > 0 && (
        <div className="absolute left-3 right-3 bg-gray-800 rounded-lg mt-1 shadow-xl z-10 overflow-hidden">
          {results.map((user) => (
            <div
              key={user._id}
              onClick={() => startConversation(user._id)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700 cursor-pointer transition"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">
                {user.username[0].toUpperCase()}
              </div>
              <div>
                <p className="text-white text-sm font-medium">{user.username}</p>
                <p className="text-gray-400 text-xs">{user.email}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {query && !loading && results.length === 0 && (
        <p className="text-xs text-gray-500 mt-2 px-1">No users found</p>
      )}
    </div>
  );
}

export default SearchUsers;