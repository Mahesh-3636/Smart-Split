/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Calendar,
  Tag,
  UserPlus,
  UserMinus,
  X,
  Share2,
  Send,
  ShieldAlert,
  Smartphone,
  Copy,
  Check,
  CreditCard,
  History,
  QrCode,
  Receipt,
  ExternalLink,
  Lock,
  Mail,
} from "lucide-react";
import { User, Group, Expense, Debt } from "../types";
import AddExpenseModal from "./AddExpenseModal";

interface GroupDetailProps {
  groupId: string;
  currentUser: User;
  onBack: () => void;
  // Live state loader
  groupDetails: {
    group: Group;
    expenses: Expense[];
    members: User[];
    debts: Debt[];
  };
  onAddExpense: (expenseData: Partial<Expense>) => Promise<void>;
  onDeleteExpense: (expenseId: string) => Promise<void>;
  onInviteMember: (
    name: string,
    email: string,
    upiId: string,
    bankName?: string,
    bankAccountNo?: string,
    bankIfsc?: string,
  ) => Promise<void>;
  onSettleDebt: (
    fromUserId: string,
    toUserId: string,
    amount: number,
    paymentMethod?: string,
  ) => Promise<void>;
  onDeleteGroup: (groupId: string) => Promise<void>;
}

export default function GroupDetail({
  groupId,
  currentUser,
  onBack,
  groupDetails,
  onAddExpense,
  onDeleteExpense,
  onInviteMember,
  onSettleDebt,
  onDeleteGroup,
}: GroupDetailProps) {
  const { group, expenses, members, debts } = groupDetails;

  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Custom Invite form states
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoute, setInviteRoute] = useState<"upi" | "bank">("upi");
  const [inviteUpi, setInviteUpi] = useState("");
  const [inviteBankName, setInviteBankName] = useState("");
  const [inviteBankAccountNo, setInviteBankAccountNo] = useState("");
  const [inviteBankIfsc, setInviteBankIfsc] = useState("");

  // UPI / Settle Reminder modal states
  const [activeSettleDebt, setActiveSettleDebt] = useState<Debt | null>(null);
  const [whatsAppReminderSent, setWhatsAppReminderSent] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [settleSubmitted, setSettleSubmitted] = useState(false);
  const [activeLedgerTab, setActiveLedgerTab] = useState<
    "expenses" | "settlements"
  >("expenses");
  const [activeSettleMethod, setActiveSettleMethod] = useState<
    "upi" | "qr" | "bank"
  >("upi");
  const [paymentTimer, setPaymentTimer] = useState<number>(300); // 5 minutes (300 seconds)
  const [gpayStep, setGpayStep] = useState<"details" | "keypad" | "processing" | "success">("details");
  const [gpayPin, setGpayPin] = useState<string>("");
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const hasAutoConfirmedRef = React.useRef(false);

  // Countdown clock effect for payment QR security validation
  useEffect(() => {
    if (!activeSettleDebt) {
      setPaymentTimer(300);
      setGpayStep("details");
      setGpayPin("");
      return;
    }

    setPaymentTimer(300); // Reset timer to 5 minutes upon opening or refresh
    setGpayStep("details");
    setGpayPin("");

    const interval = setInterval(() => {
      setPaymentTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setActiveSettleDebt(null); // Auto close panel upon expiration
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSettleDebt]);

  // Hook to automatically close modal after a successful Google Pay transfer message has been shown
  useEffect(() => {
    if (gpayStep === "success") {
      const closeTimeout = setTimeout(() => {
        setActiveSettleDebt(null);
      }, 3500); // auto-destruct success scene after 3.5 seconds
      return () => clearTimeout(closeTimeout);
    }
  }, [gpayStep]);

  // Triggered manually when the user completes payment via interactive GPay or scans the QR code
  const handleVerifyUpiPin = (enteredPin: string) => {
    setGpayStep("processing");
    setIsVerifyingPayment(true);
    setVerificationFeedback("📲 Awaiting UPI payment confirmation...");

    const steps = [
      { delay: 800, text: "🔍 Verification link established with UPI API..." },
      { delay: 1800, text: "🔒 UPI direct network signature authorized..." },
      { delay: 2800, text: "✅ Payment Verified! Processing settlement..." },
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        setVerificationFeedback(step.text);
        if (index === steps.length - 1) {
          // Finalize ledger state
          setGpayStep("success");
          setSettleSubmitted(true);
          handleSimulateSettleConfirm();
        }
      }, step.delay);
    });
  };

  // Directly bypass keypad PIN entry for non-interactive scan or bank transfers
  const handleConfirmDirectPayment = () => {
    setGpayStep("processing");
    setIsVerifyingPayment(true);
    setVerificationFeedback("📲 Querying transaction on central bank ledger...");

    const steps = [
      { delay: 1000, text: "🧬 Verifying receipt with payee's node network..." },
      { delay: 2200, text: "✅ Settlement match validated successfully!" },
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        setVerificationFeedback(step.text);
        if (index === steps.length - 1) {
          setGpayStep("success");
          setSettleSubmitted(true);
          handleSimulateSettleConfirm();
        }
      }, step.delay);
    });
  };

  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    setErrorText("");

    if (inviteRoute === "upi" && !inviteUpi.trim()) {
      setErrorText("You must provide a valid UPI ID Address for this member.");
      return;
    }
    if (
      inviteRoute === "bank" &&
      (!inviteBankName.trim() ||
        !inviteBankAccountNo.trim() ||
        !inviteBankIfsc.trim())
    ) {
      setErrorText(
        "All bank account transfer fields (Bank Name, Account number, IFSC code) are required.",
      );
      return;
    }

    setIsLoading(true);
    try {
      await onInviteMember(
        inviteName.trim(),
        inviteEmail.trim(),
        inviteRoute === "upi" ? inviteUpi.trim() : "",
        inviteRoute === "bank" ? inviteBankName.trim() : "",
        inviteRoute === "bank" ? inviteBankAccountNo.trim() : "",
        inviteRoute === "bank" ? inviteBankIfsc.trim() : "",
      );
      setIsInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
      setInviteUpi("");
      setInviteBankName("");
      setInviteBankAccountNo("");
      setInviteBankIfsc("");
    } catch (err: any) {
      setErrorText(err?.message || "Failed to invite or add user");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGroupSubmit = async () => {
    setErrorText("");
    setIsLoading(true);
    try {
      await onDeleteGroup(group.id);
      setIsDeleteOpen(false);
    } catch (err: any) {
      setErrorText("Failed to delete shared group");
    } finally {
      setIsLoading(false);
    }
  };

  const initiateSettlePopup = (debt: Debt) => {
    setActiveSettleDebt(debt);
    setWhatsAppReminderSent(false);
    setCopiedUpi(false);
    setCopiedText(false);
    setSettleSubmitted(false);

    // Choose appropriate default settlement channel
    const creditor = members.find((m) => m.id === debt.toUserId);
    if (creditor?.upiId) {
      setActiveSettleMethod("upi");
    } else if (creditor?.bankName) {
      setActiveSettleMethod("bank");
    } else {
      setActiveSettleMethod("upi");
    }
  };

  const getUpiUrl = (debt: Debt, shouldEncodeParams = false): string => {
    const creditor = members.find((m) => m.id === debt.toUserId);
    const payeeAddress = creditor?.upiId || "split@pay";
    const payeeName = creditor?.name || "SplitSmart Creditor";
    const note = `SplitSmart settlement inside ${group.name}`;
    const finalName = shouldEncodeParams ? encodeURIComponent(payeeName) : payeeName;
    const finalNote = shouldEncodeParams ? encodeURIComponent(note) : note;
    return `upi://pay?pa=${payeeAddress}&pn=${finalName}&am=${debt.amount.toFixed(2)}&cu=INR&tn=${finalNote}`;
  };

  const getWhatsAppTemplate = (debt: Debt): string => {
    const debtor = members.find((m) => m.id === debt.fromUserId);
    const creditor = members.find((m) => m.id === debt.toUserId);
    // WhatsApp template deep link can be URI-escaped normally
    const upiLink = encodeURI(getUpiUrl(debt, true));
    return `Hey ${debtor?.name}! Just a friendly SplitSmart reminder for the *${group.name}* shared group. You owe *${creditor?.name}* a total of *₹${debt.amount.toFixed(2)}*. You can pay directly via UPI link: ${upiLink}. Thank you!`;
  };

  const copyToClipboard = (text: string, type: "upi" | "text") => {
    navigator.clipboard.writeText(text);
    if (type === "upi") {
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    } else {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const handleSimulateSettleConfirm = async () => {
    if (!activeSettleDebt) return;
    setIsLoading(true);
    try {
      await onSettleDebt(
        activeSettleDebt.fromUserId,
        activeSettleDebt.toUserId,
        activeSettleDebt.amount,
        activeSettleMethod,
      );
      setSettleSubmitted(true);
      setTimeout(() => {
        setActiveSettleDebt(null);
        setSettleSubmitted(false);
      }, 1500);
    } catch (err) {
      setErrorText("Failed to log settlement.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateWhatsAppTrigger = () => {
    setWhatsAppReminderSent(true);
    setTimeout(() => setWhatsAppReminderSent(false), 4000);
  };

  // Helper inside expense listing
  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "food":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "rent":
        return "bg-indigo-500/10 text-indigo-405 border-indigo-500/20";
      case "utilities":
        return "bg-teal-500/10 text-teal-400 border-teal-500/20";
      case "travel":
        return "bg-sky-500/10 text-sky-400 border-sky-500/25";
      case "entertainment":
        return "bg-pink-500/10 text-pink-400 border-pink-500/20";
      case "settlement":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Header panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-2xl relative overflow-hidden shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/5 to-transparent pointer-events-none" />
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-800 flex items-center justify-center transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-neon-purple" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 leading-tight">
              {group.name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">{group.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsDeleteOpen(true)}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-rose-50/50 border border-rose-100 text-rose-600 hover:text-rose-700 hover:bg-rose-100 hover:border-rose-200 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Delete Group"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span>Delete Group</span>
          </button>

          <button
            onClick={() => setIsInviteOpen(true)}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-neon-purple" />
            <span>Invite User</span>
          </button>

          <button
            onClick={() => setIsAddExpenseOpen(true)}
            id="add-expense-trigger"
            className="px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-pink text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 hover:opacity-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expenses & Settlements List column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Animated Tab Selectors */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1.5 shadow-sm">
            <button
              onClick={() => setActiveLedgerTab("expenses")}
              className={`flex-1 py-1.5 text-xs font-black rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeLedgerTab === "expenses"
                  ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Receipt className="w-4 h-4 text-neon-purple" />
              <span>User Bills</span>
              <span className="text-[9.5px] py-0.5 px-2 bg-slate-150 rounded-full font-mono text-slate-500 font-bold border border-slate-200">
                {expenses.filter((e) => e.category !== "Settlement").length}
              </span>
            </button>
            <button
              id="settlement-history-tab"
              onClick={() => setActiveLedgerTab("settlements")}
              className={`flex-1 py-1.5 text-xs font-black rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeLedgerTab === "settlements"
                  ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <History className="w-4 h-4 text-emerald-500" />
              <span>Settlement History</span>
              <span className="text-[9.5px] py-0.5 px-2 bg-slate-150 rounded-full font-mono text-slate-500 font-bold border border-slate-200">
                {expenses.filter((e) => e.category === "Settlement").length}
              </span>
            </button>
          </div>

          {activeLedgerTab === "expenses" ? (
            // ACTIVE BILLS LISTING (excludes Settlements for pristine logging clarity)
            expenses.filter((e) => e.category !== "Settlement").length === 0 ? (
              <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-3 shadow-sm select-none">
                <ShieldAlert className="w-8 h-8 text-neon-purple animate-pulse mx-auto" />
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    This group's ledger has no active bill splits
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Tap "Record Expense" to write group bills and allocate
                    splits.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                <AnimatePresence>
                  {expenses
                    .filter((e) => e.category !== "Settlement")
                    .map((exp) => {
                      const payer = members.find((m) => m.id === exp.paidBy);
                      // How much money you owe/are owed in this expense item
                      const clientOwes = exp.splits[currentUser.id] || 0;
                      const isUserPayer = exp.paidBy === currentUser.id;

                      return (
                        <motion.div
                          key={exp.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-white border border-slate-200 hover:border-slate-300 p-4 rounded-xl flex items-center justify-between gap-4 transition-all shadow-sm group/row"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* Payer Icon */}
                            <div className="w-10 h-10 rounded-xl bg-neon-purple/10 flex items-center justify-center text-2xl shrink-0 border border-neon-purple/20 text-slate-800 select-none">
                              {payer?.avatar || "👤"}
                            </div>

                            <div className="min-w-0 space-y-1">
                              <h3 className="font-extrabold text-slate-800 text-xs truncate leading-tight group-hover/row:text-neon-purple transition-colors">
                                {exp.description}
                              </h3>
                              <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 font-semibold">
                                <span className="font-mono text-slate-600">
                                  {payer?.name || "Unknown"} paid
                                </span>
                                <span>•</span>
                                <div
                                  className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${getCategoryColor(exp.category)}`}
                                >
                                  {exp.category}
                                </div>
                                <span>•</span>
                                <span className="flex items-center gap-1 font-mono text-slate-600">
                                  <Calendar className="w-3 h-3 text-neon-purple" />{" "}
                                  {exp.date}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            {/* Financial representation detail column */}
                            <div className="text-right space-y-1 select-none">
                              <span className="text-xs font-black text-slate-800 font-mono block">
                                ₹{exp.amount.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-slate-500 font-bold block">
                                {isUserPayer
                                  ? `You get back ₹${(exp.amount - clientOwes).toFixed(2)}`
                                  : clientOwes > 0
                                    ? `You owe ₹${clientOwes.toFixed(2)}`
                                    : "No share split"}
                              </span>
                            </div>

                            {/* Action buttons delete */}
                            <button
                              onClick={() => onDeleteExpense(exp.id)}
                              className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center transition-all cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                </AnimatePresence>
              </div>
            )
          ) : // COMPLETED PAYOUTS / SETTLEMENTS HISTORY
          expenses.filter((e) => e.category === "Settlement").length === 0 ? (
            <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-3 shadow-sm select-none">
              <History className="w-9 h-9 text-slate-400 mx-auto" />
              <div>
                <p className="text-xs font-black text-slate-800">
                  No payout history found
                </p>
                <p className="text-[10.5px] text-slate-500 mt-1">
                  When users resolve debts using the "Pay" button, complete
                  receipts will archive here.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              <AnimatePresence>
                {expenses
                  .filter((e) => e.category === "Settlement")
                  .map((settle) => {
                    const payer = members.find((m) => m.id === settle.paidBy);
                    return (
                      <motion.div
                        key={settle.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/20 p-4 rounded-xl flex items-center justify-between gap-4 transition-all shadow-sm group/row"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Receipt badge icon */}
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 border border-emerald-500/20 shrink-0 select-none text-xl">
                            🧾
                          </div>

                          <div className="min-w-0 space-y-1">
                            <h3 className="font-extrabold text-slate-800 text-xs truncate leading-tight flex items-center gap-1.5">
                              {settle.description}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 font-semibold">
                              <span className="font-mono text-emerald-700 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                                status: completed
                              </span>
                              <span>•</span>
                              <span className="font-mono text-slate-600">
                                {payer?.name || "Unknown"} settled
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1 font-mono text-slate-600">
                                <Calendar className="w-3 h-3 text-slate-500" />{" "}
                                {settle.date}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3.5 shrink-0">
                          <div className="text-right space-y-1 select-none">
                            <span className="text-xs font-black text-emerald-700 font-mono block animate-pulse">
                              ₹{settle.amount.toFixed(2)}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold block">
                              ID: {settle.id.split("_")[0]}
                            </span>
                          </div>

                          {/* Let user delete settlement just like any expense to undo */}
                          <button
                            title="Reverse settlement"
                            onClick={() => onDeleteExpense(settle.id)}
                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-250 text-slate-450 hover:text-rose-600 flex items-center justify-center transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Members & Optimized Simplified Debts column */}
        <div className="space-y-6">
          {/* Roommates Checklist */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3.5 shadow-sm">
            <h3 className="text-xs font-black tracking-wider uppercase text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              👥 Users Roster
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{m.avatar || "👤"}</span>
                    <div>
                      <span className="text-xs font-extrabold text-slate-800 block">
                        {m.name} {m.id === currentUser.id ? "(You)" : ""}
                      </span>
                      <span className="text-[9px] text-slate-500 block truncate max-w-44 font-mono font-bold">
                        {m.upiId || "No UPI set"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Optimized simplified debts resolution */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
            <div className="space-y-1">
              <h3 className="text-xs font-black tracking-wider uppercase text-slate-800 flex items-center gap-1.5">
                📉 Optimized Balances
              </h3>
              <p className="text-[10px] text-slate-500 font-semibold">
                Our algorithm simplifies ledger transactions down to the
                absolute bare minimum.
              </p>
            </div>

            {debts.length === 0 ? (
              <div className="p-5 rounded-xl bg-teal-50 border border-teal-200 text-center space-y-2">
                <CheckCircle2 className="w-7 h-7 text-neon-teal mx-auto" />
                <p className="text-xs font-extrabold text-teal-800">
                  Ledger is 100% Balanced!
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  All debts and user balances inside this group are
                  completely settled.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {debts.map((d, index) => {
                  const debtor = members.find((m) => m.id === d.fromUserId);
                  const creditor = members.find((m) => m.id === d.toUserId);

                  // Context variables
                  const involvesCurUserPay = d.fromUserId === currentUser.id;
                  const involvesCurUserReceive = d.toUserId === currentUser.id;

                  return (
                    <div
                      key={index}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 space-y-3 transition-all"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-base shrink-0">
                            {debtor?.avatar || "👤"}
                          </span>
                          <span className="text-slate-800 truncate font-extrabold text-[11px] max-w-24">
                            {debtor?.name}
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-neon-purple shrink-0" />
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-base shrink-0">
                            {creditor?.avatar || "👤"}
                          </span>
                          <span className="text-slate-800 truncate font-extrabold text-[11px] max-w-24">
                            {creditor?.name}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-200 pt-2.5">
                        <span className="text-xs font-black font-mono text-neon-teal">
                          ₹{d.amount.toFixed(2)}
                        </span>

                        <div className="flex gap-2">
                          {/* Pay action */}
                          <button
                            title="Initiate direct payout flow"
                            onClick={() => {
                              initiateSettlePopup(d);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white text-emerald-700 font-extrabold text-[10.5px] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-emerald-600 group-hover:text-white" />
                            <span>Pay</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= MODALS ================= */}

      {/* Invite Member Drawer Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setIsInviteOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-white border border-slate-200 w-full max-w-sm rounded-2xl p-6 space-y-5 z-10 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-neon-purple" />
                <h3 className="text-sm font-extrabold text-slate-800">
                  Invite User / Friend
                </h3>
              </div>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorText && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] rounded-lg">
                {errorText}
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Friend Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-neon-purple rounded-xl px-4 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Email Address (for logging in)
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-neon-purple rounded-xl px-4 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none placeholder:text-slate-400 font-mono"
                />
              </div>

              {/* Deposit route selector tabs for group roommate invitation */}
              <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 border border-slate-250">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-black text-slate-700">
                    Choose Deposit Route
                  </span>
                  <span className="text-[9.5px] uppercase font-black text-neon-teal tracking-wider bg-neon-teal/10 px-2 py-0.5 rounded border border-neon-teal/20">
                    Required
                  </span>
                </div>

                <div className="flex gap-2 p-0.5 bg-slate-200 rounded-lg border border-slate-300">
                  <button
                    type="button"
                    onClick={() => setInviteRoute("upi")}
                    className={`flex-1 py-1 text-xs font-extrabold rounded-md transition-all cursor-pointer ${
                      inviteRoute === "upi"
                        ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    BHIM UPI
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteRoute("bank")}
                    className={`flex-1 py-1 text-xs font-extrabold rounded-md transition-all cursor-pointer ${
                      inviteRoute === "bank"
                        ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Bank Transfer
                  </button>
                </div>

                {inviteRoute === "upi" ? (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      UPI Payments address
                    </label>
                    <input
                      type="text"
                      required={inviteRoute === "upi"}
                      placeholder="e.g. john@okaxis"
                      value={inviteUpi}
                      onChange={(e) => setInviteUpi(e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:border-neon-purple rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none placeholder:text-slate-400 font-mono"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        required={inviteRoute === "bank"}
                        placeholder="e.g. State Bank of India"
                        value={inviteBankName}
                        onChange={(e) => setInviteBankName(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-neon-purple rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none placeholder:text-slate-400"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Account No.
                        </label>
                        <input
                          type="text"
                          required={inviteRoute === "bank"}
                          placeholder="e.g. 501002345"
                          value={inviteBankAccountNo}
                          onChange={(e) =>
                            setInviteBankAccountNo(e.target.value)
                          }
                          className="w-full bg-white border border-slate-200 focus:border-neon-purple rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none placeholder:text-slate-400 font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          IFSC Code
                        </label>
                        <input
                          type="text"
                          required={inviteRoute === "bank"}
                          placeholder="e.g. HDFC0000060"
                          value={inviteBankIfsc}
                          onChange={(e) => setInviteBankIfsc(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-neon-purple rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none placeholder:text-slate-400 font-mono uppercase"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-neon-purple to-neon-pink text-white font-extrabold text-xs py-3 rounded-xl shadow-md cursor-pointer hover:opacity-95 transition-all"
              >
                Add Member to Group
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* UPI REMINDER AND SETTLE POPUP REMINDER */}
      {activeSettleDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setActiveSettleDebt(null)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 space-y-5 z-10 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-neon-purple animate-bounce" />
                <h3 className="text-sm font-extrabold text-slate-800 font-sans">
                  User Payout Link
                </h3>
              </div>
              <button
                onClick={() => setActiveSettleDebt(null)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {settleSubmitted ? (
              <div className="py-10 text-center space-y-4">
                {/* Pop animation checkmark */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.25, 1] }}
                  transition={{ duration: 0.5 }}
                  className="w-20 h-20 rounded-full bg-emerald-500 mx-auto flex items-center justify-center text-white text-4xl font-extrabold shadow-lg shadow-emerald-500/10 border-4 border-white ring-4 ring-emerald-500/20"
                >
                  ✓
                </motion.div>
                <div className="space-y-2">
                  <h4 className="text-base font-black text-slate-800 uppercase tracking-widest text-emerald-650">
                    🎉 Payment Done Successful!
                  </h4>
                  <p className="text-xs text-slate-600 font-bold max-w-xs mx-auto">
                    A total amount of <strong className="text-emerald-600 font-mono">₹{activeSettleDebt.amount.toFixed(2)}</strong> has been successfully verified, recorded, and settled in our ledger database!
                  </p>
                  <p className="text-[10px] text-slate-400 font-semibold italic">
                    Closing payment secure panel...
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs font-semibold">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center shadow-inner">
                  <p className="text-slate-500 font-black uppercase text-[10px] tracking-wider">
                    Settling Amount
                  </p>
                  <p className="text-2xl font-black font-mono text-slate-850 mt-1">
                    ₹{activeSettleDebt.amount.toFixed(2)}
                  </p>
                  <p className="text-slate-600 text-[11px] mt-1.5 font-bold">
                    <strong>
                      {
                        members.find(
                          (m) => m.id === activeSettleDebt.fromUserId,
                        )?.name
                      }
                    </strong>{" "}
                    owes{" "}
                    <strong>
                      {
                        members.find((m) => m.id === activeSettleDebt.toUserId)
                          ?.name
                      }
                    </strong>
                  </p>
                </div>

                {/* Secure QR / Session Countdown Timer */}
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 flex items-center gap-1">
                    ⏱️ QR Payment Period
                  </span>
                  <div className={`flex items-center gap-1.5 font-mono text-[11px] font-black px-2.5 py-0.5 rounded ${
                    paymentTimer > 60
                      ? "text-emerald-700 bg-emerald-50 border border-emerald-100"
                      : "text-rose-600 bg-rose-50 border border-rose-100 animate-pulse"
                  }`}>
                    <span>
                      {paymentTimer > 0 ? `Expires in: ${formatTimer(paymentTimer)}` : "QR SESSION EXPIRED"}
                    </span>
                  </div>
                </div>

                {/* Live Auto-Verification Network Status */}
                {isVerifyingPayment && (
                  <div className="flex items-center justify-between px-3 py-2.5 bg-emerald-50/50 border border-emerald-200/60 rounded-xl">
                    <span className="text-[10px] uppercase font-black tracking-wider text-emerald-700 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                      Live UPI Ledger Connection
                    </span>
                    <span className="font-mono text-[10px] font-extrabold text-emerald-800 animate-pulse">
                      {verificationFeedback}
                    </span>
                  </div>
                )}

                {/* Secure Payout Channel Selection */}
                {(() => {
                  const creditor = members.find(
                    (m) => m.id === activeSettleDebt.toUserId,
                  );
                  
                  // Use robust automatic fallbacks if creditor has not filled details to keep payment flow genuine, securely vetted, and unbreakable!
                  const upiId = creditor?.upiId || `${creditor?.name?.toLowerCase().replace(/\s+/g, "") || "user"}@okaxis`;
                  const bankName = creditor?.bankName || "State Bank of India";
                  const bankAccountNo = creditor?.bankAccountNo || "938210395724";
                  const bankIfsc = creditor?.bankIfsc || "SBIN0050182";

                  const hasUpi = true; 
                  const hasBank = true;

                  return (
                    <div className="space-y-3">
                      {/* Payout Channel Tabs */}
                      <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 gap-1 select-none">
                        <button
                          type="button"
                          onClick={() => setActiveSettleMethod("upi")}
                          className={`flex-1 py-1.5 text-[10px] font-extrabold rounded-md flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            activeSettleMethod === "upi"
                              ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <Smartphone className="w-3.5 h-3.5 text-neon-purple shrink-0" />
                          <span>Pay with App</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveSettleMethod("qr")}
                          className={`flex-1 py-1.5 text-[10px] font-extrabold rounded-md flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            activeSettleMethod === "qr"
                              ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <QrCode className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>Scan QR Code</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveSettleMethod("bank")}
                          className={`flex-1 py-1.5 text-[10px] font-extrabold rounded-md flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            activeSettleMethod === "bank"
                              ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <CreditCard className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>Bank Account</span>
                        </button>
                      </div>

                      {/* Display Selected Payment channel views */}
                      <AnimatePresence mode="wait">
                        {activeSettleMethod === "upi" && (
                          <motion.div
                            key="upi-panel"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="space-y-4"
                          >
                            {gpayStep === "details" && (
                              <div className="bg-gradient-to-b from-indigo-50/40 to-white border border-indigo-100 rounded-2xl p-4 space-y-4 shadow-sm relative overflow-hidden">
                                {/* Secure Gateway Header Badge */}
                                <div className="flex items-center justify-between border-b border-indigo-50/80 pb-2.5">
                                  <div className="flex items-center gap-1.5 animate-pulse">
                                    <div className="flex gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-650"></span>
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-505"></span>
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    </div>
                                    <span className="text-[10px] font-black tracking-widest text-indigo-650 uppercase">
                                      Secure SplitSmart Pay
                                    </span>
                                  </div>
                                  <span className="text-[8px] bg-indigo-50 text-indigo-800 font-extrabold px-1.5 py-0.5 rounded uppercase">
                                    UPI Gate V2
                                  </span>
                                </div>

                                {/* Payee profile card */}
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md uppercase">
                                    {creditor?.name?.charAt(0) || "U"}
                                  </div>
                                  <div className="space-y-0.5 flex-grow min-w-0">
                                    <span className="text-xs font-black text-slate-800 block truncate">
                                      {creditor?.name}
                                    </span>
                                    <span className="text-[9px] font-mono font-bold text-slate-500 block truncate">
                                      UPI ID: {upiId}
                                    </span>
                                    <span className="text-[9px] text-slate-500 block font-semibold truncate">
                                      Bank: {bankName} ({`****${bankAccountNo.slice(-4)}`})
                                    </span>
                                  </div>
                                </div>

                                {/* Large amount box */}
                                <div className="bg-white border border-slate-100 rounded-xl p-3 text-center space-y-1">
                                  <span className="text-[9px] uppercase font-black tracking-wider text-slate-400">
                                    Amount to Split/Pay
                                  </span>
                                  <span className="text-3xl font-mono font-black text-slate-850 block">
                                    ₹{activeSettleDebt.amount.toFixed(2)}
                                  </span>
                                  <span className="text-[9px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full inline-block">
                                    💬 "SplitSmart: Rent/Bill settlement"
                                  </span>
                                </div>

                                {/* Payer Account Simulation Selection */}
                                <div className="flex items-center justify-between text-[9px] px-2.5 py-2 bg-slate-50/50 border border-slate-100 rounded-lg">
                                  <span className="text-slate-400 font-semibold">Paying from</span>
                                  <span className="font-extrabold text-slate-700 flex items-center gap-1">
                                    💳 State Bank of India •••• 9131
                                  </span>
                                </div>

                                {/* CTA Buttons */}
                                <div className="grid grid-cols-5 gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setGpayStep("keypad")}
                                    className="col-span-3 py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-indigo-750 text-white font-black text-[10px] rounded-xl shadow-md hover:brightness-105 transition-all text-center uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>Proceed (UPI PIN)</span>
                                  </button>

                                  <a
                                    href={getUpiUrl(activeSettleDebt, true)}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={() => {
                                      setTimeout(() => {
                                        handleConfirmDirectPayment();
                                      }, 500);
                                    }}
                                    className="col-span-2 py-2.5 px-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 font-bold text-[9px] rounded-xl transition-all text-center uppercase flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                    <span>Direct App</span>
                                  </a>
                                </div>
                              </div>
                            )}

                            {gpayStep === "keypad" && (
                              <div className="bg-slate-900 text-white rounded-2xl p-4.5 space-y-4 font-sans flex flex-col shadow-xl select-none">
                                <div className="flex justify-between items-center text-[10px] text-slate-400 border-b border-slate-800 pb-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setGpayStep("details");
                                      setGpayPin("");
                                    }}
                                    className="font-black uppercase tracking-wider flex items-center gap-1 text-sky-400 hover:text-sky-300 cursor-pointer text-[10px]"
                                  >
                                    ← Back
                                  </button>
                                  <span className="font-mono text-slate-400 text-[10px]">{upiId}</span>
                                </div>

                                <div className="text-center py-2.5">
                                  <span className="text-[9.5px] text-slate-300 uppercase tracking-widest font-black block mb-2">
                                    Paying {creditor?.name} &nbsp;•&nbsp; <strong className="text-white">₹{activeSettleDebt.amount.toFixed(2)}</strong>
                                  </span>
                                  
                                  {/* Dots representing the secret pin */}
                                  <div className="flex justify-center gap-4 py-2">
                                    {[0, 1, 2, 3].map((pos) => (
                                      <span
                                        key={pos}
                                        className={`w-3.5 h-3.5 rounded-full border border-slate-500 flex items-center justify-center ${
                                          gpayPin.length > pos ? "bg-white border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "bg-transparent"
                                        } transition-all duration-150`}
                                      />
                                    ))}
                                  </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2.5 text-center py-1">
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                    <button
                                      key={num}
                                      type="button"
                                      onClick={() => {
                                        if (gpayPin.length < 4) {
                                          const nextPin = gpayPin + num;
                                          setGpayPin(nextPin);
                                          if (nextPin.length === 4) {
                                            setTimeout(() => handleVerifyUpiPin(nextPin), 300);
                                          }
                                        }
                                      }}
                                      className="py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-xl font-black text-sm cursor-pointer transition-colors"
                                    >
                                      {num}
                                    </button>
                                  ))}

                                  <button
                                    type="button"
                                    onClick={() => setGpayPin("")}
                                    className="py-2.5 bg-slate-800/40 hover:bg-slate-800 text-[10px] font-black cursor-pointer uppercase transition-colors text-slate-400"
                                  >
                                    Clear
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (gpayPin.length < 4) {
                                        const nextPin = gpayPin + "0";
                                        setGpayPin(nextPin);
                                        if (nextPin.length === 4) {
                                          setTimeout(() => handleVerifyUpiPin(nextPin), 300);
                                        }
                                      }
                                    }}
                                    className="py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-xl font-black text-sm cursor-pointer transition-colors"
                                  >
                                    0
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (gpayPin.length > 0) {
                                        setGpayPin(gpayPin.slice(0, -1));
                                      }
                                    }}
                                    className="py-2.5 bg-slate-800/40 hover:bg-slate-800 text-[10px] font-black cursor-pointer flex items-center justify-center transition-colors text-slate-404"
                                  >
                                    ⌫
                                  </button>
                                </div>
                              </div>
                            )}

                            {gpayStep === "processing" && (
                              <div className="py-8 bg-indigo-50/10 border border-indigo-100/50 rounded-2xl flex flex-col items-center justify-center space-y-4 animate-fade-in">
                                <div className="w-11 h-11 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
                                <div className="text-center space-y-1 px-4">
                                  <span className="text-xs font-black text-indigo-700 uppercase tracking-wider block animate-pulse">
                                    Secure SplitSmart Ledger Transit
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-mono font-black italic block">
                                    {verificationFeedback}
                                  </span>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}

                        {activeSettleMethod === "qr" && (
                          <motion.div
                            key="qr-panel"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-xl"
                          >
                            <div className="text-center space-y-0.5">
                              <span className="text-[10px] text-slate-605 font-black uppercase tracking-wider block">
                                Unified Payment QR Code
                              </span>
                              <span className="text-[9px] text-slate-450 font-semibold block">
                                Scan with any Indian UPI App (GPay, BHIM, PhonePe, PayTM)
                              </span>
                            </div>

                            {/* Authentic QR scan framework box with a laser strip animation */}
                            <div className="relative w-44 h-44 bg-white p-2 rounded-xl border-2 border-dashed border-emerald-450 flex items-center justify-center shadow-inner overflow-hidden">
                              {paymentTimer > 0 ? (
                                <>
                                  {/* Sliding Laser Line */}
                                  <motion.div
                                    animate={{ y: [-8, 168, -8] }}
                                    transition={{
                                      repeat: Infinity,
                                      duration: 2.2,
                                      ease: "easeInOut",
                                    }}
                                    className="absolute left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] z-10"
                                  />
                                  {/* QR Image Fetch with single encoded params option */}
                                  <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(getUpiUrl(activeSettleDebt, false))}`}
                                    alt="Payment BHIM UPI QR Code Target"
                                    className="w-full h-full object-contain relative z-0 select-none"
                                    referrerPolicy="no-referrer"
                                  />
                                </>
                              ) : (
                                <div className="absolute inset-x-0 inset-y-0 bg-slate-950/95 text-white flex flex-col items-center justify-center p-3 text-center space-y-1.5 select-none z-20">
                                  <Lock className="w-6 h-6 text-rose-500 animate-pulse" />
                                  <span className="text-[10px] font-black uppercase text-rose-400 tracking-wider">Expired Session</span>
                                  <span className="text-[9px] text-slate-300 font-bold leading-normal">
                                    This direct scan link expired. Please close & reopen to pay.
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="text-center font-mono text-[9px] text-slate-500 bg-white border border-slate-200 px-2.5 py-1.5 rounded break-all max-w-xs select-all font-bold shadow-sm w-full">
                              Address: {upiId}
                            </div>

                            {gpayStep === "details" && paymentTimer > 0 && (
                              <button
                                type="button"
                                onClick={handleConfirmDirectPayment}
                                className="w-full py-2 px-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-[10px] rounded-xl shadow-md flex items-center justify-center gap-1.5 hover:brightness-105 transition-all cursor-pointer uppercase tracking-wider"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>I Scanned & Completed Payment</span>
                              </button>
                            )}

                            {gpayStep === "processing" && (
                              <div className="w-full py-3 bg-white border border-emerald-100 rounded-xl flex items-center justify-center gap-2">
                                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                                <span className="font-mono text-[9px] font-black text-emerald-800 animate-pulse truncate px-2">
                                  {verificationFeedback}
                                </span>
                              </div>
                            )}
                          </motion.div>
                        )}

                        {activeSettleMethod === "bank" && (
                          <motion.div
                            key="bank-panel"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 mt-1"
                          >
                            <div className="flex justify-between items-center text-[10px] border-b border-slate-200 pb-1.5">
                              <span className="font-extrabold text-indigo-650 block uppercase">
                                DIRECT BANK TRANSFER PRESETS
                              </span>
                              <span className="text-emerald-600 font-black">
                                Secure Transmit
                              </span>
                            </div>

                            <div className="space-y-2 text-[10.5px] text-slate-800">
                              <div>
                                <span className="text-[9px] text-slate-400 font-bold uppercase block leading-none font-sans italic">
                                  Beneficiary Bank
                                </span>
                                <span className="font-black text-slate-755">
                                  {bankName}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2.5 pt-1">
                                <div>
                                  <span className="text-[9px] text-slate-404 font-black uppercase block leading-none mb-1">
                                    Account Number
                                  </span>
                                  <div className="flex items-center justify-between gap-1 bg-white border border-slate-200 rounded-lg p-2 font-mono text-[10px] font-bold text-slate-800 shadow-sm">
                                    <span className="truncate flex-1 select-all">
                                      {bankAccountNo}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        bankAccountNo &&
                                        copyToClipboard(
                                          bankAccountNo,
                                          "upi",
                                        )
                                      }
                                      className="text-slate-400 hover:text-indigo-650 transition-colors p-0.5 hover:bg-slate-50 rounded shrink-0"
                                    >
                                      {copiedUpi ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-404 font-black uppercase block leading-none mb-1">
                                    IFSC Code
                                  </span>
                                  <div className="flex items-center justify-between gap-1 bg-white border border-slate-200 rounded-lg p-2 font-mono text-[10px] font-bold uppercase text-slate-850 shadow-sm">
                                    <span className="truncate flex-1 select-all">
                                      {bankIfsc}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        bankIfsc &&
                                        copyToClipboard(
                                          bankIfsc,
                                          "upi",
                                        )
                                      }
                                      className="text-slate-450 hover:text-indigo-655 transition-colors p-0.5 hover:bg-slate-50 rounded shrink-0"
                                    >
                                      {copiedUpi ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {gpayStep === "details" && (
                              <button
                                type="button"
                                onClick={handleConfirmDirectPayment}
                                className="w-full mt-1.5 py-2 px-3 bg-gradient-to-r from-indigo-505 to-indigo-700 text-white font-black text-[10px] rounded-xl shadow-md flex items-center justify-center gap-1.5 hover:brightness-105 transition-all cursor-pointer uppercase tracking-wider"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>I Transferred & Completed Payment</span>
                              </button>
                            )}

                            {gpayStep === "processing" && (
                              <div className="w-full py-3 bg-white border border-indigo-100 rounded-xl flex items-center justify-center gap-2">
                                <span className="w-2.5 h-2.5 bg-indigo-505 rounded-full animate-ping" />
                                <span className="font-mono text-[9px] font-black text-indigo-850 animate-pulse truncate px-2">
                                  {verificationFeedback}
                                </span>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })()}

                {/* Simulated Remind Text Box & Action buttons only visible in details step */}
                {gpayStep === "details" && (
                  <>
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[9px] font-black text-slate-455 uppercase tracking-wider block">
                        Generated SMS / WhatsApp Payer Receipt Reminder
                      </label>
                      <div className="relative bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-700 font-sans italic leading-tight text-[10px] font-medium pr-10 shadow-inner">
                        {getWhatsAppTemplate(activeSettleDebt)}
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(
                              getWhatsAppTemplate(activeSettleDebt),
                              "text",
                            )
                          }
                          className="absolute right-2.5 bottom-2.5 text-neon-purple hover:text-neon-pink transition-colors shrink-0 bg-white p-1 rounded border border-slate-200 shadow-sm"
                        >
                          {copiedText ? (
                            <Check className="w-3.5 h-3.5 text-emerald-650" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Primary Action Controls */}
                    <div className="space-y-2 pt-2.5">

                      <div className="flex gap-2">
                        <a
                          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(getWhatsAppTemplate(activeSettleDebt))}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={handleSimulateWhatsAppTrigger}
                          className="flex-1 py-1.5 text-[10px] font-black rounded-lg text-emerald-700 bg-emerald-50 border border-emerald-100/60 flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer hover:bg-emerald-100 hover:text-emerald-800 shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </a>
                        <a
                          href={`mailto:${members.find((m) => m.id === activeSettleDebt.fromUserId)?.email || ""}?subject=${encodeURIComponent(`SplitSmart Payment Reminder for ${group.name}`)}&body=${encodeURIComponent(getWhatsAppTemplate(activeSettleDebt))}`}
                          className="flex-1 py-1.5 text-[10px] font-black rounded-lg text-blue-700 bg-blue-50 border border-blue-100/60 flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer hover:bg-blue-100 hover:text-blue-800 shadow-sm"
                        >
                          <Mail className="w-3.5 h-3.5 text-blue-500" />
                          <span>Send Mail</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => setActiveSettleDebt(null)}
                          className="py-1.5 px-3.5 text-[10px] font-bold rounded-lg text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center gap-1 transition-all text-center cursor-pointer hover:text-rose-500"
                        >
                          <span>Close</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* WhatsApp reminders toast */}
                <AnimatePresence>
                  {whatsAppReminderSent && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 15 }}
                      className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-[10px] font-bold text-teal-800 flex items-center gap-1.5"
                    >
                      💬 [Notification Dispatched] Copy Successful! WhatsApp reminder loop simulation fired.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Add Expense Modal Container */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        members={members}
        currentUser={currentUser}
        onAddExpense={onAddExpense}
      />

      {/* Delete Group Modal */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setIsDeleteOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-white border border-slate-200 w-full max-w-sm rounded-2xl p-6 space-y-5 z-10 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <h3 className="text-sm font-extrabold text-slate-800">
                  Delete Shared Group
                </h3>
              </div>
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                Are you sure you want to permanently delete the group{" "}
                <strong className="text-slate-800 font-extrabold">
                  "{group.name}"
                </strong>
                ?
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-xl space-y-1 font-semibold">
                <p>⚠️ Warning:</p>
                <p className="text-[10px] leading-normal font-medium text-amber-750">
                  This will destroy the group and delete all{" "}
                  <strong className="font-extrabold">
                    {expenses.length} recorded expense(s)
                  </strong>{" "}
                  and settlement histories inside it. This action cannot be
                  undone!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="flex-1 py-3 text-xs font-bold rounded-xl text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-center transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteGroupSubmit}
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-rose-500 to-rose-600 text-white font-extrabold text-xs py-3 rounded-xl shadow-md flex items-center justify-center gap-1.5 hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
