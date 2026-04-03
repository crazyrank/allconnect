import { useState } from 'react';
import api from '../services/api';

function CreateGroup({ onGroupCreated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchUsers = async (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await api.get(`/users/search?q=${value}`);
      setSearchResults(res.data.users);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleMember = (user) => {
    setSelectedMembers((prev) =>
      prev.find((m) => m._id === user._id)
        ? prev.filter((m) => m._id !== user._id)
        : [...prev, user]
    );
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedMembers.length < 2) return;
    setLoading(true);
    try {
      const res = await api.post('/chat/group', {
        name: groupName,
        members: selectedMembers.map((m) => m._id),
      });
      onGroupCreated(res.data.conversation);
      setIsOpen(false);
      setGroupName('');
      setSelectedMembers([]);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-full text-left px-4 py-2 text-sm text-blue-400 hover:bg-gray-800 transition"
      >
        + New Group
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Create Group</h2>

            {/* Group Name */}
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name..."
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />

            {/* Search Members */}
            <input
              type="text"
              value={searchQuery}
              onChange={searchUsers}
              placeholder="Search and add members..."
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            />

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="bg-gray-800 rounded-lg mb-3 max-h-36 overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user._id}
                    onClick={() => toggleMember(user)}
                    className={`flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-gray-700 transition ${
                      selectedMembers.find((m) => m._id === user._id)
                        ? 'bg-blue-600/20'
                        : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">
                      {user.username[0].toUpperCase()}
                    </div>
                    <p className="text-white text-sm">{user.username}</p>
                    {selectedMembers.find((m) => m._id === user._id) && (
                      <span className="ml-auto text-green-400 text-xs">✓ Added</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Selected Members */}
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedMembers.map((member) => (
                  <span
                    key={member._id}
                    onClick={() => toggleMember(member)}
                    className="bg-blue-600/30 text-blue-300 text-xs px-3 py-1 rounded-full cursor-pointer hover:bg-red-600/30 hover:text-red-300 transition"
                  >
                    {member.username} ✕
                  </span>
                ))}
              </div>
            )}

            {selectedMembers.length < 2 && (
              <p className="text-xs text-gray-500 mb-4">
                Add at least 2 members to create a group
              </p>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={createGroup}
                disabled={!groupName.trim() || selectedMembers.length < 2 || loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CreateGroup;