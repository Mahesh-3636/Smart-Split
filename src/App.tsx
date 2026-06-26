/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coins, CircleAlert, Sparkles, Loader2 } from 'lucide-react';

// Subcomponents import
import Sidebar from './components/Sidebar';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import GroupDetail from './components/GroupDetail';
import AnalyticsPanel from './components/AnalyticsPanel';
import AIAssistant from './components/AIAssistant';
import PremiumBilling from './components/PremiumBilling';

import { User, Group, Expense, Debt } from './types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  
  // Dashboard overall aggregated states
  const [dashboardData, setDashboardData] = useState<any>(null);
  // Group detail specific state
  const [activeGroupDetails, setActiveGroupDetails] = useState<any>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Recover session
  useEffect(() => {
    const savedUser = localStorage.getItem('splitsmart_session');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser) as User;
        setCurrentUser(parsed);
      } catch (err) {
        localStorage.removeItem('splitsmart_session');
      }
    }
    setInitialLoading(false);
  }, []);

  // Fetch Dashboard state
  const loadDashboard = async (userId: string) => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const response = await fetch(`/api/dashboard/${userId}`);
      if (!response.ok) throw new Error("Failed to load dashboard context data");
      const data = await response.json();
      setDashboardData(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Communication error with database");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch specific room group detailed ledger
  const loadGroupDetails = async (groupId: string) => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const response = await fetch(`/api/groups/${groupId}`);
      if (!response.ok) throw new Error("Failed to load group detailed matrix");
      const data = await response.json();
      setActiveGroupDetails(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to parse ledger");
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger loading state updates
  useEffect(() => {
    if (currentUser) {
      loadDashboard(currentUser.id);
    } else {
      setDashboardData(null);
      setActiveGroupDetails(null);
      setSelectedGroupId(null);
    }
  }, [currentUser]);

  // Handle drill down dynamic state loading
  useEffect(() => {
    if (selectedGroupId) {
      loadGroupDetails(selectedGroupId);
    } else {
      setActiveGroupDetails(null);
    }
  }, [selectedGroupId]);

  const handleLoginSuccess = (user: User) => {
    localStorage.setItem('splitsmart_session', JSON.stringify(user));
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('splitsmart_session');
    setCurrentUser(null);
  };

  // Backend callbacks bindings

  const handleAddExpense = async (expenseData: Partial<Expense>) => {
    if (!currentUser || !selectedGroupId) return;
    const response = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...expenseData,
        groupId: selectedGroupId,
      })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to create expense ledger");
    }

    // Refresh states
    await loadGroupDetails(selectedGroupId);
    await loadDashboard(currentUser.id);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!currentUser || !selectedGroupId) return;
    const response = await fetch(`/api/expenses/${expenseId}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error("Failed to delete expense");
    
    await loadGroupDetails(selectedGroupId);
    await loadDashboard(currentUser.id);
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!currentUser) return;
    const response = await fetch(`/api/groups/${groupId}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error("Failed to delete group");

    setSelectedGroupId(null);
    await loadDashboard(currentUser.id);
  };

  const handleInviteMember = async (
    name: string, 
    email: string, 
    upiId: string,
    bankName?: string,
    bankAccountNo?: string,
    bankIfsc?: string
  ) => {
    if (!currentUser || !selectedGroupId) return;
    const response = await fetch(`/api/groups/${selectedGroupId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name, 
        email, 
        upiId: upiId || undefined,
        bankName: bankName || undefined,
        bankAccountNo: bankAccountNo || undefined,
        bankIfsc: bankIfsc || undefined
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Invitation failure");
    }

    await loadGroupDetails(selectedGroupId);
    await loadDashboard(currentUser.id);
  };

  const handleSettleDebt = async (fromUserId: string, toUserId: string, amount: number, paymentMethod?: string) => {
    if (!currentUser || !selectedGroupId) return;
    const response = await fetch('/api/debts/settle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupId: selectedGroupId,
        fromUserId,
        toUserId,
        amount,
        paymentMethod
      })
    });

    if (!response.ok) throw new Error("Settle resolution failed");

    await loadGroupDetails(selectedGroupId);
    await loadDashboard(currentUser.id);
  };

  const handleCreateGroup = async (name: string, description: string, members: string[]) => {
    if (!currentUser) return;
    const response = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        creatorId: currentUser.id,
        members
      })
    });

    if (!response.ok) throw new Error("Failed to design group");

    await loadDashboard(currentUser.id);
  };

  const handleUpdateProfile = async (
    name: string, 
    avatar: string, 
    upiId: string,
    bankName?: string,
    bankAccountNo?: string,
    bankIfsc?: string
  ) => {
    if (!currentUser) return;
    const response = await fetch('/api/auth/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: currentUser.id,
        name,
        avatar,
        upiId: upiId || undefined,
        bankName: bankName || undefined,
        bankAccountNo: bankAccountNo || undefined,
        bankIfsc: bankIfsc || undefined
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Failed serialization profile");
    }
    const data = await response.json();
    if (data.success && data.user) {
      localStorage.setItem('splitsmart_session', JSON.stringify(data.user));
      setCurrentUser(data.user);
      await loadDashboard(data.user.id);
    }
  };

  // Rendering state switcher

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-dark-void flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-neon-teal animate-spin" />
        <span className="text-xs text-gray-400 font-mono tracking-wider uppercase animate-pulse">Initializing SplitSmart Core</span>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-dark-void flex flex-col md:flex-row relative">
      {/* Sidebar background decoration */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-neon-purple/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-12 left-1/3 w-[350px] h-[350px] bg-neon-teal/5 blur-[100px] pointer-events-none" />

      {/* Persistent Sidebar */}
      <Sidebar 
        user={currentUser} 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedGroupId(null); // Back to overall screen
        }} 
        onLogout={handleLogout}
        onOpenProfile={() => {
          // Send back to dashboard, profile setting triggers from dashboard profileBtn
          setActiveTab('dashboard');
          setSelectedGroupId(null);
          setTimeout(() => {
            const trigger = document.getElementById('profile-edit-trigger');
            if (trigger) trigger.click();
          }, 300);
        }}
      />

      {/* Main Content Pane */}
      <main className="flex-1 px-4 py-20 md:py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full overflow-y-auto">
        {errorMsg && (
          <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between text-xs text-rose-300 font-semibold shadow-md">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg("")} className="text-gray-400 hover:text-white font-mono">✕</button>
          </div>
        )}

        <div className="min-h-[80vh]">
          {selectedGroupId && activeGroupDetails ? (
            <GroupDetail
              groupId={selectedGroupId}
              currentUser={currentUser}
              onBack={() => setSelectedGroupId(null)}
              groupDetails={activeGroupDetails}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
              onInviteMember={handleInviteMember}
              onSettleDebt={handleSettleDebt}
              onDeleteGroup={handleDeleteGroup}
            />
          ) : dashboardData ? (
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                >
                  <Dashboard
                    currentUser={currentUser}
                    groups={dashboardData.groups}
                    allUsers={dashboardData.users}
                    metrics={dashboardData.metrics}
                    onSelectGroup={setSelectedGroupId}
                    onCreateGroup={handleCreateGroup}
                    onUpdateProfile={handleUpdateProfile}
                  />
                </motion.div>
              )}

              {activeTab === 'analytics' && (
                <motion.div
                  key="analytics"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                >
                  <AnalyticsPanel
                    categoryData={dashboardData.analytics.categoryData}
                    monthlyData={dashboardData.analytics.monthlySpending}
                    metrics={dashboardData.metrics}
                  />
                </motion.div>
              )}

              {activeTab === 'premium' && (
                <motion.div
                  key="premium"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                >
                  <PremiumBilling
                    currentUser={currentUser}
                    onRefreshUser={(updated) => {
                      localStorage.setItem("splitsmart_session", JSON.stringify(updated));
                      setCurrentUser(updated);
                    }}
                    setActiveTab={setActiveTab}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-neon-teal animate-spin" />
              <span className="text-xs text-gray-500 font-mono uppercase tracking-widest animate-pulse">Syncing transactions ledger</span>
            </div>
          )}
        </div>
      </main>

      {/* Floating Gemini AI Chat widget */}
      <AIAssistant 
        currentUser={currentUser} 
        activeGroupId={selectedGroupId || undefined} 
      />
    </div>
  );
}
