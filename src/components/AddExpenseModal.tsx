/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Check, IndianRupee, Tag, Users, Percent, HelpCircle } from 'lucide-react';
import { User, SplitStrategy, Expense } from '../types';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: User[];
  currentUser: User;
  onAddExpense: (expenseData: Partial<Expense>) => Promise<void>;
}

const CATEGORIES = [
  "Food", "Rent", "Utilities", "Travel", "Entertainment", "Other"
];

export default function AddExpenseModal({ isOpen, onClose, members, currentUser, onAddExpense }: AddExpenseModalProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [paidBy, setPaidBy] = useState(currentUser.id);
  const [strategy, setStrategy] = useState<SplitStrategy>("equal");
  
  // Track which members are selected for inclusion in the split
  const [selectedMembers, setSelectedMembers] = useState<Record<string, boolean>>({});
  // Track custom manual splits (unequally)
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  // Track custom percentages (percentage strategy)
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  // Track individual contributions (spent amounts) for multi-payer splits
  const [multiPayerSpends, setMultiPayerSpends] = useState<Record<string, string>>({});
  
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize selected members list when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialSelection: Record<string, boolean> = {};
      const initialAmounts: Record<string, string> = {};
      const initialPercentages: Record<string, string> = {};
      const initialMultiSpends: Record<string, string> = {};
      
      const excludePayer = members.length > 1;
      const activeCount = excludePayer ? members.length - 1 : members.length;
      const equalShare = activeCount > 0 ? (100 / activeCount).toFixed(1) : "0";

      members.forEach(m => {
        if (excludePayer) {
          initialSelection[m.id] = m.id !== currentUser.id;
          initialPercentages[m.id] = m.id === currentUser.id ? "0" : equalShare;
        } else {
          initialSelection[m.id] = true;
          initialPercentages[m.id] = equalShare;
        }
        initialAmounts[m.id] = "";
        initialMultiSpends[m.id] = "";
      });

      setSelectedMembers(initialSelection);
      setCustomAmounts(initialAmounts);
      setPercentages(initialPercentages);
      setMultiPayerSpends(initialMultiSpends);
      setDescription("");
      setAmount("");
      setCategory("Food");
      setPaidBy(currentUser.id);
      setStrategy("equal");
      setError("");
    }
  }, [isOpen, members, currentUser]);

  const handlePaidByChange = (newPayerId: string) => {
    setPaidBy(newPayerId);
    
    // Automatically set selected members: set the payer to false, and everyone else to true!
    const excludePayer = members.length > 1;
    const activeCount = excludePayer ? members.length - 1 : members.length;
    const equalShare = activeCount > 0 ? (100 / activeCount).toFixed(1) : "0";

    setSelectedMembers(() => {
      const next: Record<string, boolean> = {};
      members.forEach(m => {
        if (excludePayer) {
          next[m.id] = m.id !== newPayerId;
        } else {
          next[m.id] = true;
        }
      });
      return next;
    });

    setCustomAmounts(prev => {
      const next: Record<string, string> = { ...prev };
      members.forEach(m => {
        if (m.id === newPayerId) {
          next[m.id] = "";
        }
      });
      return next;
    });

    setPercentages(() => {
      const next: Record<string, string> = {};
      members.forEach(m => {
        if (excludePayer) {
          next[m.id] = m.id === newPayerId ? "0" : equalShare;
        } else {
          next[m.id] = equalShare;
        }
      });
      return next;
    });
  };

  if (!isOpen) return null;

  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers(prev => {
      const next = { ...prev, [userId]: !prev[userId] };
      // Prevent unselecting all members
      const activeCount = Object.values(next).filter(Boolean).length;
      if (activeCount === 0) return prev;
      return next;
    });
  };

  const handleCustomAmountChange = (userId: string, val: string) => {
    setCustomAmounts(prev => ({ ...prev, [userId]: val }));
  };

  const handlePercentageChange = (userId: string, val: string) => {
    setPercentages(prev => ({ ...prev, [userId]: val }));
  };

  const handleMultiSpendChange = (userId: string, val: string) => {
    const nextSpends = { ...multiPayerSpends, [userId]: val };
    setMultiPayerSpends(nextSpends);

    // Auto-sum up contribution spends to dynamic total amount
    const sum = members.reduce((acc, m) => {
      const v = parseFloat(nextSpends[m.id]) || 0;
      return acc + v;
    }, 0);
    setAmount(sum > 0 ? sum.toFixed(2) : "");
  };

  const handleStrategyChange = (strat: SplitStrategy) => {
    setStrategy(strat);
    if (strat === "multi_payer") {
      // For multi-payers, we default to everyone checking / visualising equal splits
      const allSelect: Record<string, boolean> = {};
      members.forEach(m => {
        allSelect[m.id] = true;
      });
      setSelectedMembers(allSelect);
    }
  };

  const computeLocalTrades = () => {
    const activeMem = members.filter(m => selectedMembers[m.id]);
    const totalAmount = parseFloat(amount) || 0;
    if (totalAmount <= 0 || activeMem.length === 0) return [];
    
    const share = totalAmount / activeMem.length;
    
    const balances = activeMem.map(m => ({
      userId: m.id,
      name: m.name,
      balance: (parseFloat(multiPayerSpends[m.id]) || 0) - share
    }));
    
    const debtors = balances.filter(b => b.balance < -0.01).map(d => ({ ...d }));
    const creditors = balances.filter(b => b.balance > 0.01).map(c => ({ ...c }));
    
    const trades: { from: string; to: string; amount: number }[] = [];
    let dIdx = 0;
    let cIdx = 0;
    
    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];
      const amountToTrade = Math.min(Math.abs(debtor.balance), creditor.balance);
      
      trades.push({
        from: debtor.name,
        to: creditor.name,
        amount: Math.round(amountToTrade * 100) / 100
      });
      
      debtor.balance += amountToTrade;
      creditor.balance -= amountToTrade;
      
      if (Math.abs(debtor.balance) < 0.01) dIdx++;
      if (Math.abs(creditor.balance) < 0.01) cIdx++;
    }
    
    return trades;
  };

  const distributeRemainingEvenly = () => {
    const totalAmount = parseFloat(amount) || 0;
    if (totalAmount <= 0) return;
    
    const activeMembers = members.filter(m => selectedMembers[m.id]);
    if (activeMembers.length === 0) return;

    let totalDefined = 0;
    const membersToDole: string[] = [];

    activeMembers.forEach(m => {
      const val = parseFloat(customAmounts[m.id]);
      if (!isNaN(val) && val > 0) {
        totalDefined += val;
      } else {
        membersToDole.push(m.id);
      }
    });

    const leftover = totalAmount - totalDefined;
    const targets = (leftover <= 0.01 || membersToDole.length === 0) ? activeMembers.map(m => m.id) : membersToDole;
    const amountToDistribute = (leftover <= 0.01 || membersToDole.length === 0) ? totalAmount : leftover;

    const splitShare = parseFloat((amountToDistribute / targets.length).toFixed(2));
    const nextAmounts = { ...customAmounts };

    targets.forEach((mId, idx) => {
      if (idx === targets.length - 1) {
        const customSumOfOthers = targets.slice(0, -1).reduce((acc, t) => acc + splitShare, 0);
        nextAmounts[mId] = Math.max(0, amountToDistribute - customSumOfOthers).toFixed(2);
      } else {
        nextAmounts[mId] = splitShare.toFixed(2);
      }
    });

    setCustomAmounts(nextAmounts);
  };

  const calculateLiveSplits = (): Record<string, number> => {
    const totalAmount = parseFloat(amount) || 0;
    const activeMembers = members.filter(m => selectedMembers[m.id]);
    const splits: Record<string, number> = {};

    // Initialize all members to 0 first
    members.forEach(m => {
      splits[m.id] = 0;
    });

    if (totalAmount <= 0 || activeMembers.length === 0) return splits;

    if (strategy === "equal" || strategy === "multi_payer") {
      const share = totalAmount / activeMembers.length;
      activeMembers.forEach(m => {
        splits[m.id] = parseFloat(share.toFixed(2));
      });
    } else if (strategy === "unequal") {
      activeMembers.forEach(m => {
        const customVal = parseFloat(customAmounts[m.id]) || 0;
        splits[m.id] = parseFloat(customVal.toFixed(2));
      });
    } else if (strategy === "percentage") {
      activeMembers.forEach(m => {
        const percentVal = parseFloat(percentages[m.id]) || 0;
        const share = (percentVal / 100) * totalAmount;
        splits[m.id] = parseFloat(share.toFixed(2));
      });
    }

    return splits;
  };

  const calculatedSplits = calculateLiveSplits();
  const splitsSum = Object.values(calculatedSplits).reduce((sum, v) => sum + v, 0);
  const discrepancy = Math.abs((parseFloat(amount) || 0) - splitsSum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Please supply an expense description.");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid positive rupee amount.");
      return;
    }

    const activeMembers = members.filter(m => selectedMembers[m.id]);
    if (activeMembers.length === 0) {
      setError("You must select at least one member to split cost.");
      return;
    }

    // Validation for Unequal Splits summing to total amount
    if (strategy === "unequal") {
      if (discrepancy > 0.05) {
        setError(`Manual amounts sum (₹${splitsSum.toFixed(2)}) must exactly equal the total expense (₹${parsedAmount.toFixed(2)}). Discrepancy: ₹${discrepancy.toFixed(2)}.`);
        return;
      }
    }

    // Validation for Percentage splits summing to 100%
    if (strategy === "percentage") {
      const totalPercent = activeMembers.reduce((sum, m) => sum + (parseFloat(percentages[m.id]) || 0), 0);
      if (Math.abs(100 - totalPercent) > 0.1) {
        setError(`All custom percentages must sum to exactly 100%. Current sum: ${totalPercent.toFixed(1)}%`);
        return;
      }
    }

    // Validation for Multi-payer splits
    const payersToSubmit: Record<string, number> = {};
    if (strategy === "multi_payer") {
      members.forEach(m => {
        const spentVal = parseFloat(multiPayerSpends[m.id]) || 0;
        if (spentVal > 0) {
          payersToSubmit[m.id] = spentVal;
        }
      });
      if (Object.keys(payersToSubmit).length === 0) {
        setError("Please enter the spent amount for at least one member.");
        return;
      }
    }

    setError("");
    setIsSubmitting(true);

    try {
      await onAddExpense({
        description,
        amount: parsedAmount,
        category,
        paidBy: strategy === "multi_payer" ? undefined : paidBy,
        splitStrategy: strategy,
        splits: calculatedSplits,
        payers: strategy === "multi_payer" ? payersToSubmit : undefined
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to create expense ledger");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
        className="fixed inset-0 bg-dark-void/80 backdrop-blur-md"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 15, opacity: 0 }}
        className="relative bg-white border border-slate-200 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl z-10 p-6 space-y-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-neon-purple/10 flex items-center justify-center text-neon-purple border border-neon-purple/20">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">Create New Expense</h2>
              <p className="text-xs text-slate-500">Record shared cost & auto-split balances</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount & Description Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                Expense Description
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. Organic Groceries"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-neon-purple focus:ring-1 focus:ring-neon-purple/25 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none transition-all placeholder:text-gray-400 font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Total Amount</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neon-purple text-sm font-semibold">₹</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-neon-purple focus:ring-1 focus:ring-neon-purple/25 rounded-xl pl-8 pr-4 py-3 text-sm font-bold text-slate-800 focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-neon-purple" /> Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-neon-purple focus:outline-none rounded-xl px-4 py-3 text-xs text-slate-800 font-semibold"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Paid By Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-neon-purple" /> Paid By
              </label>
              {strategy === "multi_payer" ? (
                <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-500 font-mono font-bold select-none border-dashed">
                  👥 Joint Payer Contributions (Set below)
                </div>
              ) : (
                <select
                  value={paidBy}
                  onChange={e => handlePaidByChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-neon-purple focus:outline-none rounded-xl px-4 py-3 text-xs text-slate-800 font-semibold"
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} {m.id === currentUser.id ? '(You)' : ''}</option>
                  ))}
                </select>
              )}
              {strategy !== "multi_payer" && (
                <span className="text-[10px] text-neon-purple font-semibold block mt-1">
                  💡 Auto-Split: Choosing who paid automatically excludes them from the split to distribute cost!
                </span>
              )}
            </div>
          </div>

          {/* Split Strategy selection tabs */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Splitting Strategy</label>
            <div className="grid grid-cols-4 gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
              {(['equal', 'unequal', 'percentage', 'multi_payer'] as SplitStrategy[]).map((strat) => (
                <button
                  type="button"
                  key={strat}
                  onClick={() => handleStrategyChange(strat)}
                  className={`py-2 text-[9px] font-black rounded-lg capitalize transition-all cursor-pointer truncate ${
                    strategy === strat 
                      ? 'bg-gradient-to-r from-neon-purple to-neon-pink text-white shadow-md' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {strat === 'equal' ? '⚡ Equally' : strat === 'unequal' ? '💸 Custom' : strat === 'percentage' ? '🧬 % Pct' : '🤝 Joint Pay'}
                </button>
              ))}
            </div>
          </div>

          {/* Member split allocations detail list */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <span className="text-xs font-bold text-slate-700 block mb-1">
              {strategy === "multi_payer" 
                ? "Specify Member Spent Amounts (Who paid how much)" 
                : "Allocate Member Split (Check/uncheck to include)"}
            </span>
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {members.map((m) => {
                const isSelected = !!selectedMembers[m.id];
                const liveShareVal = calculatedSplits[m.id] || 0;
                const userSpent = parseFloat(multiPayerSpends[m.id]) || 0;
                const netBalance = userSpent - liveShareVal;

                return (
                  <div key={m.id} className="flex items-center justify-between gap-4 p-2 rounded-lg hover:bg-slate-100 transition-colors">
                    {/* Checkbox and Member Name */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleMemberSelection(m.id)}
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                          isSelected 
                            ? 'bg-neon-purple border-neon-purple text-white' 
                            : 'border-slate-300 bg-white text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3px]" />
                      </button>
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">{m.avatar || '👤'}</span>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800">{m.name}</span>
                          {strategy === "multi_payer" && isSelected && (
                            <span className="text-[9px] text-slate-500 font-medium">Equally shares: ₹{liveShareVal.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Live Strategy Inputs */}
                    <div className="flex items-center gap-3">
                      {isSelected && strategy === "multi_payer" && (
                        <div className="relative w-28">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            value={multiPayerSpends[m.id] || ""}
                            onChange={e => handleMultiSpendChange(m.id, e.target.value)}
                            placeholder="Spent amount"
                            className="w-full bg-white border border-slate-300 focus:border-neon-purple rounded-lg pl-6 pr-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none placeholder:text-slate-400"
                          />
                        </div>
                      )}

                      {isSelected && strategy === "unequal" && (
                        <div className="relative w-28">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            value={customAmounts[m.id] || ""}
                            onChange={e => handleCustomAmountChange(m.id, e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-white border border-slate-300 focus:border-neon-purple rounded-lg pl-6 pr-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                          />
                        </div>
                      )}

                      {isSelected && strategy === "percentage" && (
                        <div className="relative w-28">
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">%</span>
                          <input
                            type="number"
                            step="1"
                            value={percentages[m.id] || ""}
                            onChange={e => handlePercentageChange(m.id, e.target.value)}
                            placeholder="0"
                            className="w-full bg-white border border-slate-300 focus:border-neon-teal rounded-lg pl-3 pr-6 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                          />
                        </div>
                      )}

                      {/* Display computed share cost or net status */}
                      {strategy === "multi_payer" ? (
                        isSelected && (
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full select-none ${
                            netBalance > 0.01
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              : netBalance < -0.01
                                ? 'bg-amber-50 text-amber-600 border border-amber-200'
                                : 'bg-slate-100 text-slate-500'
                          }`}>
                            {netBalance > 0.01
                              ? `Gets ₹${netBalance.toFixed(2)}`
                              : netBalance < -0.01
                                ? `Owes ₹${Math.abs(netBalance).toFixed(2)}`
                                : 'Settled'
                            }
                          </span>
                        )
                      ) : (
                        <span className="text-xs font-black font-mono text-neon-teal select-none">
                          ₹{liveShareVal.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {strategy === "multi_payer" && (
              <div className="bg-neon-purple/5 p-4 rounded-xl border border-neon-purple/20 space-y-2 mt-2">
                <span className="text-[10px] font-extrabold text-neon-purple flex items-center gap-1.5 uppercase tracking-wider font-mono">
                  🤝 REALTIME SETTLEMENT TRANSACTION MAP
                </span>
                <p className="text-[10px] text-slate-500 font-medium leading-normal">
                  Calculate amount equally (₹{((parseFloat(amount) || 0) / (members.filter(m => selectedMembers[m.id]).length || 1)).toFixed(2)} each) and simplify settlement. Collect remaining amounts to pay back those who spent more than their share:
                </p>
                {computeLocalTrades().length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    {computeLocalTrades().map((trade, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[10px] font-bold text-slate-700 bg-white/70 px-3 py-2 rounded-lg border border-slate-150 shadow-sm">
                        <span className="text-rose-600 font-extrabold">{trade.from}</span>
                        <span className="text-slate-400 font-normal">pays</span>
                        <span className="text-emerald-600 font-extrabold">{trade.to}</span>
                        <span className="ml-auto font-mono text-neon-purple font-black">₹{trade.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[9px] text-slate-400 font-bold italic bg-white/40 p-2.5 rounded-lg text-center border border-dashed border-slate-200">
                    💡 Please enter who spent what in the input fields above to visualize the transaction map!
                  </div>
                )}
              </div>
            )}

            {strategy === "unequal" && (
              <div className="flex justify-between items-center bg-neon-purple/5 p-2.5 rounded-lg border border-neon-purple/10">
                <span className="text-[10px] text-slate-600 font-bold">Unbalanced shares? Let the calculator automatically assign the remainder!</span>
                <button
                  type="button"
                  onClick={distributeRemainingEvenly}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-[10px] font-black text-neon-purple border border-neon-purple/30 rounded-md shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  ⚡ Auto-Split Remainder
                </button>
              </div>
            )}

            {/* Sum comparison feedback in non-equals */}
            {strategy !== 'equal' && (
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-500 font-bold">Sum of splits: ₹{splitsSum.toFixed(2)}</span>
                <span className={`${discrepancy < 0.05 ? 'text-neon-teal font-extrabold' : 'text-neon-pink font-extrabold'}`}>
                  {discrepancy < 0.05 ? '✅ Balanced Match' : `❌ Needs ₹{discrepancy.toFixed(2)} difference`}
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-xs font-bold py-3.5 rounded-xl border border-slate-200 text-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-expense-btn"
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-neon-purple to-neon-pink text-white font-extrabold text-xs py-3.5 rounded-xl shadow-lg glow-purple cursor-pointer hover:opacity-95 transition-all text-center flex items-center justify-center"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> Recording...
                </span>
              ) : "Create Expense Item"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
