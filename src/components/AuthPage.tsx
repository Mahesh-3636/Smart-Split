/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Coins, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  User, 
  CreditCard, 
  Smile, 
  Phone, 
  Chrome, 
  Lock, 
  KeyRound, 
  Settings, 
  AlertCircle,
  Sparkles,
  CheckCircle2,
  LockKeyhole
} from 'lucide-react';
import { User as UserType } from '../types';
import { 
  auth, 
  isFirebaseActive 
} from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from 'firebase/auth';

interface AuthPageProps {
  onLoginSuccess: (user: UserType) => void;
}

const AVATAR_OPTIONS = ["👤", "👨‍💻", "👩‍💻", "🦁", "🐼", "🦊", "🐨", "🦄", "🎯", "⚡", "🌟"];

export default function AuthPage({ onLoginSuccess }: AuthPageProps) {
  // Authentication Method Tabs
  const [authMethod, setAuthMethod] = useState<'email' | 'phone' | 'google'>('email');
  const [emailTab, setEmailTab] = useState<'signin' | 'signup'>('signin');
  
  // Email & Password State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [regRoute, setRegRoute] = useState<'upi' | 'bank'>('upi');
  const [registerUpi, setRegisterUpi] = useState("");
  const [registerBankName, setRegisterBankName] = useState("");
  const [registerBankAccountNo, setRegisterBankAccountNo] = useState("");
  const [registerBankIfsc, setRegisterBankIfsc] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("👤");
  
  // Phone OTP State
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationId, setConfirmationResult] = useState<any>(null);
  const [otpStep, setOtpStep] = useState<'enter_phone' | 'enter_otp'>('enter_phone');
  
  // UX State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  // ReCAPTCHA Reference for Phone Auth
  const recaptchaVerifierRef = useRef<any>(null);

  // Clean error messages on switching tabs
  useEffect(() => {
    setError("");
    setSuccessMsg("");
  }, [authMethod, emailTab]);

  // Clean up reCAPTCHA verifier if unmounting
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  // Sync Firebase authentication with local Database State
  const syncUserWithBackend = async (
    userEmail: string, 
    displayName: string, 
    avatarChoice?: string, 
    upiOverride?: string,
    bankName?: string,
    bankAccountNo?: string,
    bankIfsc?: string
  ): Promise<UserType> => {
    const rawName = displayName || userEmail.split("@")[0];
    const cleanName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    
    // Attempt standard login first to see if they exist in ledger
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail.toLowerCase().trim() })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          // If we registered fresh details, update their custom fields
          if (avatarChoice || upiOverride || bankName || bankAccountNo || bankIfsc) {
            const updateResponse = await fetch('/api/auth/profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: data.user.id,
                name: displayName || data.user.name,
                avatar: avatarChoice || data.user.avatar,
                upiId: upiOverride !== undefined ? upiOverride : data.user.upiId,
                bankName: bankName !== undefined ? bankName : data.user.bankName,
                bankAccountNo: bankAccountNo !== undefined ? bankAccountNo : data.user.bankAccountNo,
                bankIfsc: bankIfsc !== undefined ? bankIfsc : data.user.bankIfsc
              })
            });
            if (updateResponse.ok) {
              const updateData = await updateResponse.json();
              return updateData.user;
            } else {
              const errData = await updateResponse.json();
              throw new Error(errData.error || "Profile validation failed");
            }
          }
          return data.user;
        }
      }
    } catch (err: any) {
      console.warn("Backend sync login exception / fallback registration:", err);
      if (err?.message && err.message.includes("must specify either")) {
        throw err;
      }
    }
    
    // Fallback manual registration if standard handler fails
    const regResult = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userEmail.toLowerCase().trim(),
        name: cleanName,
        upiId: upiOverride || undefined,
        bankName: bankName || undefined,
        bankAccountNo: bankAccountNo || undefined,
        bankIfsc: bankIfsc || undefined,
        avatar: avatarChoice || "👤"
      })
    });
    
    const regData = await regResult.json();
    if (regData.success && regData.user) {
      return regData.user;
    }
    throw new Error(regData.error || "Could not synchronize user records.");
  };

  // --- 1. EMAIL AUTHENTICATION ---
  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please supply both a valid email and password security code.");
      return;
    }

      setError("");
      setIsLoading(true);

      try {
        if (isFirebaseActive && auth) {
          // --- LIVE REAL FIREBASE MODE ---
          if (emailTab === 'signin') {
            const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
            const syncedUser = await syncUserWithBackend(
              userCredential.user.email || email, 
              userCredential.user.displayName || ""
            );
            onLoginSuccess(syncedUser);
          } else {
            // Signup mode
            if (!registerName.trim()) {
              throw new Error("Full name identity is required to register customized ledger.");
            }
            if (regRoute === 'upi' && !registerUpi.trim()) {
              throw new Error("To receive split funds, you must provide a valid UPI ID (e.g. mahesh@upi).");
            }
            if (regRoute === 'bank' && (!registerBankName.trim() || !registerBankAccountNo.trim() || !registerBankIfsc.trim())) {
              throw new Error("To receive split funds, you must complete all bank account fields (Bank Name, Account Number, and IFSC code).");
            }
            const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
            const syncedUser = await syncUserWithBackend(
              userCredential.user.email || email,
              registerName.trim(),
              selectedAvatar,
              regRoute === 'upi' ? registerUpi.trim() : undefined,
              regRoute === 'bank' ? registerBankName.trim() : undefined,
              regRoute === 'bank' ? registerBankAccountNo.trim() : undefined,
              regRoute === 'bank' ? registerBankIfsc.trim() : undefined
            );
            onLoginSuccess(syncedUser);
          }
        } else {
          // --- HIGH FIDELITY SANDBOX PREVIEW FLOW ---
          if (emailTab === 'signin') {
            // Simulated authorization check
            if (password.length < 4) {
              throw new Error("Password must be at least 4 characters.");
            }
            const syncedUser = await syncUserWithBackend(email, "");
            onLoginSuccess(syncedUser);
          } else {
            // Simulated registration
            if (!registerName.trim()) {
              throw new Error("Full name identity is required for registration.");
            }
            if (regRoute === 'upi' && !registerUpi.trim()) {
              throw new Error("To receive split funds, you must provide a valid UPI ID (e.g. mahesh@upi).");
            }
            if (regRoute === 'bank' && (!registerBankName.trim() || !registerBankAccountNo.trim() || !registerBankIfsc.trim())) {
              throw new Error("To receive split funds, you must complete all bank account fields (Bank Name, Account Number, and IFSC code).");
            }
            const syncedUser = await syncUserWithBackend(
              email, 
              registerName, 
              selectedAvatar, 
              regRoute === 'upi' ? registerUpi.trim() : undefined,
              regRoute === 'bank' ? registerBankName.trim() : undefined,
              regRoute === 'bank' ? registerBankAccountNo.trim() : undefined,
              regRoute === 'bank' ? registerBankIfsc.trim() : undefined
            );
            onLoginSuccess(syncedUser);
          }
        }
      } catch (err: any) {
        console.error("Email auth error:", err);
        // Beginner-friendly error translation helper
        let userFriendlyMsg = err?.message || "Verify your connection is active and retry.";
        if (err?.code === 'auth/user-not-found') {
          userFriendlyMsg = "Account not found. Click the 'Register Account' tab to create a new profile!";
        } else if (err?.code === 'auth/wrong-password') {
          userFriendlyMsg = "Incorrect passcode key. Please try again.";
        } else if (err?.code === 'auth/email-already-in-use') {
          userFriendlyMsg = "This Email identity is already registered. Please sign in instead.";
        } else if (err?.code === 'auth/invalid-email') {
          userFriendlyMsg = "Please supply a valid e-mail structure.";
        } else if (err?.code === 'auth/configuration-not-found' || err?.code === 'auth/operation-not-allowed') {
          userFriendlyMsg = "Firebase Authentication error: Please go to Firebase Console > Authentication > 'Sign-in method' tab, and enable the 'Email/Password' provider configuration to start registering users!";
        }
        setError(userFriendlyMsg);
      } finally {
      setIsLoading(false);
    }
  };

  // --- 2. GMAIL / GOOGLE GOOGLE OUTH ---
  const handleGoogleAuth = async () => {
    setError("");
    setIsLoading(true);

    try {
      if (isFirebaseActive && auth) {
        // --- REAL GOOGLE PROVIDER POPUP ---
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(auth, provider);
        const syncedUser = await syncUserWithBackend(
          userCredential.user.email || "", 
          userCredential.user.displayName || "",
          "🌟"
        );
        onLoginSuccess(syncedUser);
      } else {
        // --- SANDBOX SIMULATED LOGIN ---
        setIsLoading(true);
        // Simulate loading pop-up experience
        await new Promise(resolve => setTimeout(resolve, 1200));
        const fakeGoogleEmail = email.trim() || "venkatamaheshbabuaddanki@gmail.com";
        const syncedUser = await syncUserWithBackend(
          fakeGoogleEmail, 
          "Google User", 
          "🌟"
        );
        onLoginSuccess(syncedUser);
      }
    } catch (err: any) {
      console.error("Google Authenticator error:", err);
      let userFriendlyMsg = err?.message || "Google single sign-on overlay was closed.";
      if (err?.code === 'auth/configuration-not-found' || err?.code === 'auth/operation-not-allowed') {
        userFriendlyMsg = "Google Sign-In is disabled for this project. Please go to your Firebase Console > Authentication > 'Sign-in method' tab, and enable the 'Google' provider!";
      }
      setError(userFriendlyMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 3. PHONE / OTP AUTHENTICATION ---
  // Sets up recaptcha on demand
  const setupRecaptcha = () => {
    if (recaptchaVerifierRef.current) return;
    try {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'bhim-recaptcha-anchor', {
        size: 'invisible',
        callback: () => {
          console.log("reCAPTCHA validation successfully verified!");
        }
      });
    } catch (err) {
      console.error("reCAPTCHA generation failed:", err);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      setError("Please input a valid phone index with country code.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      if (isFirebaseActive && auth) {
        // --- SYSTEM PHONE AUTH --
        setupRecaptcha();
        const appVerifier = recaptchaVerifierRef.current;
        // Verify country code presence, default to +91 (India) as handy split-wise assistant
        let formattedPhone = phoneNumber.trim();
        if (!formattedPhone.startsWith('+')) {
          formattedPhone = '+91' + formattedPhone;
        }

        const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
        setConfirmationResult(confirmation);
        setOtpStep('enter_otp');
        setSuccessMsg(`Secure OTP passcode successfully transmitted to ${formattedPhone}!`);
      } else {
        // --- SANDBOX OTP CODE GENERATION ---
        await new Promise(resolve => setTimeout(resolve, 900));
        setOtpStep('enter_otp');
        setSuccessMsg(`[Sandbox Mode] 6-digit verification code routed! Enter '123456' to proceed.`);
      }
    } catch (err: any) {
      console.error("Send OTP failed:", err);
      setError(err?.message || "reCAPTCHA validation or carrier routing rejected the request.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a valid 6-digit numeric OTP verification string.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      if (isFirebaseActive && verificationId) {
        // --- VERIFY COMPLETED ---
        const result = await verificationId.confirm(verificationCode);
        const userEmail = `${phoneNumber.replace(/[^0-9]/g, '')}@bhim.phone`;
        const syncedUser = await syncUserWithBackend(
          userEmail, 
          "Phone User",
          "📱"
        );
        onLoginSuccess(syncedUser);
      } else {
        // --- SANDBOX CODE CHECK ---
        await new Promise(resolve => setTimeout(resolve, 600));
        if (verificationCode !== "123456") {
          throw new Error("Invalid verification code passcode. [Hint: Enter 123456 inside Sandbox Mode]");
        }
        const userEmail = `${phoneNumber.replace(/[^0-9]/g, '') || "9876543210"}@bhim.phone`;
        const namePart = phoneNumber.replace(/[^0-9]/g, '').slice(-4) || "Phone";
        const syncedUser = await syncUserWithBackend(
          userEmail,
          `Phone user ****${namePart}`,
          "📱"
        );
        onLoginSuccess(syncedUser);
      }
    } catch (err: any) {
      console.error("Verification confirmation err:", err);
      setError(err?.message || "Authorization confirmation failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-void flex flex-col items-center justify-center p-4 relative overflow-y-auto">
      {/* Dynamic Ambient Background layout */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-neon-purple/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-neon-pink/5 blur-[120px] pointer-events-none" />

      <motion.div 
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.5 }}
         className="w-full max-w-md bg-deep-indigo border border-slate-200/50 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative"
      >
        {/* Brand Banner */}
        <div className="text-center space-y-3">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-neon-purple to-neon-pink mx-auto flex items-center justify-center shadow-lg hover:rotate-12 transition-transform cursor-pointer animate-pulse"
          >
            <Coins className="w-8 h-8 text-white animate-bounce" />
          </motion.div>
          
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
              SplitSmart <div className="text-xs px-2 py-0.5 rounded-full bg-neon-teal/10 text-neon-teal font-extrabold uppercase border border-neon-teal/20">Secure Pay</div>
            </h1>
            <p className="text-xs text-slate-400 font-extrabold tracking-tight">Active User split manager equipped with Firebase</p>
          </div>
        </div>

        {/* Dynamic Mode Connection Alert Bubble */}
        <div className={`p-3 rounded-xl border flex items-start gap-2 text-xs font-semibold ${
          isFirebaseActive 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}>
          {isFirebaseActive ? (
            <>
              <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-white leading-none">Firebase Live Connected</p>
                <p className="text-[10px] text-emerald-300 mt-1">Real-time authentication and secure DB synchronization is fully functioning.</p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" />
              <div>
                <p className="font-bold text-white leading-none">Fidelity Developer Sandbox Mode</p>
                <p className="text-[10px] text-amber-300/90 mt-1">
                  Ready with detailed logic steps. Fill <strong>src/firebase-applet-config.json</strong> to automatically deploy securely to your real Google Cloud project!
                </p>
              </div>
            </>
          )}
        </div>

        {/* Triple Interface Switch Panel (Tabs) */}
        <div className="grid grid-cols-3 bg-[#110724]/80 p-1 rounded-xl border border-white/5 gap-1">
          <button
            type="button"
            onClick={() => setAuthMethod('email')}
            className={`py-2 text-[11px] font-black rounded-lg transition-all flex flex-col items-center gap-1 cursor-pointer ${
              authMethod === 'email' 
                ? 'bg-gradient-to-r from-neon-purple to-neon-pink text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email</span>
          </button>
          
          <button
            type="button"
            onClick={() => setAuthMethod('phone')}
            className={`py-2 text-[11px] font-black rounded-lg transition-all flex flex-col items-center gap-1 cursor-pointer ${
              authMethod === 'phone' 
                ? 'bg-gradient-to-r from-neon-purple to-neon-pink text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Phone OTP</span>
          </button>

          <button
            type="button"
            onClick={() => setAuthMethod('google')}
            className={`py-2 text-[11px] font-black rounded-lg transition-all flex flex-col items-center gap-1 cursor-pointer ${
              authMethod === 'google' 
                ? 'bg-gradient-to-r from-neon-purple to-neon-pink text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Chrome className="w-3.5 h-3.5" />
            <span>Gmail SSO</span>
          </button>
        </div>

        {/* FEEDBACK STATUS INDICATORS */}
        {error && (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-semibold text-rose-300 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {successMsg && (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-xs font-semibold text-teal-300 flex items-start gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </motion.div>
        )}

        {/* INTERFACE CONTENT */}
        <AnimatePresence mode="wait">
          {authMethod === 'email' && (
            <motion.div
              key="email_block"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-4"
            >
              {/* Email Switcher Sub-tabs */}
              <div className="flex bg-[#160d2b] p-1 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setEmailTab('signin')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    emailTab === 'signin' 
                      ? 'bg-[#1e133d] text-white border border-white/10' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setEmailTab('signup')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    emailTab === 'signup' 
                      ? 'bg-[#1e133d] text-white border border-white/10' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Register Account
                </button>
              </div>

              <form onSubmit={handleEmailAuthSubmit} className="space-y-4">
                {emailTab === 'signup' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="space-y-4"
                  >
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-neon-purple" /> Full Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Mahesh Babu"
                        value={registerName}
                        onChange={e => setRegisterName(e.target.value)}
                        className="w-full bg-[#160d2b] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none placeholder:text-slate-600"
                      />
                    </div>

                     {/* Deposit route selector tabs */}
                     <div className="space-y-3 p-3.5 rounded-xl bg-white/5 border border-white/5">
                       <div className="flex justify-between items-center pb-1">
                         <span className="text-xs font-black text-slate-200">Choose Deposit Route</span>
                         <span className="text-[10px] uppercase font-black text-neon-teal tracking-wider bg-neon-teal/10 px-2 py-0.5 rounded border border-neon-teal/20">Required</span>
                       </div>
                       
                       <div className="flex gap-2 p-0.5 bg-[#0f0724] rounded-lg border border-white/5">
                         <button
                           type="button"
                           onClick={() => setRegRoute('upi')}
                           className={`flex-1 py-1.5 text-xs font-extrabold rounded-md transition-all cursor-pointer ${
                             regRoute === 'upi' ? 'bg-[#1e133d] text-white border border-white/10' : 'text-slate-400 hover:text-slate-200'
                           }`}
                         >
                           BHIM UPI
                         </button>
                         <button
                           type="button"
                           onClick={() => setRegRoute('bank')}
                           className={`flex-1 py-1.5 text-xs font-extrabold rounded-md transition-all cursor-pointer ${
                             regRoute === 'bank' ? 'bg-[#1e133d] text-white border border-white/10' : 'text-slate-400 hover:text-slate-200'
                           }`}
                         >
                           Bank Transfer
                         </button>
                       </div>

                       {regRoute === 'upi' ? (
                         <div className="space-y-1">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">UPI Payments address</label>
                           <input
                             type="text"
                             required={regRoute === 'upi'}
                             placeholder="e.g. mahesh@upi"
                             value={registerUpi}
                             onChange={e => setRegisterUpi(e.target.value)}
                             className="w-full bg-[#160d2b] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none placeholder:text-slate-600 font-mono"
                           />
                         </div>
                       ) : (
                         <div className="space-y-3">
                           <div className="space-y-1">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bank Name</label>
                             <input
                               type="text"
                               required={regRoute === 'bank'}
                               placeholder="e.g. State Bank of India"
                               value={registerBankName}
                               onChange={e => setRegisterBankName(e.target.value)}
                               className="w-full bg-[#160d2b] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none placeholder:text-slate-600"
                             />
                           </div>
                           <div className="grid grid-cols-2 gap-2">
                             <div className="space-y-1">
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Account No.</label>
                               <input
                                 type="text"
                                 required={regRoute === 'bank'}
                                 placeholder="e.g. 3021105432"
                                 value={registerBankAccountNo}
                                 onChange={e => setRegisterBankAccountNo(e.target.value)}
                                 className="w-full bg-[#160d2b] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none placeholder:text-slate-600 font-mono"
                               />
                             </div>
                             <div className="space-y-1">
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">IFSC Code</label>
                               <input
                                 type="text"
                                 required={regRoute === 'bank'}
                                 placeholder="e.g. SBIN0020130"
                                 value={registerBankIfsc}
                                 onChange={e => setRegisterBankIfsc(e.target.value)}
                                 className="w-full bg-[#160d2b] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none placeholder:text-slate-600 font-mono uppercase"
                               />
                             </div>
                           </div>
                         </div>
                       )}
                     </div>

                    {/* Avatar selection selection */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Smile className="w-3.5 h-3.5 text-neon-pink" /> Choose Profile Avatar
                      </span>
                      <div className="flex flex-wrap gap-1.5 py-1 justify-center max-h-24 overflow-y-auto bg-[#160d2b] p-2 rounded-xl border border-white/5">
                        {AVATAR_OPTIONS.map(av => (
                          <button
                            key={av}
                            type="button"
                            onClick={() => setSelectedAvatar(av)}
                            className={`w-8 h-8 text-sm flex items-center justify-center rounded-lg transition-all cursor-pointer ${
                              selectedAvatar === av 
                                ? 'bg-[#2a1b4e] transform scale-110 shadow-sm border border-neon-purple' 
                                : 'hover:bg-white/5 text-white'
                            }`}
                          >
                            {av}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="space-y-1">
                  <label htmlFor="auth-email" className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-neon-purple" /> Email Identity
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    placeholder="e.g. mahesh@bhimapp.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-[#160d2b] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none placeholder:text-slate-600"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="auth-password" className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <LockKeyhole className="w-3.5 h-3.5 text-neon-pink" /> Passcode (Password)
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    required
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-[#160d2b] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none placeholder:text-slate-600"
                  />
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-neon-purple to-neon-pink text-white font-extrabold text-sm py-3 rounded-xl shadow-lg cursor-pointer hover:opacity-95 transition-all flex items-center justify-center gap-2 mt-2"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      Authenticating ...
                    </span>
                  ) : (
                    <>
                      <span>{emailTab === 'signin' ? 'Sign In Securely' : 'Secure Sign Up & Register'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>
          )}

          {authMethod === 'phone' && (
            <motion.div
              key="phone_block"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-4"
            >
              {otpStep === 'enter_phone' ? (
                /* SEND OTP FORM */
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-1">
                    <label htmlFor="phone-number" className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-neon-purple" /> Phone Number Index
                    </label>
                    <input
                      id="phone-number"
                      type="tel"
                      required
                      placeholder="e.g. +91 9876543210"
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value)}
                      className="w-full bg-[#160d2b] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none placeholder:text-slate-600"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">Include country prefix code. e.g. <strong>+91</strong> for Indian Carriers.</span>
                  </div>

                  {/* Sandbox reCAPTCHA anchor */}
                  <div id="bhim-recaptcha-anchor" className="flex justify-center my-1"></div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-neon-purple to-neon-pink text-white font-extrabold text-sm py-3 rounded-xl shadow-lg cursor-pointer hover:opacity-95 transition-all flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                        Transmitting OTP...
                      </span>
                    ) : (
                      <>
                        <span>Transmit OTP Passcode</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>
                </form>
              ) : (
                /* VERIFY OTP FORM */
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-1">
                    <label htmlFor="opt-code" className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-neon-pink" /> 6-Digit Verification Code
                    </label>
                    <input
                      id="opt-code"
                      type="text"
                      maxLength={6}
                      required
                      placeholder="Enter 6 digit OTP code"
                      value={verificationCode}
                      onChange={e => setVerificationCode(e.target.value)}
                      className="w-full tracking-[0.25em] font-mono text-center bg-[#160d2b] border border-white/10 rounded-xl px-4 py-3 text-lg text-white focus:outline-none placeholder:text-slate-600"
                    />
                  </div>

                  <div className="flex gap-2 pt-1 font-semibold text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpStep('enter_phone');
                        setVerificationCode('');
                        setError('');
                        setSuccessMsg('');
                      }}
                      className="flex-1 py-2 text-slate-400 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-all"
                    >
                      Change Phone
                    </button>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="flex-1 py-2 text-neon-purple hover:text-white border border-neon-purple/20 rounded-lg hover:bg-neon-purple/5 transition-all"
                    >
                      Resend Code
                    </button>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-neon-purple to-neon-pink text-white font-extrabold text-sm py-3 rounded-xl shadow-lg cursor-pointer hover:opacity-95 transition-all flex items-center justify-center gap-2 mt-2"
                  >
                    {isLoading ? (
                      <span>Verifying OTP passcode...</span>
                    ) : (
                      <>
                        <span>Verify Split Credentials</span>
                        <ShieldCheck className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>
                </form>
              )}
            </motion.div>
          )}

          {authMethod === 'google' && (
            <motion.div
              key="google_block"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-4 text-center py-4"
            >
              <p className="text-xs text-slate-400 font-bold leading-normal">
                Authorize quick login access using Google SSO. If running live, this unlocks direct Gmail synchronization.
              </p>

              <motion.button
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={handleGoogleAuth}
                disabled={isLoading}
                className="w-full py-4.5 bg-[#160d2b] hover:bg-[#1f133f] text-white border border-white/10 shadow-lg font-black text-xs rounded-xl flex items-center justify-center gap-3 cursor-pointer hover:border-[#a855f7]/30 transition-all"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" />
                    Opening Google Window...
                  </span>
                ) : (
                  <>
                    <Chrome className="w-4 h-4 text-rose-400 animate-spin-slow" />
                    <span>Authorize Login via Gmail / Google</span>
                  </>
                )}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Preset profiles section preserved for rapid developer evaluation */}
        <div className="space-y-3 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between text-[11px] font-black text-slate-400">
            <span>PRESET ROOMROOM CO-KEYS</span>
            <span className="text-neon-teal font-mono tracking-wider">ONE-TAP FAST TEST</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={async () => {
                setIsLoading(true);
                const user = await syncUserWithBackend("venkatamaheshbabuaddanki@gmail.com", "Venkat A.");
                onLoginSuccess(user);
              }}
              className="p-2.5 text-left bg-[#160d2b] hover:bg-[#1e133d] border border-white/5 hover:border-white/10 rounded-xl transition-all hover:scale-[1.02] flex items-center gap-2 group cursor-pointer"
            >
              <div className="text-lg">👨‍💻</div>
              <div className="min-w-0">
                <span className="text-xs font-extrabold text-white block group-hover:text-neon-purple truncate">Venkat A.</span>
                <span className="text-[9px] text-slate-500 truncate block">Primary Admin</span>
              </div>
            </button>

            <button
              onClick={async () => {
                setIsLoading(true);
                const user = await syncUserWithBackend("sarah@example.com", "Sarah Jenkins");
                onLoginSuccess(user);
              }}
              className="p-2.5 text-left bg-[#160d2b] hover:bg-[#1e133d] border border-white/5 hover:border-white/10 rounded-xl transition-all hover:scale-[1.02] flex items-center gap-2 group cursor-pointer"
            >
              <div className="text-lg">👩‍💼</div>
              <div className="min-w-0">
                <span className="text-xs font-extrabold text-white block group-hover:text-neon-purple truncate">Sarah J.</span>
                <span className="text-[9px] text-slate-500 truncate block">Flatmate Roomy</span>
              </div>
            </button>
          </div>
        </div>

        {/* Trust Badging */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest text-center">
          <ShieldCheck className="w-3.5 h-3.5 text-neon-teal" />
          <span>BHIM NPCI Secure Gateway Sandbox</span>
        </div>
      </motion.div>
    </div>
  );
}
