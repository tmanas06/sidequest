'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users,
  UserPlus,
  Shield,
  Lock,
  Globe,
  Share2,
  Check,
  X,
  Vote,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Plus,
  ArrowRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface FriendItem {
  id: string
  username: string
  displayName: string
  status: 'accepted' | 'pending_incoming' | 'pending_outgoing'
  sharedEventsCount?: number
}

interface GroupItem {
  id: string
  name: string
  description: string
  inviteCode: string
  memberCount: number
  eventsCount: number
}

export default function FriendsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'friends' | 'groups' | 'privacy'>('friends')

  // Social state (persisted locally per-user for immediate functionality)
  const [friends, setFriends] = useState<FriendItem[]>([])
  const [groups, setGroups] = useState<GroupItem[]>([])
  const [scheduleVisibility, setScheduleVisibility] = useState<'private' | 'friends' | 'public'>('private')
  const [friendInput, setFriendInput] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [feedbackMsg, setFeedbackMsg] = useState('')

  useEffect(() => {
    const db = createClient()
    db.auth.getUser().then(({ data }) => {
      const user = data?.user || null
      setCurrentUser(user)
      if (user) {
        // Load saved state from local storage scoped to user
        const savedFriends = localStorage.getItem(`sidequest_friends_${user.id}`)
        if (savedFriends) {
          try { setFriends(JSON.parse(savedFriends)) } catch {}
        }
        const savedGroups = localStorage.getItem(`sidequest_groups_${user.id}`)
        if (savedGroups) {
          try { setGroups(JSON.parse(savedGroups)) } catch {}
        }
        const savedVis = localStorage.getItem(`sidequest_visibility_${user.id}`)
        if (savedVis === 'friends' || savedVis === 'public' || savedVis === 'private') {
          setScheduleVisibility(savedVis)
        }
      }
      setLoading(false)
    }).catch(() => {
      setCurrentUser(null)
      setLoading(false)
    })
  }, [])

  const persistFriends = (list: FriendItem[]) => {
    setFriends(list)
    if (currentUser?.id) {
      localStorage.setItem(`sidequest_friends_${currentUser.id}`, JSON.stringify(list))
    }
  }

  const persistGroups = (list: GroupItem[]) => {
    setGroups(list)
    if (currentUser?.id) {
      localStorage.setItem(`sidequest_groups_${currentUser.id}`, JSON.stringify(list))
    }
  }

  const handleSendFriendRequest = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = friendInput.trim()
    if (!trimmed) return

    if (friends.some(f => f.username.toLowerCase() === trimmed.toLowerCase())) {
      setFeedbackMsg('Already in your friends list or pending.')
      return
    }

    const newFriend: FriendItem = {
      id: 'req_' + Date.now(),
      username: trimmed.replace('@', ''),
      displayName: trimmed.replace('@', ''),
      status: 'pending_outgoing',
      sharedEventsCount: 0,
    }

    persistFriends([newFriend, ...friends])
    setFriendInput('')
    setFeedbackMsg(`Friend request sent to @${newFriend.username}`)
    setTimeout(() => setFeedbackMsg(''), 3000)
  }

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault()
    const name = newGroupName.trim()
    if (!name) return

    const newGroup: GroupItem = {
      id: 'grp_' + Date.now(),
      name,
      description: 'Side events planning & group voting squad',
      inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      memberCount: 1,
      eventsCount: 0,
    }

    persistGroups([newGroup, ...groups])
    setNewGroupName('')
    setFeedbackMsg(`Group "${name}" created with code ${newGroup.inviteCode}`)
    setTimeout(() => setFeedbackMsg(''), 3000)
  }

  const handleJoinGroup = (e: React.FormEvent) => {
    e.preventDefault()
    const code = joinCode.trim().toUpperCase()
    if (!code) return

    if (groups.some(g => g.inviteCode === code)) {
      setFeedbackMsg('You are already a member of this group.')
      return
    }

    const joined: GroupItem = {
      id: 'grp_joined_' + Date.now(),
      name: `Squad (${code})`,
      description: 'Shared event calendar',
      inviteCode: code,
      memberCount: 2,
      eventsCount: 0,
    }

    persistGroups([joined, ...groups])
    setJoinCode('')
    setFeedbackMsg(`Joined group ${code}`)
    setTimeout(() => setFeedbackMsg(''), 3000)
  }

  const handleCopyInvite = () => {
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/invite/${currentUser?.id || 'demo'}`
      : 'https://sidequest-devv.vercel.app'
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleUpdateVisibility = (vis: 'private' | 'friends' | 'public') => {
    setScheduleVisibility(vis)
    if (currentUser?.id) {
      localStorage.setItem(`sidequest_visibility_${currentUser.id}`, vis)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24 md:pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#F5F5F0]">
            Friends & Groups
          </h1>
          <p className="text-sm mt-1 text-[#9298A3]">
            Coordinate side event plans with friends, shortlist itineraries, and vote on where to go.
          </p>
        </div>

        {currentUser && (
          <button
            onClick={handleCopyInvite}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#14171C] hover:bg-[#191D24] text-[#F5F5F0] border border-[#292E36] transition-colors self-start"
          >
            {copiedLink ? <Check size={13} className="text-[#10B981]" /> : <Share2 size={13} className="text-[#C6F36B]" />}
            <span>{copiedLink ? 'Invite Link Copied' : 'Share Invite Link'}</span>
          </button>
        )}
      </div>

      {!currentUser && !loading ? (
        /* Signed Out State */
        <div className="p-8 rounded-xl bg-[#14171C] border border-[#292E36] text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#191D24] border border-[#292E36] flex items-center justify-center mx-auto text-[#C6F36B]">
            <Users size={24} />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-lg font-semibold text-[#F5F5F0]">
              Sign in to coordinate with friends
            </h2>
            <p className="text-xs text-[#9298A3] leading-relaxed">
              Connect with fellow attendees to see overlapping side events, form group voting shortlists, and share schedules while keeping private selections confidential.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              href="/auth/login"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#C6F36B] hover:bg-[#B5E85A] text-[#0B0D10] transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="px-4 py-2 rounded-lg text-xs font-medium bg-[#191D24] hover:bg-[#20252E] text-[#F5F5F0] border border-[#292E36] transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      ) : (
        /* Signed In Social Hub */
        <div className="space-y-6">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 border-b border-[#292E36] pb-2">
            <button
              onClick={() => setActiveTab('friends')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'friends'
                  ? 'bg-[#191D24] text-[#F5F5F0] border border-[#292E36]'
                  : 'text-[#9298A3] hover:text-[#F5F5F0]'
              }`}
            >
              <Users size={13} />
              <span>Friends ({friends.filter(f => f.status === 'accepted').length})</span>
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'groups'
                  ? 'bg-[#191D24] text-[#F5F5F0] border border-[#292E36]'
                  : 'text-[#9298A3] hover:text-[#F5F5F0]'
              }`}
            >
              <Vote size={13} />
              <span>Groups & Voting ({groups.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'privacy'
                  ? 'bg-[#191D24] text-[#F5F5F0] border border-[#292E36]'
                  : 'text-[#9298A3] hover:text-[#F5F5F0]'
              }`}
            >
              <Shield size={13} />
              <span>Privacy Controls</span>
            </button>
          </div>

          {feedbackMsg && (
            <div className="p-3 rounded-lg bg-[#14171C] border border-[#C6F36B]/30 text-xs text-[#C6F36B] flex items-center gap-2">
              <Check size={14} />
              <span>{feedbackMsg}</span>
            </div>
          )}

          {/* TAB 1: FRIENDS */}
          {activeTab === 'friends' && (
            <div className="space-y-6">
              {/* Add friend card */}
              <div className="p-4 rounded-xl bg-[#14171C] border border-[#292E36]">
                <h3 className="text-xs font-medium uppercase font-mono tracking-wider text-[#9298A3] mb-3">
                  Add a Friend
                </h3>
                <form onSubmit={handleSendFriendRequest} className="flex gap-2">
                  <input
                    type="text"
                    value={friendInput}
                    onChange={e => setFriendInput(e.target.value)}
                    placeholder="Enter friend's username or email (e.g. vitalik)"
                    className="flex-1 bg-[#101318] border border-[#292E36] rounded-lg px-3 py-2 text-xs text-[#F5F5F0] placeholder-[#9298A3]/50 focus:outline-none focus:border-[#C6F36B]"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#C6F36B] hover:bg-[#B5E85A] text-[#0B0D10] transition-colors flex items-center gap-1.5"
                  >
                    <UserPlus size={13} />
                    <span>Send Request</span>
                  </button>
                </form>
              </div>

              {/* Friends List */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-[#9298A3]">
                  Connected Friends
                </h3>

                {friends.length === 0 ? (
                  <div className="text-center py-12 rounded-xl border border-dashed border-[#292E36] bg-[#14171C]/50 space-y-2">
                    <Users size={32} className="mx-auto text-[#9298A3] opacity-40" />
                    <p className="text-sm font-semibold text-[#F5F5F0]">No friends connected yet</p>
                    <p className="text-xs text-[#9298A3] max-w-sm mx-auto">
                      Send a request above or share your invite link to coordinate ETHGlobal, Devcon, or IBW events with friends.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {friends.map(f => (
                      <div
                        key={f.id}
                        className="p-3.5 rounded-xl bg-[#14171C] border border-[#292E36] flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#191D24] border border-[#292E36] flex items-center justify-center font-mono font-bold text-xs text-[#C6F36B]">
                            {f.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-[#F5F5F0]">@{f.username}</p>
                            <span className="text-[10px] font-mono text-[#9298A3]">
                              {f.status === 'accepted' ? 'Connected' : 'Pending Request'}
                            </span>
                          </div>
                        </div>

                        {f.status === 'pending_outgoing' && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#191D24] text-[#9298A3] border border-[#292E36]">
                            Outgoing
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: GROUPS & VOTING */}
          {activeTab === 'groups' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Create group */}
                <div className="p-4 rounded-xl bg-[#14171C] border border-[#292E36] space-y-3">
                  <h3 className="text-xs font-medium uppercase font-mono tracking-wider text-[#9298A3]">
                    Create a Planning Group
                  </h3>
                  <form onSubmit={handleCreateGroup} className="space-y-2">
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={e => setNewGroupName(e.target.value)}
                      placeholder="e.g. Hacker House Crew, Mumbai Builders"
                      className="w-full bg-[#101318] border border-[#292E36] rounded-lg px-3 py-2 text-xs text-[#F5F5F0] placeholder-[#9298A3]/50 focus:outline-none focus:border-[#C6F36B]"
                    />
                    <button
                      type="submit"
                      className="w-full py-2 rounded-lg text-xs font-semibold bg-[#C6F36B] hover:bg-[#B5E85A] text-[#0B0D10] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Plus size={13} />
                      <span>Create Group</span>
                    </button>
                  </form>
                </div>

                {/* Join group */}
                <div className="p-4 rounded-xl bg-[#14171C] border border-[#292E36] space-y-3">
                  <h3 className="text-xs font-medium uppercase font-mono tracking-wider text-[#9298A3]">
                    Join Existing Group
                  </h3>
                  <form onSubmit={handleJoinGroup} className="space-y-2">
                    <input
                      type="text"
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value)}
                      placeholder="Enter 6-character invite code"
                      className="w-full bg-[#101318] border border-[#292E36] rounded-lg px-3 py-2 text-xs font-mono uppercase text-[#F5F5F0] placeholder-[#9298A3]/50 focus:outline-none focus:border-[#C6F36B]"
                    />
                    <button
                      type="submit"
                      className="w-full py-2 rounded-lg text-xs font-medium bg-[#191D24] hover:bg-[#20252E] text-[#F5F5F0] border border-[#292E36] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ArrowRight size={13} />
                      <span>Join Group</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* Group List */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-[#9298A3]">
                  Your Planning Squads
                </h3>

                {groups.length === 0 ? (
                  <div className="text-center py-12 rounded-xl border border-dashed border-[#292E36] bg-[#14171C]/50 space-y-2">
                    <Vote size={32} className="mx-auto text-[#9298A3] opacity-40" />
                    <p className="text-sm font-semibold text-[#F5F5F0]">No groups formed yet</p>
                    <p className="text-xs text-[#9298A3] max-w-sm mx-auto">
                      Create or join a group to build a shared shortlist of side events and vote on daily attendance.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {groups.map(g => (
                      <div
                        key={g.id}
                        className="p-4 rounded-xl bg-[#14171C] border border-[#292E36] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <h4 className="font-medium text-sm text-[#F5F5F0]">{g.name}</h4>
                          <p className="text-xs text-[#9298A3] mt-0.5">{g.description}</p>
                          <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-[#9298A3]">
                            <span>{g.memberCount} member{g.memberCount !== 1 ? 's' : ''}</span>
                            <span>·</span>
                            <span>Invite Code: <strong className="text-[#C6F36B]">{g.inviteCode}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(g.inviteCode)
                              setFeedbackMsg(`Copied group code ${g.inviteCode}`)
                              setTimeout(() => setFeedbackMsg(''), 2500)
                            }}
                            className="px-2.5 py-1.5 rounded-md text-xs font-mono bg-[#191D24] hover:bg-[#20252E] text-[#9298A3] hover:text-[#F5F5F0] border border-[#292E36] transition-colors flex items-center gap-1"
                          >
                            <Copy size={11} />
                            <span>Copy Code</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PRIVACY CONTROLS */}
          {activeTab === 'privacy' && (
            <div className="p-5 rounded-xl bg-[#14171C] border border-[#292E36] space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-[#F5F5F0] flex items-center gap-2">
                  <Shield size={16} className="text-[#C6F36B]" />
                  <span>Schedule Visibility & Privacy</span>
                </h3>
                <p className="text-xs text-[#9298A3] mt-1">
                  Control who is allowed to view your saved events and planned schedule.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    id: 'private',
                    label: 'Private (Default)',
                    desc: 'Only you can see your saved events and confirmed schedule. Completely hidden from friends and search.',
                    icon: Lock,
                  },
                  {
                    id: 'friends',
                    label: 'Friends Only',
                    desc: 'Mutual, accepted friends can see your approved schedule to help coordinate overlapping events.',
                    icon: Users,
                  },
                  {
                    id: 'public',
                    label: 'Public via Link',
                    desc: 'Anyone with your personalized schedule link can view your attending side events.',
                    icon: Globe,
                  },
                ].map(opt => {
                  const Icon = opt.icon
                  const isSelected = scheduleVisibility === opt.id
                  return (
                    <label
                      key={opt.id}
                      onClick={() => handleUpdateVisibility(opt.id as 'private' | 'friends' | 'public')}
                      className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#191D24] border-[#C6F36B]'
                          : 'bg-[#101318] border-[#292E36] hover:border-[#383F4A]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="visibility"
                        checked={isSelected}
                        onChange={() => handleUpdateVisibility(opt.id as 'private' | 'friends' | 'public')}
                        className="mt-0.5 accent-[#C6F36B]"
                      />
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-1.5">
                          <Icon size={13} className={isSelected ? 'text-[#C6F36B]' : 'text-[#9298A3]'} />
                          <span className="text-xs font-semibold text-[#F5F5F0]">{opt.label}</span>
                        </div>
                        <p className="text-[11px] text-[#9298A3] leading-relaxed">{opt.desc}</p>
                      </div>
                    </label>
                  )
                })}
              </div>

              <div className="p-3.5 rounded-lg bg-[#101318] border border-[#292E36] text-[11px] text-[#9298A3] space-y-1">
                <p className="font-semibold text-[#F5F5F0]">Privacy Assurance:</p>
                <p>
                  SideQuest never exposes your private waitlists, unconfirmed registrations, or email addresses in shared feeds or public URLs.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
