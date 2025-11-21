import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, signInAnonymously, onAuthStateChanged, createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, signOut, 
    GoogleAuthProvider, GithubAuthProvider, OAuthProvider, 
    signInWithPopup, linkWithPopup, setPersistence, browserLocalPersistence
} from 'firebase/auth';
import { 
    getFirestore, doc, getDoc, addDoc, onSnapshot, collection, query, where, 
    getDocs, serverTimestamp, setDoc, updateDoc, deleteDoc
} from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyAvG02ZrkIJk7A0C2KyGAQZSdeEpKNYz0Q",
  authDomain: "video-website-64dab.firebaseapp.com",
  projectId: "video-website-64dab",
  storageBucket: "video-website-64dab.firebasestorage.app",
  messagingSenderId: "339989741883",
  appId: "1:339989741883:web:fe58607ad7cf36eb86371e",
  measurementId: "G-4XMY4TXS7G"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// --- Helper: Detect Device Name ---
const getDeviceName = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.match(/Android/i)) return 'Android Device';
    if (userAgent.match(/iPhone/i)) return 'iPhone';
    if (userAgent.match(/iPad/i)) return 'iPad';
    if (userAgent.match(/Windows/i)) return 'Windows PC';
    if (userAgent.match(/Mac/i)) return 'MacBook / Mac';
    if (userAgent.match(/Linux/i)) return 'Linux / Chromebook';
    return 'Unknown Device';
};

// --- Components ---

const Message = ({ message }) => {
    if (!message) return null;
    const { text, type } = message;
    const bgColor = type === 'error' ? 'bg-red-500' : 'bg-green-500';
    return <div className={`fixed top-5 right-5 ${bgColor} text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in-out z-[9999]`}>{text}</div>;
};

const SubscriberCount = ({ uploaderId }) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!uploaderId) return;
        const q = query(collection(db, 'subscribers'), where("uploaderId", "==", uploaderId));
        const unsubscribe = onSnapshot(q, (s) => setCount(s.size), console.error);
        return () => unsubscribe();
    }, [uploaderId]);
    return <span className="text-xs text-gray-500 dark:text-gray-400">{count} Subscribers</span>;
};

// --- ICONS ---
const GoogleIcon = () => (
    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
);

const YahooIcon = () => (
    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5L8.5 15V21H11.5V15L18 5H14.5L10 12L5.5 5H2Z" fill="#6001D2"/></svg>
);

const GitHubIcon = () => (
    <svg className="h-5 w-5 mr-2 dark:text-white text-gray-900" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
);

