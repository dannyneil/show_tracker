'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Member {
  id: string;
  email: string;
  role: 'owner' | 'member';
  created_at: string;
}

interface Invitation {
  id: string;
  email: string;
  created_at: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
  category: string;
  household_id: string | null;
}

interface HouseholdData {
  household: { id: string; name: string };
  members: Member[];
  invitations: Invitation[];
  currentUserRole: 'owner' | 'member';
  currentUserId: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [data, setData] = useState<HouseholdData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [householdName, setHouseholdName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isRefreshingRatings, setIsRefreshingRatings] = useState(false);

  // Tag management
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  useEffect(() => {
    fetchHousehold();
    fetchTags();
  }, []);

  const fetchHousehold = async () => {
    try {
      const response = await fetch('/api/household');
      if (response.status === 404) {
        // No household yet - this is fine for new users
        setError('No household found. This may happen if you just signed up - try refreshing.');
        setIsLoading(false);
        return;
      }
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result);
      setHouseholdName(result.household?.name || '');
    } catch {
      setError('Failed to load settings');
    }
    setIsLoading(false);
  };

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags');
      if (response.ok) {
        const allTags = await response.json();
        setTags(allTags);
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    try {
      const response = await fetch('/api/household/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });

      const result = await response.json();
      if (!response.ok) {
        alert(result.error || 'Failed to send invitation');
      } else {
        setInviteEmail('');
        fetchHousehold();
      }
    } catch {
      alert('Failed to send invitation');
    }
    setIsInviting(false);
  };

  const handleRemoveInvitation = async (invitationId: string) => {
    if (!confirm('Remove this invitation?')) return;

    try {
      const response = await fetch('/api/household/invite', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId }),
      });

      if (response.ok) {
        fetchHousehold();
      } else {
        const result = await response.json();
        alert(result.error || 'Failed to remove invitation');
      }
    } catch {
      alert('Failed to remove invitation');
    }
  };

  const handleRefreshRatings = async () => {
    setIsRefreshingRatings(true);
    try {
      const response = await fetch('/api/shows/refresh-ratings', { method: 'POST' });
      const data = await response.json();

      if (data.updated > 0) {
        alert(`Updated ratings for ${data.updated} shows!`);
      } else {
        alert(data.message || 'No ratings were updated');
      }
    } catch {
      alert('Failed to refresh ratings');
    }
    setIsRefreshingRatings(false);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Remove this member from your household?')) return;

    try {
      const response = await fetch('/api/household/member', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });

      if (response.ok) {
        fetchHousehold();
      } else {
        const result = await response.json();
        alert(result.error || 'Failed to remove member');
      }
    } catch {
      alert('Failed to remove member');
    }
  };

  const handleSaveName = async () => {
    if (!householdName.trim()) return;

    setIsSavingName(true);
    try {
      const response = await fetch('/api/household', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: householdName.trim() }),
      });

      if (!response.ok) {
        const result = await response.json();
        alert(result.error || 'Failed to update name');
      } else {
        fetchHousehold();
      }
    } catch {
      alert('Failed to update name');
    }
    setIsSavingName(false);
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    setIsCreatingTag(true);
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: '#8b5cf6', // Purple color for "Who" tags
          category: 'Who',
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        alert(result.error || 'Failed to create tag');
      } else {
        setNewTagName('');
        fetchTags();
      }
    } catch {
      alert('Failed to create tag');
    }
    setIsCreatingTag(false);
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('Delete this tag? It will be removed from all shows.')) return;

    try {
      const response = await fetch(`/api/tags/${tagId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTags();
      } else {
        const result = await response.json();
        alert(result.error || 'Failed to delete tag');
      }
    } catch {
      alert('Failed to delete tag');
    }
  };

  const isOwner = data?.currentUserRole === 'owner';

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f0e8] dark:bg-[#1a1918] bg-grid-pattern">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
        <p className="mt-4 text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8] dark:bg-[#1a1918] bg-grid-pattern">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#faf7f2]/95 via-[#fdf9f3]/95 to-[#faf7f2]/95 dark:from-[#252320]/95 dark:via-[#2a2725]/95 dark:to-[#252320]/95 backdrop-blur-xl border-b border-amber-200/20 dark:border-amber-900/10 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-lg font-bold text-foreground">Settings</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-800">
            {error}
          </div>
        ) : data ? (
          <div className="space-y-8">
            {/* Household Name */}
            <section className="bg-[#faf7f2]/80 dark:bg-[#252320]/80 backdrop-blur-lg rounded-2xl p-6 border border-amber-200/30 dark:border-amber-900/20 shadow-xl shadow-amber-900/5 dark:shadow-none">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Household
              </h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  disabled={!isOwner}
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-foreground disabled:opacity-50"
                  placeholder="Household name"
                />
                {isOwner && (
                  <button
                    onClick={handleSaveName}
                    disabled={isSavingName || householdName === data.household?.name}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
                  >
                    {isSavingName ? 'Saving...' : 'Save'}
                  </button>
                )}
              </div>
              {!isOwner && (
                <p className="text-sm text-gray-500 mt-2">Only the owner can change the household name.</p>
              )}
            </section>

            {/* Members */}
            <section className="bg-[#faf7f2]/80 dark:bg-[#252320]/80 backdrop-blur-lg rounded-2xl p-6 border border-amber-200/30 dark:border-amber-900/20 shadow-xl shadow-amber-900/5 dark:shadow-none">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Members
              </h2>
              <div className="space-y-3">
                {data.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50"
                  >
                    <div>
                      <p className="font-medium text-foreground">{member.email}</p>
                      <p className="text-sm text-gray-500 capitalize">{member.role}</p>
                    </div>
                    {isOwner && member.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Remove member"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Invite */}
            {isOwner && (
              <section className="bg-[#faf7f2]/80 dark:bg-[#252320]/80 backdrop-blur-lg rounded-2xl p-6 border border-amber-200/30 dark:border-amber-900/20 shadow-xl shadow-amber-900/5 dark:shadow-none">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Invite Someone
                </h2>
                <form onSubmit={handleInvite} className="flex gap-3">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-foreground"
                    placeholder="email@example.com"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isInviting}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
                  >
                    {isInviting ? 'Inviting...' : 'Invite'}
                  </button>
                </form>
                <p className="text-sm text-gray-500 mt-3">
                  When they sign up with this email, they&apos;ll automatically join your household.
                </p>

                {/* Pending invitations */}
                {data.invitations.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Pending Invitations</h3>
                    <div className="space-y-2">
                      {data.invitations.map((invitation) => (
                        <div
                          key={invitation.id}
                          className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200/50 dark:border-amber-800/50"
                        >
                          <div>
                            <p className="font-medium text-foreground">{invitation.email}</p>
                            <p className="text-xs text-gray-500">
                              Invited {new Date(invitation.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemoveInvitation(invitation.id)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Cancel invitation"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Who Tags */}
            <section className="bg-[#faf7f2]/80 dark:bg-[#252320]/80 backdrop-blur-lg rounded-2xl p-6 border border-amber-200/30 dark:border-amber-900/20 shadow-xl shadow-amber-900/5 dark:shadow-none">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Who Tags
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Create custom tags for family members to track who wants to watch what.
              </p>

              {/* Create new tag */}
              <form onSubmit={handleCreateTag} className="flex gap-3 mb-4">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-foreground"
                  placeholder="e.g., Sarah, Mom, Kids"
                  maxLength={20}
                />
                <button
                  type="submit"
                  disabled={isCreatingTag || !newTagName.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
                >
                  {isCreatingTag ? 'Adding...' : 'Add Tag'}
                </button>
              </form>

              {/* List of custom Who tags */}
              <div className="space-y-2">
                {tags
                  .filter((tag) => tag.category === 'Who' && tag.household_id !== null)
                  .map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="font-medium text-foreground">{tag.name}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteTag(tag.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete tag"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                {tags.filter((tag) => tag.category === 'Who' && tag.household_id !== null).length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No custom Who tags yet. Add one above!
                  </p>
                )}
              </div>
            </section>

            {/* Data Management */}
            <section className="bg-[#faf7f2]/80 dark:bg-[#252320]/80 backdrop-blur-lg rounded-2xl p-6 border border-amber-200/30 dark:border-amber-900/20 shadow-xl shadow-amber-900/5 dark:shadow-none">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
                Data Management
              </h2>
              <div className="space-y-4">
                <div>
                  <button
                    onClick={handleRefreshRatings}
                    disabled={isRefreshingRatings}
                    className="px-4 py-2 text-sm bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 dark:hover:from-amber-900/50 dark:hover:to-orange-900/50 text-amber-700 dark:text-amber-300 rounded-xl border border-amber-200/50 dark:border-amber-800/50 disabled:opacity-50 transition-all shadow-sm hover:shadow flex items-center gap-2"
                    title="Refresh IMDb & Rotten Tomatoes ratings for all shows"
                  >
                    <svg className={`w-4 h-4 ${isRefreshingRatings ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {isRefreshingRatings ? 'Updating...' : 'Refresh Ratings'}
                  </button>
                  <p className="text-sm text-gray-500 mt-2">
                    Updates IMDb and Rotten Tomatoes ratings for all shows in your watchlist.
                  </p>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
