/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string; // URL or emoji-based avatar prefix
  upiId?: string; // UPI ID for reminders, e.g. "sarah@okhdfcbank"
  bankName?: string; // Bank name for settlements
  bankAccountNo?: string; // Bank account number
  bankIfsc?: string; // Bank IFSC code
  subscription?: 'free' | 'premium'; // user subscription status (free, premium)
}

export type SplitStrategy = 'equal' | 'unequal' | 'percentage' | 'multi_payer';

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  date: string; // ISO string or YYYY-MM-DD
  category: string; // e.g. "Food", "Rent", "Utilities", "Travel", "Entertainment", "Other"
  paidBy: string; // User ID of primary payer / fallback
  splitStrategy: SplitStrategy;
  splits: Record<string, number>; // Maps User ID -> Amount owed
  payers?: Record<string, number>; // Maps User ID -> Amount paid (for multi-payer bills)
}

export interface Debt {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  members: string[]; // List of User IDs
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}
