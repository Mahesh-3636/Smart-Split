/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight, 
  Users, 
  UserPlus, 
  Settings, 
  Tag, 
  X, 
  FileText, 
  AlertCircle,
  HelpCircle,
  TrendingUp,
  FolderPlus,
  Compass,
  Edit2
} from 'lucide-react';
import { User, Group } from '../types';

interface GroupCardExtended extends Group {
  debts: any[];
  expensesCount: number;
  netBalance: number;
}

interface DashboardProps {
  currentUser: User;
  groups: GroupCardExtended[];
  allUsers: Record<string, User>;
  metrics: {
    netOverallBalance: number;
    totalOwedToYou: number;
    totalYouOwe: number;
  };
  onSelectGroup: (groupId: string) => void;
  onCreateGroup: (name: string, description: string, members: string[]) => Promise<void>;
  onUpdateProfile: (name: string, avatar: string, upiId: string, bankName?: string, bankAccountNo?: string, bankIfsc?: string) => Promise<void>;
}

export default function Dashboard({ 
  currentUser, 
  groups, 
  allUsers, 
  metrics, 
  onSelectGroup, 
  onCreateGroup,
  onUpdateProfile
}: DashboardProps) {
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [selectedInvitees, setSelectedInvitees] = useState<string[]>([]);
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [pfName, setPfName] = useState(currentUser.name);
  const [pfAvatar, setPfAvatar] = useState(currentUser.avatar);
  const [pfUpiId, setPfUpiId] = useState(currentUser.upiId || "");
  const [pfBankName, setPfBankName] = useState(currentUser.bankName || "");
  const [pfBankAccountNo, setPfBankAccountNo] = useState(currentUser.bankAccountNo || "");
  const [pfBankIfsc, setPfBankIfsc] = useState(currentUser.bankIfsc || "");

  const [isLoading, setIsLoading] = useState(false);
  const [errorBtn, setErrorBtn] = useState("");

  const AVATAR_PRESETS = ["👨‍💻", "👩‍💼", "🧔", "👩", "🦁", "🦊", "🌟", "🔥", "🦄"];

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setErrorBtn("");
    setIsLoading(true);
    try {
      await onCreateGroup(newGroupName.trim(), newGroupDesc.trim(), selectedInvitees);
      setIsCreateGroupOpen(false);
      setNewGroupName("");
      setNewGroupDesc("");
      setSelectedInvitees([]);
    } catch (err: any) {
      setErrorBtn(err?.message || "Failed to create group");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBtn("");
    setIsLoading(true);

    // Mandatorily check either UPI or all bank details
    const hasUpi = pfUpiId.trim().length > 0;
    const hasBank = pfBankName.trim() && pfBankAccountNo.trim() && pfBankIfsc.trim();
    if (!hasUpi && !hasBank) {
      setErrorBtn("You must cover at least one payout channel (Bhim UPI OR complete Bank transfer info) to ensure secure settlements!");
      setIsLoading(false);
      return;
    }

    try {
      await onUpdateProfile(
        pfName.trim(), 
        pfAvatar, 
        pfUpiId.trim(), 
        pfBankName.trim(), 
        pfBankAccountNo.trim(), 
        pfBankIfsc.trim()
      );
      setIsProfileOpen(false);
    } catch (err: any) {
      setErrorBtn(err?.message || "Failed to update profile context.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleInvitee = (userId: string) => {
    setSelectedInvitees(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // Perform search over groups, descriptions, and members
  const filteredGroups = groups.filter(g => {
    const matchesName = g.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDesc = g.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMember = g.members.some(mId => 
      allUsers[mId]?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return matchesName || matchesDesc || matchesMember;
  });

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2 flex-wrap">
            <span>Welcome Back, {currentUser.name}!</span>
            <span className="animate-wiggle">{currentUser.avatar}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
              currentUser.subscription === 'premium'
                ? 'bg-[#140c2e] text-neon-pink border border-neon-purple/30 shadow glow-purple animate-pulse'
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}>
              {currentUser.subscription === 'premium' ? '★ Pro Premium' : 'Free Tier'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 font-bold">Simplify user bills & optimize total transactions instantly</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Action buttons */}
          <button
            onClick={() => setIsProfileOpen(true)}
            id="profile-edit-trigger"
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-705 hover:text-slate-900 hover:bg-slate-50 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Settings className="w-4 h-4 text-neon-purple" />
            <span>Profile settings</span>
          </button>

          <button
            onClick={() => setIsCreateGroupOpen(true)}
            id="create-group-trigger"
            className="px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-pink text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer hover:opacity-95 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>Create Group</span>
          </button>
        </div>
      </div>

      {/* Ledger Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 p-3 text-neon-purple opacity-20 group-hover:opacity-40 transition-opacity">
            <TrendingUp className="w-12 h-12" />
          </div>
          <span className="text-xs text-slate-500 font-bold block">Overall Ledger Share</span>
          <span className={`text-2xl font-black font-mono leading-none block ${
            metrics.netOverallBalance >= 0 ? "text-neon-teal" : "text-neon-pink"
          }`}>
            {metrics.netOverallBalance >= 0 ? `+₹${metrics.netOverallBalance.toFixed(2)}` : `-₹${Math.abs(metrics.netOverallBalance).toFixed(2)}`}
          </span>
          <p className="text-[10px] text-slate-500 font-bold">
            {metrics.netOverallBalance >= 0 ? "Others owe you money overall" : "You have payments to settle overall"}
          </p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 p-3 text-neon-teal opacity-20">
            <ArrowUpRight className="w-12 h-12" />
          </div>
          <span className="text-xs text-neon-teal font-extrabold block">Total Owed to You</span>
          <span className="text-2xl font-black text-slate-800 font-mono leading-none block">
            ₹{metrics.totalOwedToYou.toFixed(2)}
          </span>
          <p className="text-[10px] text-slate-500 font-bold">Credited shares across user rosters</p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 p-3 text-neon-pink opacity-20">
            <ArrowDownRight className="w-12 h-12" />
          </div>
          <span className="text-xs text-neon-pink font-extrabold block">Total You Owe</span>
          <span className="text-2xl font-black text-slate-800 font-mono leading-none block">
            ₹{metrics.totalYouOwe.toFixed(2)}
          </span>
          <p className="text-[10px] text-slate-500 font-bold">Debted balances ready to resolve via UPI</p>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          <Search className="w-4.5 h-4.5 text-neon-purple" />
        </span>
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Filter instant ledger by description, groups, categories, or user names..."
          className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-neon-teal focus:ring-1 focus:ring-neon-teal/20 rounded-2xl pl-12 pr-4 py-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all font-semibold shadow-sm"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Active Groups lists */}
      <div className="space-y-4">
        <h2 className="text-sm font-extrabold text-slate-800 tracking-wider uppercase">Active Expense Groups</h2>
        
        {filteredGroups.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-sm">
            <AlertCircle className="w-8 h-8 text-neon-pink mx-auto" />
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-800">No matching split-groups located on server</p>
              <p className="text-[11px] text-slate-500">Try searching another term or create an entirely new active group!</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGroups.map((g) => {
              const isCreditor = g.netBalance >= 0;
              return (
                <motion.div
                  key={g.id}
                  whileHover={{ scale: 1.015, y: -2 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => onSelectGroup(g.id)}
                  className="bg-white border border-white/10 hover:border-neon-purple/50 p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-sm cursor-pointer relative overflow-hidden group transition-all"
                >
                  {/* Premium dark cosmic gradient glow instead of washed out light-gray overlays */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-neon-purple/5 rounded-full blur-2xl pointer-events-none group-hover:bg-neon-purple/10 transition-all duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#160e2b] via-transparent to-[#100721]/50 opacity-90" />
                  <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/5 via-transparent to-neon-pink/5 opacity-45 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="relative z-10 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-extrabold text-white group-hover:text-neon-purple transition-all text-sm leading-tight tracking-tight drop-shadow-sm">{g.name}</h3>
                      <span className="text-[10px] text-neon-blue font-mono tracking-wide bg-neon-blue/10 px-2 py-0.5 rounded-full shrink-0 border border-neon-blue/20">
                        {g.expensesCount} expenses
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 pr-4 leading-relaxed">{g.description || "No description set for this active split group."}</p>
                  </div>

                  <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-3.5">
                    {/* Avatars */}
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {g.members.slice(0, 4).map((mId, idx) => {
                        const mUser = allUsers[mId];
                        return (
                          <div
                            key={mId}
                            title={mUser?.name || "Member"}
                            className="w-7.5 h-7.5 rounded-full bg-neon-purple border-2 border-[#120726] flex items-center justify-center text-sm shadow-md"
                          >
                            {mUser?.avatar || "👤"}
                          </div>
                        );
                      })}
                      {g.members.length > 4 && (
                        <div className="w-7.5 h-7.5 rounded-full bg-white/5 border-2 border-[#120726] flex items-center justify-center text-[10px] font-bold text-slate-400">
                          +{g.members.length - 4}
                        </div>
                      )}
                    </div>

                    {/* Personal Balance inside this specific group */}
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 font-bold block uppercase leading-none mb-0.5">Your balance</span>
                      <span className={`text-xs font-black font-mono tracking-wide ${isCreditor ? 'text-neon-teal' : 'text-neon-pink'}`}>
                        {isCreditor ? `+₹${g.netBalance.toFixed(2)}` : `-₹${Math.abs(g.netBalance).toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= MODALS ================= */}

      {/* Create Group Modal */}
      {isCreateGroupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setIsCreateGroupOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 space-y-5 z-10 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-neon-purple" />
                <h3 className="text-base font-extrabold text-slate-800">Create Active Group</h3>
              </div>
              <button 
                onClick={() => setIsCreateGroupOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-405 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroupSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Group Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. User Group 2026"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-neon-purple focus:ring-1 focus:ring-neon-purple/20 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-bold focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Description (Optional)</label>
                <textarea
                  placeholder="Shared cost breakdowns"
                  value={newGroupDesc}
                  onChange={e => setNewGroupDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-neon-purple focus:ring-1 focus:ring-neon-purple/20 rounded-xl px-4 py-2 text-xs text-slate-800 font-semibold focus:outline-none h-16 resize-none"
                />
              </div>

              {/* Multi-member roster selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-705 block">Invite Available Friends</label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto bg-slate-50 rounded-xl p-2 border border-slate-200">
                  {Object.values(allUsers)
                    .filter(u => u.id !== currentUser.id)
                    .map(u => {
                      const isSelected = selectedInvitees.includes(u.id);
                      return (
                        <button
                          type="button"
                          key={u.id}
                          onClick={() => toggleInvitee(u.id)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                            isSelected ? 'bg-neon-purple/10 border border-neon-purple/20 text-slate-800' : 'hover:bg-slate-100 text-slate-600 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{u.avatar || "👤"}</span>
                            <span className="font-bold text-slate-800">{u.name}</span>
                          </div>
                          <span className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] font-black ${
                            isSelected ? 'bg-neon-purple border-neon-purple text-white' : 'border-slate-300 text-transparent'
                          }`}>✓</span>
                        </button>
                      );
                    })}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-neon-purple to-neon-pink text-white font-extrabold text-xs py-3 rounded-xl shadow-md cursor-pointer hover:opacity-95"
              >
                Create Group Instance
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Profile Settings Modal */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setIsProfileOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-white border border-slate-200 w-full max-w-sm rounded-2xl p-6 space-y-5 z-10 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-neon-purple" />
                <h3 className="text-base font-extrabold text-slate-800">Profile System</h3>
              </div>
              <button 
                onClick={() => setIsProfileOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-405 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

             <form onSubmit={handleUpdateProfileSubmit} className="space-y-4">
               <div className="space-y-1.5">
                 <label className="text-xs font-bold text-slate-700">Display Name</label>
                 <input
                   type="text"
                   required
                   placeholder="Name"
                   value={pfName}
                   onChange={e => setPfName(e.target.value)}
                   className="w-full bg-slate-50 border border-slate-200 focus:border-neon-purple focus:ring-1 focus:ring-neon-purple/20 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-bold focus:outline-none"
                 />
               </div>

               <div className="space-y-1.5">
                 <label className="text-xs font-bold text-slate-700">UPI Payments Address</label>
                 <input
                   type="text"
                   placeholder="e.g. username@okhdfc"
                   value={pfUpiId}
                   onChange={e => setPfUpiId(e.target.value)}
                   className="w-full bg-slate-50 border border-slate-200 focus:border-neon-purple focus:ring-1 focus:ring-neon-purple/20 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-bold focus:outline-none placeholder:text-slate-400 font-mono"
                 />
               </div>

               {/* Bank Account Sub-card info */}
               <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                 <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Bank Account details (Direct Transfer)</p>
                 
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-700 block">Bank Name</label>
                   <input
                     type="text"
                     placeholder="e.g. State Bank of India"
                     value={pfBankName}
                     onChange={e => setPfBankName(e.target.value)}
                     className="w-full bg-white border border-slate-200 focus:border-neon-purple rounded-lg px-3 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none placeholder:text-slate-400"
                   />
                 </div>

                 <div className="grid grid-cols-2 gap-2">
                   <div className="space-y-1">
                     <label className="text-[10px] font-bold text-slate-700 block">Account Number</label>
                     <input
                       type="text"
                       placeholder="e.g. 30210045612"
                       value={pfBankAccountNo}
                       onChange={e => setPfBankAccountNo(e.target.value)}
                       className="w-full bg-white border border-slate-200 focus:border-neon-purple rounded-lg px-3 py-1.5 text-xs text-slate-800 font-mono font-bold focus:outline-none placeholder:text-slate-400"
                     />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-bold text-slate-700 block">IFSC Code</label>
                     <input
                       type="text"
                       placeholder="e.g. SBIN0020130"
                       value={pfBankIfsc}
                       onChange={e => setPfBankIfsc(e.target.value)}
                       className="w-full bg-white border border-slate-200 focus:border-neon-purple rounded-lg px-3 py-1.5 text-xs text-slate-800 font-mono font-bold uppercase focus:outline-none placeholder:text-slate-400"
                     />
                   </div>
                 </div>
               </div>

               {/* Avatar emojis */}
               <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-700 block">Avatar Emoji</label>
                 <div className="flex flex-wrap gap-2.5 bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                   {AVATAR_PRESETS.map(em => (
                     <button
                       type="button"
                       key={em}
                       onClick={() => setPfAvatar(em)}
                       className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg hover:bg-slate-200 transition-all ${
                         pfAvatar === em ? 'bg-neon-purple/10 border border-neon-purple' : 'border border-transparent'
                       }`}
                     >
                       {em}
                     </button>
                   ))}
                 </div>
               </div>

               {errorBtn && (
                 <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-bold leading-normal text-center">
                   ⚠️ {errorBtn}
                 </div>
               )}

               <button
                 type="submit"
                 disabled={isLoading}
                 className="w-full bg-gradient-to-r from-neon-purple to-neon-pink text-white font-extrabold text-xs py-3 rounded-xl shadow-md cursor-pointer hover:opacity-95"
               >
                 Update Profile Settings
               </button>
             </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
