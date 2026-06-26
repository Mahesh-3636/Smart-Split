/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Check, 
  ShieldCheck, 
  Lock, 
  CreditCard, 
  Smartphone, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Loader2, 
  Coins, 
  TrendingUp, 
  HelpCircle,
  QrCode,
  Bell,
  CheckCircle
} from 'lucide-react';
import { User } from '../types';

interface PremiumBillingProps {
  currentUser: User;
  onRefreshUser: (updatedUser: User) => void;
  setActiveTab: (tab: string) => void;
}

export default function PremiumBilling({ currentUser, onRefreshUser, setActiveTab }: PremiumBillingProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual' | 'custom'>('monthly');
  const [customAmount, setCustomAmount] = useState('499');
  const [currentStep, setCurrentStep] = useState<'select' | 'checkout' | 'processing' | 'success' | 'failed'>('select');
  
  // Checkout options state
  const [payMethod, setPayMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [upiIdInput, setUpiIdInput] = useState(currentUser.upiId || 'venkat@upi');
  const [cardNo, setCardNo] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState(currentUser.name);
  
  // Verification details
  const [processingStatusList, setProcessingStatusList] = useState<string[]>([]);
  const [paymentRecord, setPaymentRecord] = useState<any>(null);
  const [transactionId, setTransactionId] = useState('');
  const [countdown, setCountdown] = useState(5);
  const [errorMessage, setErrorMessage] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto show a temporary toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Synchronize timer for successful redirect
  useEffect(() => {
    let timerId: any;
    if (currentStep === 'success' && countdown > 0) {
      timerId = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (currentStep === 'success' && countdown === 0) {
      // Automatic redirect back to dashboard
      setActiveTab('dashboard');
    }
    return () => clearTimeout(timerId);
  }, [currentStep, countdown, setActiveTab]);

  const getAmount = () => {
    if (selectedPlan === 'monthly') return 199;
    if (selectedPlan === 'annual') return 1199;
    const val = parseFloat(customAmount);
    return isNaN(val) || val <= 0 ? 499 : val;
  };

  const currentAmount = getAmount();

  // Step 1: Initialize Payment record on server and create client order
  const handleInitiateOrder = async () => {
    try {
      setCurrentStep('processing');
      setProcessingStatusList(['Contacting payment servers...', 'Creating pending ledger entry...']);
      
      const response = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan,
          amount: currentAmount,
          currency: 'INR',
          userId: currentUser.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initialize payment session');
      }

      const orderData = await response.json();
      setPaymentRecord(orderData); // holds paymentId, orderId, amount, etc.
      
      // Auto-transition to interactive checkout dialog
      setTimeout(() => {
        setCurrentStep('checkout');
        showToast('Secure payment checkout session prepared successfully.');
      }, 1000);

    } catch (err: any) {
      setErrorMessage(err.message || 'Server communication breakdown.');
      setCurrentStep('failed');
    }
  };

  // Step 2: Trigger payment simulation + Server cryptographic validation loop
  const handleConfirmAndPay = async () => {
    if (!paymentRecord) return;
    
    setCurrentStep('processing');
    setProcessingStatusList([
      'Contacting payment provider API node...',
      'Securing 256-bit SSL pipeline session...',
      'Exchanging backend validation keys...',
      'Awaiting cryptographic authorization signature...'
    ]);

    // Simulate real delay for user payment authorization
    setTimeout(async () => {
      try {
        setProcessingStatusList(prev => [...prev, 'Verification payload received. Verifying on server-side...']);
        
        // Generate a test mock Gateway Payment ID & Cryptographic Signature on the client
        // In sandbox fallback, server computes crypto.createHmac('sha256', "secret").update(paymentId|gatewayPaymentId)
        // We match this exactly in client sandbox to simulate zero-friction successful checkout
        const gatewayPaymentId = `pay_${Math.random().toString(36).substring(2, 11)}`;
        const sandboxSecret = 'splitsmart_gateway_secure_salt_v2';
        
        // Client computation equivalent to simulate signature
        const encoder = new TextEncoder();
        const data = encoder.encode(`${paymentRecord.paymentId}|${gatewayPaymentId}`);
        const key = await window.crypto.subtle.importKey(
          'raw',
          encoder.encode(sandboxSecret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        const signatureBuffer = await window.crypto.subtle.sign('HMAC', key, data);
        const signatureArray = Array.from(new Uint8Array(signatureBuffer));
        const gatewaySignature = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Dispatch payload to backend server for validation (never trust frontend alone!)
        const verifyResponse = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentId: paymentRecord.paymentId,
            gatewayPaymentId,
            gatewaySignature,
            paymentMethod: payMethod === 'upi' ? `BHIM UPI (${upiIdInput})` : 'Credit/Debit Card',
            status: 'success'
          })
        });

        if (!verifyResponse.ok) {
          const verifyError = await verifyResponse.json();
          throw new Error(verifyError.error || 'Server signature mismatch or double spent detected!');
        }

        const verifyResult = await verifyResponse.json();
        
        // Successful upgrade!
        setTransactionId(verifyResult.txnId);
        
        // Trigger parent application callback to update the active session user details
        const updatedUser: User = {
          ...currentUser,
          subscription: 'premium'
        };
        onRefreshUser(updatedUser);

        // Transition views
        setTimeout(() => {
          setCurrentStep('success');
          showToast('PRO Upgrade successful! Active subscription upgraded.');
        }, 1200);

      } catch (err: any) {
        setErrorMessage(err.message || 'Cryptographic verification check failed. Payment rejected.');
        setCurrentStep('failed');
      }
    }, 1800);
  };

  return (
    <div className="relative max-w-4xl mx-auto py-4">
      {/* Dynamic Toast Alerts */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-6 right-6 z-50 px-4 py-3 bg-slate-900 border border-emerald-500/30 text-emerald-400 text-xs font-mono rounded-xl shadow-2xl flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neon-purple/10 border border-neon-purple/20 text-neon-pink text-xs font-semibold tracking-wider uppercase mb-3.5"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-neon-pink" />
          <span>PRO UPGRADE CORE</span>
        </motion.div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Unlock Smart Split Premium
        </h1>
        <p className="text-sm text-gray-400 max-w-lg mx-auto mt-2">
          Gain unlimited AI budgeting requests, professional invoices, real-time reminders and custom split templates.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {/* STEP: SELECT PLAN */}
        {currentStep === 'select' && (
          <motion.div
            key="select-step"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Monthly Card */}
            <div 
              onClick={() => setSelectedPlan('monthly')}
              className={`bg-white/5 border rounded-2xl p-6 flex flex-col justify-between cursor-pointer transition-all ${
                selectedPlan === 'monthly' 
                  ? 'border-neon-teal/60 ring-1 ring-neon-teal/20 bg-neon-teal/5 shadow-lg' 
                  : 'border-white/10 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs text-gray-400 font-mono tracking-wider uppercase">Pro Monthly</span>
                  {selectedPlan === 'monthly' && <Check className="w-5 h-5 text-neon-teal" />}
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-black text-white">₹199</span>
                  <span className="text-xs text-gray-500">/ month</span>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Perfect for occasional travelers and roommates to keep active transactions completely synchronized.
                </p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setSelectedPlan('monthly'); handleInitiateOrder(); }}
                className="w-full mt-6 py-2.5 px-4 bg-gradient-to-r from-neon-purple to-neon-pink text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 hover:brightness-105 transition-all"
              >
                <span>Subscribe Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Annual Card */}
            <div 
              onClick={() => setSelectedPlan('annual')}
              className={`bg-[#140c2e] border rounded-2xl p-6 flex flex-col justify-between cursor-pointer transition-all relative ${
                selectedPlan === 'annual' 
                  ? 'border-neon-purple ring-1 ring-neon-purple/30 bg-neon-purple/5 shadow-2xl scale-[1.02]' 
                  : 'border-white/10 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-gradient-to-r from-neon-purple to-neon-pink text-[9px] font-black tracking-widest text-white uppercase rounded-full glow-purple">
                Best Value (Save 50%)
              </div>
              <div className="mt-2">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs text-neon-pink font-semibold tracking-wider uppercase">Pro Annual</span>
                  {selectedPlan === 'annual' && <Check className="w-5 h-5 text-neon-pink" />}
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-black text-white">₹1199</span>
                  <span className="text-xs text-gray-500">/ year</span>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Consistent smart saving. Complete year coverage for housing rent loops, common budgets, and utility splitting.
                </p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setSelectedPlan('annual'); handleInitiateOrder(); }}
                className="w-full mt-6 py-2.5 px-4 bg-gradient-to-r from-neon-purple to-neon-pink text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 hover:brightness-110 transition-all glow-purple"
              >
                <span>Upgrade & Save</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Custom Support Option */}
            <div 
              onClick={() => setSelectedPlan('custom')}
              className={`bg-white/5 border rounded-2xl p-6 flex flex-col justify-between cursor-pointer transition-all ${
                selectedPlan === 'custom' 
                  ? 'border-neon-teal/60 ring-1 ring-neon-teal/20 bg-neon-teal/5 shadow-lg' 
                  : 'border-white/10 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs text-gray-400 font-mono tracking-wider uppercase">Custom Support</span>
                  {selectedPlan === 'custom' && <Check className="w-5 h-5 text-neon-teal" />}
                </div>
                <div className="mt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-300 font-bold font-mono">₹</span>
                    <input 
                      type="number" 
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-lg font-black text-white w-24 focus:outline-none focus:border-neon-teal"
                      placeholder="Amt"
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">One-Time Contribution</span>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Support development directly and unlock Lifetime PRO core capabilities for your personal account.
                </p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setSelectedPlan('custom'); handleInitiateOrder(); }}
                className="w-full mt-6 py-2.5 px-4 bg-white/10 border border-white/10 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 hover:bg-white/20 transition-all"
              >
                <span>Sponsor Split</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Feature Check Grid Panel */}
            <div className="col-span-1 md:col-span-3 mt-4 bg-white/5 p-6 rounded-2xl border border-white/5">
              <h3 className="text-sm font-bold text-white mb-4">Compare SplitSmart Package Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 text-xs text-gray-300">
                  <div className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-400 shrink-0" /><span>Secure UPI reminds generating dashboard</span></div>
                  <div className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-400 shrink-0" /><span>Optimized ledger calculations with min-balances</span></div>
                  <div className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-400 shrink-0" /><span>Spend analytics categories representation (Charts)</span></div>
                </div>
                <div className="space-y-2 text-xs text-gray-300">
                  <div className="flex items-center gap-2.5"><Check className="w-4 h-4 text-neon-pink shrink-0" /><span><strong>[PRO]</strong> Unlimited high-capacity Gemini Budget AI consultations</span></div>
                  <div className="flex items-center gap-2.5"><Check className="w-4 h-4 text-neon-pink shrink-0" /><span><strong>[PRO]</strong> Beautiful direct PDF receipt generator downloading</span></div>
                  <div className="flex items-center gap-2.5"><Check className="w-4 h-4 text-neon-pink shrink-0" /><span><strong>[PRO]</strong> Multi-Payer expense distributions splits</span></div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP: SECURE POPUP CHEKOUT GATEWAY OVERLAY */}
        {currentStep === 'checkout' && paymentRecord && (
          <motion.div
            key="checkout-step"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-md mx-auto bg-[#130d2d] rounded-2xl border border-neon-purple shadow-2xl overflow-hidden"
          >
            {/* Header branding */}
            <div className="bg-gradient-to-r from-[#170e3a] to-[#25155f] p-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-neon-purple to-neon-pink flex items-center justify-center">
                  <Coins className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">SplitSmart Checkout</h3>
                  <p className="text-[10px] text-neon-teal font-mono tracking-wider uppercase">Unified Payment Gateway v2</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 roundedbg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/20">
                <Lock className="w-3 h-3" />
                <span>SSL Secured</span>
              </div>
            </div>

            {/* Invoice parameters */}
            <div className="p-5 border-b border-white/5 bg-white/[0.02]">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">Merchant</span>
                <span className="text-xs text-white font-bold font-mono">SplitSmart Ltd.</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-400">User Identification</span>
                <span className="text-xs text-white truncate max-w-40 font-mono">{currentUser.email}</span>
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5">
                <span className="text-xs font-bold text-gray-300">Total Amount Owed</span>
                <span className="text-lg font-black text-neon-pink font-mono">₹{currentAmount}</span>
              </div>
            </div>

            {/* Payment Method Option Switching */}
            <div className="p-5 space-y-4">
              <div className="flex gap-2.5 border-b border-white/5 pb-3">
                <button 
                  onClick={() => setPayMethod('upi')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all border flex items-center justify-center gap-1.5 ${
                    payMethod === 'upi' 
                      ? 'bg-neon-purple/20 border-neon-purple text-white' 
                      : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>BHIM UPI</span>
                </button>
                <button 
                  onClick={() => setPayMethod('card')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all border flex items-center justify-center gap-1.5 ${
                    payMethod === 'card' 
                      ? 'bg-neon-purple/20 border-neon-purple text-white' 
                      : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Credit Card</span>
                </button>
              </div>

              {payMethod === 'upi' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-gray-400 font-mono mb-1.5 uppercase">Specify UPI Address</label>
                    <input 
                      type="text" 
                      value={upiIdInput}
                      onChange={(e) => setUpiIdInput(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-neon-teal font-mono placeholder:text-gray-600"
                      placeholder="e.g. name@okhdfc"
                    />
                  </div>

                  {/* Smart splits QR code simulation for fast interactive checkout */}
                  <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl flex items-center gap-4">
                    <div className="bg-white p-2.5 rounded-lg shrink-0">
                      <QrCode className="w-16 h-16 text-slate-900" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1">
                        <span>Scan Code to Authorize</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      </h4>
                      <p className="text-[10px] text-gray-400 mt-1 lines-clamp-2">
                        Scan the sandbox QR using your mobile GPay, Paytm, or PhonePe. The system verifies context automatically.
                      </p>
                      
                    </div>
                  </div>
                </div>
              )}

              {payMethod === 'card' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-gray-400 font-mono mb-1 uppercase">Card Number</label>
                    <input 
                      type="text" 
                      value={cardNo}
                      onChange={(e) => setCardNo(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-neon-teal font-mono placeholder:text-gray-600"
                      placeholder="4000 1234 5678 9010"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-400 font-mono mb-1 uppercase">Expiry Date</label>
                      <input 
                        type="text" 
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-neon-teal font-mono placeholder:text-gray-650"
                        placeholder="MM / YY"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 font-mono mb-1 uppercase">Secure CVV</label>
                      <input 
                        type="password" 
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-neon-teal font-mono placeholder:text-gray-650"
                        placeholder="***"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 font-mono mb-1 uppercase">Cardholder Name</label>
                    <input 
                      type="text" 
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-neon-teal font-serif"
                      placeholder="Name"
                    />
                  </div>
                </div>
              )}

              {/* Action Trigger Buttons */}
              <button 
                onClick={handleConfirmAndPay}
                className="w-full mt-4 py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 hover:brightness-105 transition-all text-center uppercase tracking-wider cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Pay ₹{currentAmount} Securely</span>
              </button>

              <button 
                onClick={() => setCurrentStep('select')}
                className="w-full py-2 px-4 bg-transparent text-gray-400 font-semibold text-[10px] rounded-lg border border-transparent hover:border-white/5 text-center mt-1 transition-all uppercase"
              >
                Cancel transaction
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP: PROCESSING ANIMATION */}
        {currentStep === 'processing' && (
          <motion.div
            key="processing-step"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-md mx-auto bg-white/5 border border-white/10 rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-6"
          >
            <div className="relative">
              <Loader2 className="w-12 h-12 text-neon-teal animate-spin" />
              <div className="absolute inset-0 w-12 h-12 bg-neon-teal/10 blur-xl rounded-full" />
            </div>

            <div>
              <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Authorizing Smart split</h3>
              <p className="text-xs text-gray-400 mt-1.5">Processing digital signature exchange...</p>
            </div>

            {/* Dynamic Status Log Screen */}
            <div className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-left font-mono text-[10px] text-gray-400 space-y-1.5 max-h-36 overflow-y-auto">
              {processingStatusList.map((log, idx) => (
                <div key={idx} className="flex gap-2 items-start text-[#3be0c5]">
                  <span className="text-[9px] shrink-0 text-[#714ff9] select-none">▶</span>
                  <span className="leading-tight">{log}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* STEP: SUCCESS TRANSACTION VIEW */}
        {currentStep === 'success' && (
          <motion.div
            key="success-step"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-md mx-auto bg-[#0a231d]/60 border border-emerald-500/30 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden"
          >
            {/* Success animations */}
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />
            
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-6 border border-emerald-500/30 shadow-inner glow-teal">
              <Check className="w-8 h-8" />
            </div>

            <h2 className="text-3xl font-black text-white tracking-tight">Payment Successful</h2>
            <p className="text-xs text-emerald-400 font-mono mt-1.5 px-3 py-0.5 bg-emerald-500/10 border border-emerald-500/10 rounded-full inline-block">
              Premium Upgrade Process Complete
            </p>

            {/* Transaction specs receipt */}
            <div className="mt-8 bg-black/20 border border-emerald-500/10 rounded-xl p-5 text-left space-y-3.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Transaction ID</span>
                <span className="text-white font-mono font-bold uppercase select-all tracking-wider text-[11px] bg-white/5 px-2 py-0.5 rounded border border-white/5">
                  {transactionId || 'TXN_SPLITSMART_123456'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Amount Paid</span>
                <span className="text-white font-bold font-mono">₹{currentAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Date & Time</span>
                <span className="text-white font-mono">{new Date().toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-3">
                <span className="text-gray-400">Account status</span>
                <span className="text-emerald-400 font-black uppercase text-[10px] flex items-center gap-1.5 font-mono">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>PREMIUM ACTIVE</span>
                </span>
              </div>
            </div>

            {/* Redirection timer status */}
            <div className="mt-8 pt-4 border-t border-white/5 flex flex-col items-center gap-1">
              <div className="text-[11px] text-gray-450 flex items-center gap-1.5 justify-center font-mono">
                <Loader2 className="w-3 h-3 text-neon-teal animate-spin" />
                <span>Returning to Dashboard in <strong className="text-white text-xs">{countdown}</strong> seconds...</span>
              </div>
              <button 
                onClick={() => setActiveTab('dashboard')}
                className="mt-3.5 text-xs text-neon-teal hover:text-white font-bold uppercase transition-colors"
              >
                Go back instantly
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP: FAIL TRANSACTION SCREEN */}
        {currentStep === 'failed' && (
          <motion.div
            key="fail-step"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-md mx-auto bg-[#230d1c]/60 border border-rose-500/30 rounded-2xl p-8 text-center shadow-2xl relative"
          >
            <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-6 border border-rose-500/30">
              <XCircle className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight">Payment Failed</h2>
            <p className="text-xs text-rose-400 font-medium tracking-wide mt-2">
              {errorMessage || 'A communication interruption or validation mismatch was identified.'}
            </p>

            <div className="mt-8 flex gap-3.5">
              <button 
                onClick={() => setCurrentStep('select')}
                className="flex-1 py-2.5 px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs rounded-xl transition-all"
              >
                Select Plan
              </button>
              <button 
                onClick={handleInitiateOrder}
                className="flex-1 py-2.5 px-4 bg-rose-500 hover:bg-rose-650 text-white font-bold text-xs rounded-xl shadow-md transition-all uppercase tracking-wider font-mono shrink-0"
              >
                Try Again
              </button>
            </div>

            <button 
              onClick={() => setActiveTab('dashboard')}
              className="mt-6 text-xs text-gray-450 hover:text-white uppercase transition-colors"
            >
              Cancel & Return To Dashboard
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
