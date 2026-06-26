/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';
import { motion } from 'motion/react';
import { PieChart as PieIcon, LineChart, ShieldAlert, Award, PiggyBank, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface CategoryData {
  name: string;
  value: number;
}

interface MonthlyData {
  month: string;
  amount: number;
}

interface AnalyticsPanelProps {
  categoryData: CategoryData[];
  monthlyData: MonthlyData[];
  metrics: {
    netOverallBalance: number;
    totalOwedToYou: number;
    totalYouOwe: number;
  };
}

const COLORS = [
  '#9d4edf', // Neon Purple
  '#00f5d4', // Neon Teal
  '#ff007f', // Neon Pink
  '#04d9ff', // Neon Blue
  '#ffb703', // Neon Gold/Yellow
  '#90be6d'  // Soft Green
];

export default function AnalyticsPanel({ categoryData, monthlyData, metrics }: AnalyticsPanelProps) {
  const totalUserSpending = categoryData.reduce((sum, item) => sum + item.value, 0);

  // Find max categories
  const sortedCategories = [...categoryData].sort((a,b) => b.value - a.value);
  const highestCategory = sortedCategories[0]?.name || "N/A";
  const highestCategoryAmount = sortedCategories[0]?.value || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Spending & Debt Analytics</h2>
        <p className="text-xs text-slate-500 font-bold">Deep-dive visual analysis of your shared ledger accounts</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between overflow-hidden relative group shadow-sm"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-neon-purple/5 to-transparent pointer-events-none" />
          <div className="space-y-2">
            <span className="text-xs text-slate-550 font-black block">Total Shared Spending</span>
            <span className="text-2xl font-black text-slate-850 font-mono leading-none">₹{totalUserSpending.toFixed(2)}</span>
            <p className="text-[10px] text-slate-500 font-bold">Your actual net shared cost responsibility</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-neon-purple/10 text-neon-purple flex items-center justify-center border border-neon-purple/20 shadow-sm">
            <PiggyBank className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between overflow-hidden relative group shadow-sm"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-neon-teal/5 to-transparent pointer-events-none" />
          <div className="space-y-2">
            <span className="text-xs text-neon-teal font-extrabold block">Highest Shared Category</span>
            <span className="text-xl font-black text-slate-805 leading-none truncate block max-w-40">{highestCategory}</span>
            <p className="text-xs font-bold text-slate-600 font-mono">₹{highestCategoryAmount.toFixed(2)} spent</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-neon-teal/10 text-neon-teal flex items-center justify-center border border-neon-teal/20 shadow-sm">
            <Award className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between overflow-hidden relative group shadow-sm"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-neon-pink/5 to-transparent pointer-events-none" />
          <div className="space-y-2">
            <span className="text-xs text-neon-pink font-extrabold block">Overall Net Status</span>
            <span className={`text-xl font-black font-mono leading-none ${metrics.netOverallBalance >= 0 ? 'text-neon-teal' : 'text-neon-pink'}`}>
              {metrics.netOverallBalance >= 0 ? `+₹${metrics.netOverallBalance.toFixed(2)}` : `-₹${Math.abs(metrics.netOverallBalance).toFixed(2)}`}
            </span>
            <p className="text-[10px] text-slate-500 mt-1 font-bold">
              {metrics.netOverallBalance >= 0 ? "You are a net creditor" : "You have net pending balances"}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm ${
            metrics.netOverallBalance >= 0 
              ? 'bg-neon-teal/10 border-neon-teal/20 text-neon-teal' 
              : 'bg-neon-pink/10 border-neon-pink/20 text-neon-pink'
          }`}>
            {metrics.netOverallBalance >= 0 ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown (Pie) */}
        <div id="analytics-categories" className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <PieIcon className="w-5 h-5 text-neon-purple" />
            <h3 className="text-sm font-extrabold text-slate-800">Expense Category Breakdown</h3>
          </div>

          {categoryData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-center">
              <ShieldAlert className="w-10 h-10 text-slate-400" />
              <p className="text-xs text-slate-550 font-bold">No category allocation record yet.<br />Add some expenses to check the visual metrics!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div className="sm:col-span-2 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                      itemStyle={{ color: '#0f172a', fontSize: '11px', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legends Table */}
              <div className="space-y-2">
                {categoryData.map((item, index) => {
                  const percentage = totalUserSpending > 0 ? ((item.value / totalUserSpending) * 100).toFixed(1) : "0";
                  return (
                    <div key={item.name} className="flex items-center justify-between text-xs font-bold gap-1.5 p-1.5 rounded-lg hover:bg-slate-50">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-3.5 h-3.5 rounded-md shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-slate-600 truncate">{item.name}</span>
                      </div>
                      <span className="text-slate-800 font-mono shrink-0 font-extrabold">{percentage}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Monthly spending trend */}
        <div id="analytics-trend" className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <LineChart className="w-5 h-5 text-neon-purple" />
            <h3 className="text-sm font-extrabold text-slate-800">Monthly Shared Cost Trend</h3>
          </div>

          {monthlyData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-center">
              <ShieldAlert className="w-10 h-10 text-slate-400" />
              <p className="text-xs text-slate-500 font-bold">No timeline data available on the server ledger.</p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="105%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis 
                    dataKey="month" 
                    stroke="#64748b" 
                    fontSize={10} 
                    fontFamily="monospace"
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={10} 
                    fontFamily="monospace"
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }} 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    itemStyle={{ color: '#1a4f9c', fontSize: '11px', fontWeight: 'bold' }}
                    labelStyle={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                    {monthlyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="url(#purplePinkGlow)" />
                    ))}
                  </Bar>
                  <defs>
                    <linearGradient id="purplePinkGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1a4f9c" />
                      <stop offset="100%" stopColor="#ff6b00" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
