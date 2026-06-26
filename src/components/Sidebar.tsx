/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  PiggyBank, 
  LayoutDashboard, 
  PieChart, 
  HelpCircle, 
  LogOut, 
  User as UserIcon, 
  TrendingUp, 
  Coins,
  Settings,
  X,
  Sparkles
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onOpenProfile: () => void;
}

export default function Sidebar({ user, activeTab, setActiveTab, onLogout, onOpenProfile }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics', icon: PieChart },
    { id: 'premium', label: 'Pro Upgrade', icon: Sparkles },
  ];

  return (
    <>
      {/* Mobile Glassmorphic Header */}
      <div className="md:hidden w-full bg-dark-void/70 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between fixed top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-neon-purple to-neon-pink flex items-center justify-center glow-purple">
            <Coins className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-neon-teal via-neon-purple to-neon-pink bg-clip-text text-transparent">
            SplitSmart
          </span>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-white"
        >
          {user.avatar ? <span className="text-xl">{user.avatar}</span> : <UserIcon className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0d071c]/90 backdrop-blur-lg border-r border-white/5 h-screen sticky top-0 px-4 py-6 justify-between shrink-0">
        <div className="space-y-8">
          {/* Logo Brand Panel */}
          <div className="flex items-center gap-3 px-2">
            <motion.div 
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.5 }}
              className="w-10 h-10 rounded-xl bg-gradient-to-tr from-neon-purple to-neon-pink flex items-center justify-center glow-purple cursor-pointer shadow-lg"
            >
              <Coins className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="font-extrabold text-lg tracking-tight text-white leading-none">
                SplitSmart
              </h1>
              <span className="text-[10px] text-neon-teal font-mono tracking-widest uppercase">
                Expense Core
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 relative group overflow-hidden ${
                    isActive 
                      ? 'text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="activeNavIndicator"
                      className="absolute inset-0 bg-gradient-to-r from-neon-purple/20 via-neon-pink/10 to-transparent border-l-2 border-neon-purple"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-neon-teal' : 'text-gray-400 group-hover:text-neon-teal'}`} />
                  <span className="relative z-10">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Account Controls */}
        <div className="space-y-4 pt-4 border-t border-white/5">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            onClick={onOpenProfile}
            className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-neon-purple/20 flex items-center justify-center text-2xl border border-neon-purple/30 shadow-inner">
              {user.avatar || '👤'}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-white truncate">{user.name}</h2>
              <p className="text-xs text-gray-400 truncate mt-0.5">{user.upiId || 'No UPI ID'}</p>
            </div>
            <Settings className="w-3.5 h-3.5 text-gray-400 hover:text-neon-teal transition-colors" />
          </motion.div>

          {/* Logout Action */}
          <button
            onClick={onLogout}
            id="logout-btn"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/10 transition-all duration-300"
          >
            <LogOut className="w-4.5 h-4.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer (Glassmorphic panel) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="relative w-80 max-w-[85vw] h-full bg-white p-6 flex flex-col justify-between border-l border-slate-200 z-10"
          >
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-neon-purple to-neon-pink bg-clip-text text-transparent">
                  SplitSmart Menu
                </span>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-500 hover:text-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                        isActive 
                          ? 'bg-gradient-to-r from-neon-purple to-neon-pink text-white shadow-md' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-5 h-5 text-inherit" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div 
                onClick={() => {
                  onOpenProfile();
                  setIsOpen(false);
                }}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-neon-purple/20 flex items-center justify-center text-2xl">
                  {user.avatar || '👤'}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-850">{user.name}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{user.upiId || 'No UPI ID'}</p>
                </div>
              </div>

              <button
                onClick={() => {
                  onLogout();
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