// --- BOTTOM NAV (Secured) ---
const BottomNav = ({ currentUser, currentUserProfile, currentView, onSetView, onNavigateToBytes, onNavigateToChannel, showMessage }) => {
    const isActive = (viewName) => currentView === viewName;
    const activeClass = "text-indigo-600 dark:text-indigo-400";
    const inactiveClass = "text-gray-500 dark:text-gray-400";

    const handleAuthAction = (action) => {
        if (currentUser && !currentUser.isAnonymous) {
            action();
        } else {
            showMessage("Please log in to use this feature.", "error");
            onSetView('landing');
        }
    };

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-around items-center py-2 z-50 pb-safe">
            <button onClick={() => onSetView('home')} className={`flex-1 flex flex-col items-center py-2 space-y-1 ${isActive('home') ? activeClass : inactiveClass}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill={isActive('home') ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                <span className="text-[10px] font-medium">Home</span>
            </button>
            <button onClick={onNavigateToBytes} className={`flex-1 flex flex-col items-center py-2 space-y-1 ${isActive('bytesPlayer') ? activeClass : inactiveClass}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill={isActive('bytesPlayer') ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <span className="text-[10px] font-medium">Bytes</span>
            </button>
            <div className="flex-1 flex justify-center relative -top-3">
                <button onClick={() => handleAuthAction(() => onSetView('upload'))} className="bg-indigo-600 dark:bg-indigo-500 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg border-4 border-white dark:border-gray-900 active:scale-95 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                </button>
            </div>
            <button onClick={() => onSetView('subscriptions')} className={`flex-1 flex flex-col items-center py-2 space-y-1 ${isActive('subscriptions') ? activeClass : inactiveClass}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill={isActive('subscriptions') ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                <span className="text-[10px] font-medium">Subs</span>
            </button>
            <button onClick={() => handleAuthAction(() => onNavigateToChannel(currentUser.uid))} className={`flex-1 flex flex-col items-center py-2 space-y-1 ${isActive('channel') ? activeClass : inactiveClass}`}>
                {currentUser && !currentUser.isAnonymous && currentUserProfile ? (
                     <img src={currentUserProfile.profilePictureUrl} alt="Me" className={`h-6 w-6 rounded-full object-cover ${isActive('channel') ? 'ring-2 ring-indigo-600' : ''}`} onError={(e) => e.target.src=`https://placehold.co/24x24/7c3aed/ffffff?text=${currentUserProfile.name ? currentUserProfile.name[0] : '?'}`}/>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                )}
                <span className="text-[10px] font-medium">Me</span>
            </button>
        </div>
    );
};

const Navbar = ({ currentUser, currentUserProfile, onLogout, onSetView, onNavigateToChannel, onNavigateToBytes, searchTerm, onSearchChange, onOpenSettings, showMessage }) => {
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef(null);
    
    useEffect(() => {
        const handleClickOutside = (event) => { if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) setIsProfileMenuOpen(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleUploadClick = () => {
        if (currentUser && !currentUser.isAnonymous) {
            onSetView('upload');
        } else {
            showMessage("Please log in to upload content.", "error");
            onSetView('landing');
        }
    };
    
    return (
        <nav className="bg-white dark:bg-gray-900 p-4 text-gray-800 dark:text-white shadow-md sticky top-0 z-40 border-b border-gray-200 dark:border-gray-700">
            <div className="container mx-auto flex items-center justify-between">
                <h1 onClick={() => onSetView('home')} className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer flex-shrink-0">VideoHub</h1>
                <div className="flex-grow flex justify-center mx-2 sm:mx-4">
                    <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} className="w-full max-w-md px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
                <div className="flex space-x-2 sm:space-x-4 items-center flex-shrink-0 relative">
                    <button onClick={() => { onSetView('home'); onSearchChange(''); }} className="hidden md:block px-4 py-2 bg-indigo-600 text-white rounded-full shadow-md hover:bg-indigo-700 transition-colors">Home</button>
                    <button onClick={onNavigateToBytes} className="hidden md:block px-4 py-2 bg-purple-600 text-white rounded-full shadow-md hover:bg-purple-700 transition-colors">Bytes</button>
                    <button onClick={() => onSetView('subscriptions')} className="hidden md:block px-4 py-2 bg-teal-600 text-white rounded-full shadow-md hover:bg-teal-700 transition-colors">Subs</button>
                    {currentUser ? (
                        <>
                            <button onClick={handleUploadClick} className="hidden md:block px-3 py-2 sm:px-4 sm:py-2 bg-green-600 text-white rounded-full shadow-md hover:bg-green-700 transition-colors text-sm sm:text-base">Upload</button>
                            <div ref={profileMenuRef}>
                                <img src={currentUserProfile?.profilePictureUrl || `https://placehold.co/40x40/7c3aed/ffffff?text=${currentUserProfile?.name ? currentUserProfile.name[0].toUpperCase() : '?'}`} alt="My Profile" onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover cursor-pointer border-2 border-transparent hover:border-indigo-500 transition-colors" onError={(e) => e.target.src=`https://placehold.co/40x40/7c3aed/ffffff?text=${currentUserProfile?.name ? currentUserProfile.name[0].toUpperCase() : '?'}`}/>
                                {isProfileMenuOpen && (
                                    <div className="absolute right-0 top-12 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 border border-gray-200 dark:border-gray-700 z-50">
                                        <button onClick={() => { onNavigateToChannel(currentUser.uid); setIsProfileMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">My Channel</button>
                                        <button onClick={() => { onOpenSettings(); setIsProfileMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">Settings</button>
                                        <button onClick={() => { onLogout(); setIsProfileMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700">Logout</button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <button onClick={() => onSetView('landing')} className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-full shadow-md hover:bg-blue-700 transition-colors text-sm">Login</button>
                    )}
                </div>
            </div>
        </nav>
    );
};

const ContentCard = ({ item, onWatch, onNavigateToChannel }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300 flex flex-col">
        <div className="relative cursor-pointer" onClick={() => onWatch(item)}>
            <img src={item.thumbnailUrl} alt={item.title} className="w-full h-48 object-cover" onError={(e) => e.target.src='https://placehold.co/600x400/1f2937/7c3aed?text=Image+Error'}/>
        </div>
        <div className="p-4 flex flex-col flex-grow">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate cursor-pointer" onClick={() => onWatch(item)}>{item.title}</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1 truncate flex-grow">{item.description}</p>
            <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer hover:underline" onClick={() => onNavigateToChannel(item.uploaderId)}>{item.uploaderName}</span>
                <SubscriberCount uploaderId={item.uploaderId} />
            </div>
        </div>
    </div>
);

const ContentGrid = ({ items, onWatch, onNavigateToChannel, title, emptyMessage }) => (
    <div className="p-4 sm:p-8 pb-20 sm:pb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 border-b-2 border-indigo-500 pb-2">{title}</h2>
        {items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {items.map(item => <ContentCard key={item.id} item={item} onWatch={onWatch} onNavigateToChannel={onNavigateToChannel} />)}
            </div>
        ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center mt-10">{emptyMessage || "No content found here."}</p>
        )}
    </div>
);

const LandingPage = ({ handleGuestLogin, setView, setAuthMode }) => (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 pb-20 sm:pb-0">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md w-full mx-4">
            <h1 className="text-5xl font-bold text-indigo-600 dark:text-indigo-400 mb-4">VideoHub</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-8">Your new favorite place for videos and shorts.</p>
            <div className="space-y-4">
                <button onClick={handleGuestLogin} className="w-full py-3 px-4 text-white bg-gray-600 rounded-md hover:bg-gray-700 transition-colors text-lg">Continue as Guest</button>
                <button onClick={() => { setAuthMode('login'); setView('authForm'); }} className="w-full py-3 px-4 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors text-lg">Login</button>
                <button onClick={() => { setAuthMode('signup'); setView('authForm'); }} className="w-full py-3 px-4 text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors text-lg">Create Account</button>
            </div>
        </div>
    </div>
);

const AuthForm = ({ mode, onLogin, onSignup, onProviderLogin, setView }) => {
    const emailRef = useRef();
    const passwordRef = useRef();
    const handleSubmit = (e) => {
        e.preventDefault();
        if (mode === 'login') onLogin(emailRef.current.value, passwordRef.current.value);
        else onSignup(emailRef.current.value, passwordRef.current.value);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 pb-20 sm:pb-0">
            <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg mx-4 my-8">
                <button onClick={() => setView('landing')} className="text-indigo-600 dark:text-indigo-400 hover:underline mb-4">&larr; Back to Welcome</button>
                <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white">{mode === 'login' ? 'Login' : 'Create Account'}</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label><input ref={emailRef} type="email" required className="w-full px-3 py-2 mt-1 text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label><input ref={passwordRef} type="password" required className="w-full px-3 py-2 mt-1 text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                    <button type="submit" className="w-full py-2 px-4 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none">{mode === 'login' ? 'Login' : 'Sign Up'}</button>
                </form>
                
                <div className="mt-6">
                    <div className="relative mb-4"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300 dark:border-gray-600"></div></div><div className="relative flex justify-center text-sm"><span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or continue with</span></div></div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => onProviderLogin('google')} className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none">
                             <GoogleIcon />
                             Google
                        </button>
                        <button onClick={() => onProviderLogin('github')} className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none">
                            <GitHubIcon />
                            GitHub
                        </button>
                        <button onClick={() => onProviderLogin('yahoo')} className="col-span-2 flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none">
                             <YahooIcon />
                             Sign in with Yahoo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const UploadForm = ({ onUpload, showMessage, defaultType }) => {
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [fileType, setFileType] = useState(defaultType || 'video');
    useEffect(() => { setFileType(defaultType || 'video'); }, [defaultType]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (isUploading) return;
        const form = event.target;
        const videoFile = form.querySelector('#video-file').files[0];
        const title = form.querySelector('#video-title').value;
        const description = form.querySelector('#video-description').value || ""; 
        let thumbnailFile = null;
        if (fileType === 'video') {
            const thumbInput = form.querySelector('#thumbnail-file');
            if (thumbInput && thumbInput.files.length > 0) {
                thumbnailFile = thumbInput.files[0];
            }
        }
        if (!videoFile || !title) { showMessage({ text: 'Please select a video file and enter a title.', type: 'error' }); return; }
        setIsUploading(true);
        await onUpload({ videoFile, thumbnailFile, title, description, type: fileType, onProgress: setUploadProgress });
        setIsUploading(false); setUploadProgress(0); form.reset();
    };

    return (
        <div className="max-w-2xl mx-auto p-6 sm:p-8 bg-white dark:bg-gray-800 rounded-lg mt-10 shadow-xl mb-20 sm:mb-0">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Upload New Content</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <select value={fileType} onChange={(e) => setFileType(e.target.value)} className="w-full px-3 py-2 text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"><option value="video">Video (Long Form)</option><option value="byte">Byte (Short Form)</option></select>
                <input type="text" id="video-title" placeholder="Title" required className="w-full px-3 py-2 text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <textarea id="video-description" rows="3" placeholder="Description (Optional)" className="w-full px-3 py-2 text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Video/Byte File</label><input type="file" id="video-file" accept="video/*" required className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 mt-1" /></div>
                {fileType === 'video' && (
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Thumbnail Image (Optional)</label><input type="file" id="thumbnail-file" accept="image/*" className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 mt-1" /></div>
                )}
                {isUploading && (
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mt-4 overflow-hidden relative">
                        <div className="bg-indigo-600 h-4 rounded-full transition-all duration-300 ease-out flex items-center justify-center text-[10px] text-white font-bold" style={{ width: `${uploadProgress}%` }}>{uploadProgress > 0 && `${uploadProgress.toFixed(0)}%`}</div>
                    </div>
                )}
                <button type="submit" disabled={isUploading} className="w-full py-2 px-4 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed">{isUploading ? `Uploading...` : 'Upload'}</button>
            </form>
        </div>
    );
};

const WatchView = ({ video, onBack, onSubscribe, onNavigateToChannel, currentUser }) => {
    if (!video) return null;
    return (
        <div className="p-4 sm:p-8 pb-24 sm:pb-8">
            <button onClick={onBack} className="mb-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-full hover:bg-gray-300 dark:hover:bg-gray-600">&larr; Back</button>
            <div className="bg-black rounded-lg overflow-hidden"><video src={video.videoUrl} controls autoPlay className="w-full max-h-[70vh]"></video></div>
            <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{video.title}</h1>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-2 space-y-2 sm:space-y-0">
                    <div className="flex items-center space-x-4">
                        <span className="text-lg text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline" onClick={() => onNavigateToChannel(video.uploaderId)}>{video.uploaderName}</span>
                        <SubscriberCount uploaderId={video.uploaderId} />
                    </div>
                    {currentUser && currentUser.uid !== video.uploaderId && <button onClick={() => onSubscribe(video.uploaderId)} className="px-6 py-2 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700">Subscribe</button>}
                </div>
                <p className="text-gray-600 dark:text-gray-300 mt-4">{video.description}</p>
            </div>
        </div>
    );
};

const BytesPlayer = ({ bytes, startIndex, onBack, onSubscribe, onNavigateToChannel, currentUser }) => {
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const videoRef = useRef(null);
    const touchStartY = useRef(0);
    const currentByte = bytes[currentIndex];
    const goToNext = () => setCurrentIndex(i => Math.min(i + 1, bytes.length - 1));
    const goToPrev = () => setCurrentIndex(i => Math.max(i - 1, 0));
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowUp') { e.preventDefault(); goToPrev(); } 
            else if (e.key === 'ArrowDown') { e.preventDefault(); goToNext(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [bytes.length]);
    useEffect(() => { if (videoRef.current) videoRef.current.play().catch(console.error); }, [currentIndex]);
    const handleTouchStart = (e) => touchStartY.current = e.targetTouches[0].clientY;
    const handleTouchEnd = (e) => {
        const touchEndY = e.changedTouches[0].clientY;
        const swipeDistance = touchStartY.current - touchEndY;
        if (Math.abs(swipeDistance) > 50) { if (swipeDistance > 0) goToNext(); else goToPrev(); }
    };
    if (!currentByte) return null;
    return (
        <div className="relative w-full h-[calc(100vh-68px)] bg-black flex items-center justify-center pb-safe" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <button onClick={onBack} className="absolute top-4 left-4 z-30 px-4 py-2 bg-gray-800 bg-opacity-50 text-white rounded-full hover:bg-opacity-75">&larr; Back</button>
            <div className="relative w-full sm:w-auto h-full max-w-sm flex items-center justify-center">
                <video ref={videoRef} key={currentByte.id} src={currentByte.videoUrl} autoPlay loop muted playsInline className="w-full h-full object-contain"></video>
                <div className="absolute bottom-0 left-0 p-4 text-white z-20 bg-gradient-to-t from-black/70 to-transparent w-full">
                    <h3 className="font-bold text-lg">{currentByte.title}</h3>
                    <p className="text-sm mt-1">{currentByte.description}</p>
                    <div className="flex items-center justify-between mt-3">
                        <div className="cursor-pointer hover:underline" onClick={() => onNavigateToChannel(currentByte.uploaderId)}>
                            <span className="text-indigo-300 font-semibold">{currentByte.uploaderName}</span>
                            <SubscriberCount uploaderId={currentByte.uploaderId} />
                        </div>
                        {currentUser && currentUser.uid !== currentByte.uploaderId && <button onClick={() => onSubscribe(currentByte.uploaderId)} className="px-4 py-1.5 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700 text-sm">Subscribe</button>}
                    </div>
                </div>
            </div>
            <button onClick={goToPrev} disabled={currentIndex === 0} className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 p-3 bg-gray-800 bg-opacity-50 rounded-full disabled:opacity-20 hover:bg-opacity-75"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg></button>
            <button onClick={goToNext} disabled={currentIndex === bytes.length - 1} className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 p-3 bg-gray-800 bg-opacity-50 rounded-full disabled:opacity-20 hover:bg-opacity-75"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>
        </div>
    );
};

const EditProfileModal = ({ userProfile, onSave, onCancel }) => {
    const [name, setName] = useState(userProfile.name);
    const [description, setDescription] = useState(userProfile.description || '');
    const [profileImageFile, setProfileImageFile] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const handleSave = async () => { setIsSaving(true); await onSave({ name, description, profileImageFile }); setIsSaving(false); onCancel(); };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Edit Profile</h2>
                <div className="space-y-4">
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Channel Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 px-3 py-2 text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"/></div>
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Channel Description</label><textarea rows="4" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full mt-1 px-3 py-2 text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"></textarea></div>
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Profile Picture</label><input type="file" accept="image/*" onChange={(e) => setProfileImageFile(e.target.files[0])} className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 mt-1"/></div>
                </div>
                <div className="flex justify-end space-x-4 mt-8">
                    <button onClick={onCancel} className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-500">{isSaving ? 'Saving...' : 'Save Changes'}</button>
                </div>
            </div>
        </div>
    );
};

const ChannelPage = ({ userId, currentUser, allVideos, allBytes, onWatch, onNavigateToChannel, onSubscribe, onEditProfile }) => {
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        if (!userId) return;
        setIsLoading(true);
        // Simplified Path: 'users'
        const userRef = doc(db, 'users', userId);
        const unsubscribe = onSnapshot(userRef, (doc) => {
            if (doc.exists()) setProfile({ id: doc.id, ...doc.data() });
            else console.error("User profile not found!");
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [userId]);

    if (isLoading) return <div className="text-center py-20 text-gray-800 dark:text-white">Loading Channel...</div>;
    if (!profile) return <div className="text-center py-20 text-gray-800 dark:text-white">Channel not found.</div>;

    const userVideos = allVideos.filter(v => v.uploaderId === userId);
    const userBytes = allBytes.filter(b => b.uploaderId === userId);

    return (
        <div>
            <div className="p-4 sm:p-8 bg-gray-100 dark:bg-gray-800">
                <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 max-w-4xl mx-auto">
                    <img 
                        src={profile.profilePictureUrl} 
                        alt={profile.name} 
                        className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-indigo-500" 
                        onError={(e) => e.target.src=`https://placehold.co/128x128/7c3aed/ffffff?text=${profile.name ? profile.name[0].toUpperCase() : '?'}`}
                    />
                    <div className="text-center sm:text-left">
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{profile.name}</h1>
                        <p className="text-gray-600 dark:text-gray-300 mt-2 max-w-xl">{profile.description}</p>
                        <div className="mt-4 flex items-center justify-center sm:justify-start space-x-6">
                            <SubscriberCount uploaderId={userId} />
                            {currentUser?.uid === userId ? (
                                <button onClick={() => onEditProfile(profile)} className="px-4 py-2 bg-indigo-600 text-white rounded-full shadow-md hover:bg-indigo-700">Edit Profile</button>
                            ) : (
                                <button onClick={() => onSubscribe(userId)} className="px-4 py-2 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700">Subscribe</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <ContentGrid items={userVideos.map(v => ({...v, type: 'video'}))} title="Videos" onWatch={onWatch} onNavigateToChannel={onNavigateToChannel} />
            <ContentGrid items={userBytes.map(b => ({...b, type: 'byte'}))} title="Bytes" onWatch={onWatch} onNavigateToChannel={onNavigateToChannel} />
        </div>
    );
};

const NoBytesModal = ({ onGoToUpload, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 w-full max-w-md text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No Bytes Found</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">There are no short-form videos to watch. Be the first to add one!</p>
            <div className="flex justify-center space-x-4">
                <button onClick={onCancel} className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">Close</button>
                <button onClick={onGoToUpload} className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Go to Upload</button>
            </div>
        </div>
    </div>
);

const SettingsModal = ({ theme, onThemeChange, onCancel, sessions, onRevokeSession, currentUser, onLinkAccount }) => {
    const [activeTab, setActiveTab] = useState('general');
    const linkedProviders = currentUser?.providerData.map(p => p.providerId) || [];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
                    <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button onClick={() => setActiveTab('general')} className={`flex-1 py-3 text-sm font-medium text-center ${activeTab === 'general' ? 'text-indigo-600 border-b-2 border-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>General</button>
                    <button onClick={() => setActiveTab('connections')} className={`flex-1 py-3 text-sm font-medium text-center ${activeTab === 'connections' ? 'text-indigo-600 border-b-2 border-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>Connections</button>
                    <button onClick={() => setActiveTab('security')} className={`flex-1 py-3 text-sm font-medium text-center ${activeTab === 'security' ? 'text-indigo-600 border-b-2 border-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>Devices</button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {activeTab === 'general' && (
                        <div className="space-y-4">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme</p>
                            <button onClick={() => onThemeChange('light')} className={`w-full text-left p-3 rounded-md ${theme === 'light' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'}`}>Light</button>
                            <button onClick={() => onThemeChange('dark')} className={`w-full text-left p-3 rounded-md ${theme === 'dark' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'}`}>Dark</button>
                            <button onClick={() => onThemeChange('system')} className={`w-full text-left p-3 rounded-md ${theme === 'system' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'}`}>System Default</button>
                        </div>
                    )}

                    {activeTab === 'connections' && (
                        <div className="space-y-4">
                             <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Link Accounts</h3>
                             <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Connect other accounts to log in with them later.</p>
                             
                             {/* GOOGLE */}
                             <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div className="flex items-center">
                                    <div className="bg-white p-1 rounded-full mr-3"><GoogleIcon /></div>
                                    <span className="font-medium text-gray-900 dark:text-white">Google</span>
                                </div>
                                {linkedProviders.includes('google.com') ? (
                                    <span className="text-green-600 dark:text-green-400 text-sm font-bold">Connected</span>
                                ) : (
                                    <button onClick={() => onLinkAccount('google')} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">Link</button>
                                )}
                             </div>

                             {/* GITHUB */}
                             <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div className="flex items-center">
                                    <div className="bg-white p-1 rounded-full mr-3"><GitHubIcon /></div>
                                    <span className="font-medium text-gray-900 dark:text-white">GitHub</span>
                                </div>
                                {linkedProviders.includes('github.com') ? (
                                    <span className="text-green-600 dark:text-green-400 text-sm font-bold">Connected</span>
                                ) : (
                                    <button onClick={() => onLinkAccount('github')} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">Link</button>
                                )}
                             </div>

                             {/* YAHOO */}
                             <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div className="flex items-center">
                                    <div className="bg-white p-1 rounded-full mr-3"><YahooIcon /></div>
                                    <span className="font-medium text-gray-900 dark:text-white">Yahoo</span>
                                </div>
                                {linkedProviders.includes('yahoo.com') ? (
                                    <span className="text-green-600 dark:text-green-400 text-sm font-bold">Connected</span>
                                ) : (
                                    <button onClick={() => onLinkAccount('yahoo')} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">Link</button>
                                )}
                             </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Active Sessions</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Devices currently logged into your account.</p>
                            
                            <div className="space-y-3">
                                {sessions.length === 0 ? (
                                    <p className="text-sm text-gray-500">No active sessions found.</p>
                                ) : (
                                    sessions.map(session => (
                                        <div key={session.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">{session.deviceName}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Last active: {session.lastActive?.toDate().toLocaleDateString() || 'Just now'}</p>
                                                {session.id === localStorage.getItem('sessionId') && <span className="text-xs text-green-500 font-bold"> (This Device)</span>}
                                            </div>
                                            <button onClick={() => onRevokeSession(session.id)} className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium">
                                                Remove
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                     <button onClick={onCancel} className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">Done</button>
                </div>
            </div>
        </div>
    );
};

function App() {
    const [allVideos, setAllVideos] = useState([]);
    const [allBytes, setAllBytes] = useState([]);
    const [mySubscriptions, setMySubscriptions] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [currentUserProfile, setCurrentUserProfile] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [sessions, setSessions] = useState([]);

    const [view, setView] = useState('landing');
    const [authMode, setAuthMode] = useState('login');
    const [watchingContent, setWatchingContent] = useState(null);
    const [bytesPlayerData, setBytesPlayerData] = useState({ items: [], index: 0 });
    const [searchTerm, setSearchTerm] = useState('');
    const [viewingChannelId, setViewingChannelId] = useState(null);

    const [message, setMessage] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState(null);
    const [isNoBytesModalOpen, setIsNoBytesModalOpen] = useState(false);
    const [defaultUploadType, setDefaultUploadType] = useState('video');
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system');

    // Theme logic
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const applyTheme = (currentTheme) => {
            const root = document.documentElement;
            const isDark = currentTheme === 'dark' || (currentTheme === 'system' && mediaQuery.matches);
            root.classList.toggle('dark', isDark);
        };
        const handleSystemChange = (e) => {
            if (localStorage.getItem('theme') === 'system') {
                document.documentElement.classList.toggle('dark', e.matches);
            }
        };
        applyTheme(theme);
        mediaQuery.addEventListener('change', handleSystemChange);
        return () => { mediaQuery.removeEventListener('change', handleSystemChange); };
    }, [theme]);

    const handleThemeChange = (newTheme) => { setTheme(newTheme); localStorage.setItem('theme', newTheme); };
    
    // --- Session Management Logic ---
    const registerSession = async (user) => {
        let sessionId = localStorage.getItem('sessionId');
        if (!sessionId) {
            sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
            localStorage.setItem('sessionId', sessionId);
        }
        
        const sessionRef = doc(db, `users/${user.uid}/sessions`, sessionId);
        await setDoc(sessionRef, {
            id: sessionId,
            deviceName: getDeviceName(),
            lastActive: serverTimestamp(),
            userAgent: navigator.userAgent
        });
    };

    const checkSessionValidity = async (user) => {
        const sessionId = localStorage.getItem('sessionId');
        if (!sessionId) return true; 

        const sessionRef = doc(db, `users/${user.uid}/sessions`, sessionId);
        const docSnap = await getDoc(sessionRef);
        
        if (!docSnap.exists()) {
            await signOut(auth);
            localStorage.removeItem('sessionId');
            setView('landing');
            showMessageHandler("You were logged out from another device.", "error");
            return false;
        }
        return true;
    };

    const handleRevokeSession = async (sessionId) => {
        if (!currentUser) return;
        try {
            await deleteDoc(doc(db, `users/${currentUser.uid}/sessions`, sessionId));
            if (sessionId === localStorage.getItem('sessionId')) {
                await signOut(auth);
                localStorage.removeItem('sessionId');
                setView('landing');
            }
            showMessageHandler("Device removed successfully.", "success");
        } catch (e) {
            console.error(e);
            showMessageHandler("Failed to remove device.", "error");
        }
    };

    const handleLinkAccount = async (providerName) => {
        if (!currentUser) return;
        let provider;
        switch(providerName) {
            case 'google': provider = new GoogleAuthProvider(); break;
            case 'github': provider = new GithubAuthProvider(); break;
            case 'yahoo': provider = new OAuthProvider('yahoo.com'); break;
            default: return;
        }
        
        try {
            await linkWithPopup(currentUser, provider);
            showMessageHandler("Account linked successfully!", "success");
        } catch (error) {
            if (error.code === 'auth/credential-already-in-use') {
                showMessageHandler("Account exists. Switching to it...", "info");
                await signInWithPopup(auth, provider);
            } else {
                console.error("Link error:", error);
                showMessageHandler(error.message, "error");
            }
        }
    };

    useEffect(() => {
        let userProfileUnsubscribe = null;
        let sessionsUnsubscribe = null;
        let subscriptionsUnsubscribe = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            // --- SAFETY NET FIX ---
            try {
                if (user && !user.isAnonymous) {
                    const isValid = await checkSessionValidity(user);
                    if (!isValid) return;

                    await registerSession(user);
                    setCurrentUser(user);
                    
                    // Simplified Path: 'users'
                    const userRef = doc(db, 'users', user.uid);
                    userProfileUnsubscribe = onSnapshot(userRef, async (doc) => {
                        if (doc.exists()) {
                            setCurrentUserProfile(doc.data());
                        } else {
                            const name = user.displayName || `User-${user.uid.substring(0, 6)}`;
                            const profilePic = user.photoURL || `https://placehold.co/128x128/7c3aed/ffffff?text=${name[0].toUpperCase()}`;
                            const newProfile = { email: user.email, name: name, createdAt: serverTimestamp(), description: "Welcome to my channel!", profilePictureUrl: profilePic };
                            await setDoc(userRef, newProfile);
                            setCurrentUserProfile(newProfile);
                        }
                    });

                    // Simplified Path: 'users/{uid}/sessions'
                    const sessionsRef = collection(db, `users/${user.uid}/sessions`);
                    sessionsUnsubscribe = onSnapshot(sessionsRef, (snapshot) => {
                         setSessions(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
                    });

                    // Simplified Path: 'subscribers'
                    const subsQuery = query(collection(db, 'subscribers'), where("subscriberId", "==", user.uid));
                    subscriptionsUnsubscribe = onSnapshot(subsQuery, (snapshot) => {
                        setMySubscriptions(snapshot.docs.map(d => d.data().uploaderId));
                    });

                } else if (user && user.isAnonymous) {
                    setCurrentUser(user);
                    setCurrentUserProfile(null);
                } else {
                    setCurrentUser(null);
                    setCurrentUserProfile(null);
                    setSessions([]);
                    setMySubscriptions([]);
                    if (userProfileUnsubscribe) userProfileUnsubscribe();
                    if (sessionsUnsubscribe) sessionsUnsubscribe();
                    if (subscriptionsUnsubscribe) subscriptionsUnsubscribe();
                }
            } catch (error) {
                console.error("Auth Error (Ignored for safety):", error);
                // The app MUST load even if DB read fails
            } finally {
                 setIsAuthReady(true);
            }
        });

        // Simplified Paths for videos/bytes
        const unsubVideos = onSnapshot(query(collection(db, 'videos')), (s) => {
            setAllVideos(s.docs.map(d=>({id: d.id, ...d.data()})).sort((a,b)=>(b.createdAt?.toMillis()||0)-(a.createdAt?.toMillis()||0)));
        }, console.error);

        const unsubBytes = onSnapshot(query(collection(db, 'bytes')), (s) => {
            setAllBytes(s.docs.map(d=>({id:d.id, ...d.data()})).sort((a,b)=>(b.createdAt?.toMillis()||0)-(a.createdAt?.toMillis()||0)));
        }, console.error);

        return () => { 
            unsubscribeAuth(); 
            unsubVideos(); 
            unsubBytes(); 
            if (userProfileUnsubscribe) userProfileUnsubscribe(); 
            if (subscriptionsUnsubscribe) subscriptionsUnsubscribe();
        };
    }, []); 
    
    const showMessageHandler = (text, type = 'info') => { setMessage({ text, type }); setTimeout(() => setMessage(null), 4000); };
    const handleGuestLogin = async () => { try { await signInAnonymously(auth); setView('home'); } catch (e) { showMessageHandler("Could not sign in as guest.", 'error'); }};
    const handleSignup = async (email, password) => { try { await createUserWithEmailAndPassword(auth, email, password); showMessageHandler('Account created!', 'success'); setView('home'); } catch (e) { showMessageHandler(e.message, 'error'); }};
    const handleLogin = async (email, password) => { try { await signInWithEmailAndPassword(auth, email, password); showMessageHandler('Logged in!', 'success'); setView('home'); } catch (e) { showMessageHandler(e.message, 'error'); }};
    
    const handleGoogleLogin = async (providerMethod) => { 
        let provider;
        switch(providerMethod) {
            case 'google': provider = new GoogleAuthProvider(); break;
            case 'github': provider = new GithubAuthProvider(); break;
            case 'yahoo': provider = new OAuthProvider('yahoo.com'); break;
            default: return;
        }
        try { 
            await setPersistence(auth, browserLocalPersistence); 
            await signInWithPopup(auth, provider); 
            setView('home'); 
            showMessageHandler(`Logged in with ${providerMethod}!`, 'success'); 
        } catch (error) { console.error(error); showMessageHandler(error.message, 'error'); }
    };

    const handleLogout = async () => { 
        try { 
            if (currentUser && localStorage.getItem('sessionId')) {
                await deleteDoc(doc(db, `users/${currentUser.uid}/sessions`, localStorage.getItem('sessionId')));
            }
            localStorage.removeItem('sessionId');
            await signOut(auth); 
            setView('landing'); 
            showMessageHandler('Logged out.', 'success'); 
        } 
        catch (e) { showMessageHandler('Failed to log out.', 'error'); }
    };

    const handleNavigateToChannel = (userId) => { setViewingChannelId(userId); setView('channel'); };
    const handleWatchContent = (item) => {
        if (item.type === 'byte') { const itemIndex = allBytes.findIndex(b => b.id === item.id); setBytesPlayerData({ items: allBytes, index: itemIndex >= 0 ? itemIndex : 0 }); setView('bytesPlayer'); } 
        else { setWatchingContent(item); setView('watch'); }
    };
    const handleNavigateToBytes = () => { if (allBytes.length > 0) { setBytesPlayerData({ items: allBytes, index: 0 }); setView('bytesPlayer'); } else { setIsNoBytesModalOpen(true); }};
    const handleGoToUploadFromModal = () => { setIsNoBytesModalOpen(false); setDefaultUploadType('byte'); setView('upload'); };
    const handleSetView = (view) => { if (view !== 'upload') { setDefaultUploadType('video'); } setView(view); setSearchTerm(''); };

    const handleUpload = async ({ videoFile, thumbnailFile, title, description, type, onProgress }) => {
        if (!currentUser || !currentUserProfile) { showMessageHandler('You must be logged in to upload.', 'error'); return; }
        const uploadFile = (file, path, cb) => new Promise((res, rej) => { const task = uploadBytesResumable(ref(storage, path), file); task.on('state_changed', (s) => cb && cb((s.bytesTransferred / s.totalBytes) * 100), rej, async () => res(await getDownloadURL(task.snapshot.ref))); });
        try { 
            const timestamp = Date.now(); 
            const videoUrl = await uploadFile(videoFile, `content/${currentUser.uid}/${timestamp}_${videoFile.name}`, onProgress); 
            let thumbnailUrl = null;
            if (thumbnailFile) {
                thumbnailUrl = await uploadFile(thumbnailFile, `content/${currentUser.uid}/${timestamp}_${thumbnailFile.name}`, null);
            } else {
                thumbnailUrl = type === 'byte' 
                    ? `https://placehold.co/400x600/7c3aed/ffffff?text=${encodeURIComponent(title)}` 
                    : `https://placehold.co/600x400/4338ca/ffffff?text=${encodeURIComponent(title)}`;
            }

            // Simplified Path
            await addDoc(collection(db, `${type}s`), { title, description, videoUrl, thumbnailUrl, uploaderId: currentUser.uid, uploaderName: currentUserProfile.name || 'User', createdAt: serverTimestamp() }); 
            showMessageHandler(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded!`, 'success'); handleSetView('home'); 
        } 
        catch (e) { console.error(e); showMessageHandler('Upload failed. Please try again.', 'error'); }
    };

    const handleSubscribe = async (uploaderId) => {
        if (!currentUser) { showMessageHandler('You must be logged in to subscribe.', 'error'); return; }
        if (currentUser.uid === uploaderId) { showMessageHandler('You cannot subscribe to yourself.', 'error'); return; }
        const subsPath = 'subscribers';
        const q = query(collection(db, subsPath), where("subscriberId", "==", currentUser.uid), where("uploaderId", "==", uploaderId));
        const snap = await getDocs(q);
        if (snap.empty) { await addDoc(collection(db, subsPath), { subscriberId: currentUser.uid, uploaderId, createdAt: serverTimestamp() }); showMessageHandler('Subscribed!', 'success'); } 
        else { showMessageHandler('Already subscribed.', 'info'); }
    };

    const handleOpenEditModal = (profile) => { setEditingProfile(profile); setIsEditModalOpen(true); };
    const handleCloseEditModal = () => { setIsEditModalOpen(false); setEditingProfile(null); };
    const handleUpdateProfile = async ({ name, description, profileImageFile }) => {
        if (!currentUser) return;
        const userRef = doc(db, 'users', currentUser.uid);
        const updateData = { name, description };
        if (profileImageFile) { const uploadFile = (file, path) => new Promise((res, rej) => { const task = uploadBytesResumable(ref(storage, path), file); task.on('state_changed', null, rej, async () => res(await getDownloadURL(task.snapshot.ref))); }); try { const newProfilePictureUrl = await uploadFile(profileImageFile, `profile-pictures/${currentUser.uid}/${Date.now()}_${profileImageFile.name}`); updateData.profilePictureUrl = newProfilePictureUrl; } catch (error) { showMessageHandler('Failed to upload profile picture.', 'error'); return; } }
        await updateDoc(userRef, updateData);
        if (name !== currentUserProfile.name) {
            const videosQuery = query(collection(db, 'videos'), where("uploaderId", "==", currentUser.uid));
            const bytesQuery = query(collection(db, 'bytes'), where("uploaderId", "==", currentUser.uid));
            const [videoDocs, byteDocs] = await Promise.all([getDocs(videosQuery), getDocs(bytesQuery)]);
            const updatePromises = [];
            videoDocs.forEach(d => updatePromises.push(updateDoc(d.ref, { uploaderName: name })));
            byteDocs.forEach(d => updatePromises.push(updateDoc(d.ref, { uploaderName: name })));
            await Promise.all(updatePromises);
        }
        showMessageHandler('Profile updated successfully!', 'success');
    };

    const filteredVideos = allVideos.filter(v => v.title.toLowerCase().includes(searchTerm.toLowerCase()) || v.description.toLowerCase().includes(searchTerm.toLowerCase()) || v.uploaderName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const renderContent = () => {
        if (!isAuthReady) return <div className="flex justify-center items-center h-screen text-xl text-gray-500">Connecting to VideoHub...</div>;
        switch (view) {
            case 'landing': return <LandingPage handleGuestLogin={handleGuestLogin} setView={handleSetView} setAuthMode={setAuthMode} />;
            case 'authForm': return <AuthForm mode={authMode} onLogin={handleLogin} onSignup={handleSignup} onProviderLogin={handleGoogleLogin} setView={handleSetView} />;
            case 'upload': return <UploadForm onUpload={handleUpload} showMessage={showMessageHandler} defaultType={defaultUploadType} />;
            case 'watch': return <WatchView video={watchingContent} onBack={() => handleSetView('home')} onSubscribe={handleSubscribe} onNavigateToChannel={handleNavigateToChannel} currentUser={currentUser} />;
            case 'bytesPlayer': return <BytesPlayer bytes={bytesPlayerData.items} startIndex={bytesPlayerData.index} onBack={() => handleSetView('home')} onSubscribe={handleSubscribe} onNavigateToChannel={handleNavigateToChannel} currentUser={currentUser} />;
            case 'channel': return <ChannelPage userId={viewingChannelId} currentUser={currentUser} allVideos={allVideos} allBytes={allBytes} onWatch={handleWatchContent} onNavigateToChannel={handleNavigateToChannel} onSubscribe={handleSubscribe} onEditProfile={handleOpenEditModal} />;
            case 'home': 
            case 'subscriptions':
                return <ContentGrid items={contentToDisplay} title={pageTitle} emptyMessage={emptyMsg} onWatch={handleWatchContent} onNavigateToChannel={handleNavigateToChannel} />;
            default: return <ContentGrid items={contentToDisplay} title="All Videos" onWatch={handleWatchContent} onNavigateToChannel={handleNavigateToChannel} />;
        }
    };

    return (
        <div className="bg-gray-100 dark:bg-gray-950 min-h-screen text-gray-900 dark:text-white font-sans">
            <style>{`.animate-fade-in-out { animation: fadeInOut 4s ease-in-out; } @keyframes fadeInOut { 0%, 100% { opacity: 0; transform: translateY(-20px); } 15%, 85% { opacity: 1; transform: translateY(0); } }`}</style>
            <Message message={message} />
            {view !== 'landing' && view !== 'authForm' && <Navbar currentUser={currentUser} currentUserProfile={currentUserProfile} onLogout={handleLogout} onSetView={handleSetView} onNavigateToChannel={handleNavigateToChannel} onNavigateToBytes={handleNavigateToBytes} searchTerm={searchTerm} onSearchChange={setSearchTerm} onOpenSettings={() => setIsSettingsModalOpen(true)} showMessage={showMessageHandler} />}
            {view !== 'landing' && view !== 'authForm' && <BottomNav currentUser={currentUser} currentUserProfile={currentUserProfile} currentView={view} onSetView={handleSetView} onNavigateToBytes={handleNavigateToBytes} onNavigateToChannel={handleNavigateToChannel} showMessage={showMessageHandler} />}
            {isEditModalOpen && <EditProfileModal userProfile={editingProfile} onSave={handleUpdateProfile} onCancel={handleCloseEditModal} />}
            {isNoBytesModalOpen && <NoBytesModal onGoToUpload={handleGoToUploadFromModal} onCancel={() => setIsNoBytesModalOpen(false)} />}
            {isSettingsModalOpen && <SettingsModal theme={theme} onThemeChange={handleThemeChange} onCancel={() => setIsSettingsModalOpen(false)} currentUser={currentUser} onLinkAccount={handleLinkAccount} />}
            <main className={view === 'bytesPlayer' ? '' : 'container mx-auto max-w-7xl px-2'}>{renderContent()}</main>
        </div>
    );
}

export default App;

