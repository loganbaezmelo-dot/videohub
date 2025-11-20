import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, signInAnonymously, onAuthStateChanged, createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup
} from 'firebase/auth';
import { 
    getFirestore, doc, getDoc, addDoc, onSnapshot, collection, query, where, 
    getDocs, serverTimestamp, setDoc, updateDoc
} from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyAvG02ZrkIJk7A0C2KyGAQZSdeEpKNYz0Q",
  authDomain: "video-website-64dab.firebaseapp.com",
  projectId: "video-website-64dab",
  storageBucket: "video-website-64dab.appspot.com",
  messagingSenderId: "339989741883",
  appId: "1:339989741883:web:fe58607ad7cf36eb86371e",
  measurementId: "G-4XMY4TXS7G"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const appId = firebaseConfig.appId;

// --- Helper Components ---

const Message = ({ message }) => {
    if (!message) return null;
    const { text, type } = message;
    const bgColor = type === 'error' ? 'bg-red-500' : 'bg-green-500';
    return <div className={`fixed top-5 right-5 ${bgColor} text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in-out z-[9999]`}>{text}</div>;
};

const SubscriberCount = ({ uploaderId }) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!uploaderId || !appId) return;
        const q = query(collection(db, `/artifacts/${appId}/public/data/subscribers`), where("uploaderId", "==", uploaderId));
        const unsubscribe = onSnapshot(q, (s) => setCount(s.size), console.error);
        return () => unsubscribe();
    }, [uploaderId]);
    return <span className="text-xs text-gray-500 dark:text-gray-400">{count} Subscribers</span>;
};

// --- BOTTOM NAV (Mobile Only) ---
const BottomNav = ({ currentUser, currentUserProfile, currentView, onSetView, onNavigateToBytes, onNavigateToChannel }) => {
    const isActive = (viewName) => currentView === viewName;
    const activeClass = "text-indigo-600 dark:text-indigo-400";
    const inactiveClass = "text-gray-500 dark:text-gray-400";

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-around items-center py-2 z-50 pb-safe">
            <button onClick={() => onSetView('home')} className={`flex flex-col items-center space-y-1 ${isActive('home') ? activeClass : inactiveClass}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                <span className="text-[10px] font-medium">Videos</span>
            </button>
            <button onClick={onNavigateToBytes} className={`flex flex-col items-center space-y-1 ${isActive('bytesPlayer') ? activeClass : inactiveClass}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-[10px] font-medium">Bytes</span>
            </button>
            <button onClick={() => onSetView('upload')} className={`flex flex-col items-center space-y-1 ${isActive('upload') ? activeClass : inactiveClass}`}>
                <div className="bg-indigo-600 dark:bg-indigo-500 text-white rounded-full p-1 -mt-4 shadow-lg border-4 border-white dark:border-gray-900">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                </div>
                <span className="text-[10px] font-medium">Upload</span>
            </button>
            <button onClick={() => currentUser ? onNavigateToChannel(currentUser.uid) : onSetView('landing')} className={`flex flex-col items-center space-y-1 ${isActive('channel') ? activeClass : inactiveClass}`}>
                {currentUser && currentUserProfile ? (
                     <img src={currentUserProfile.profilePictureUrl} alt="Me" className={`h-6 w-6 rounded-full object-cover ${isActive('channel') ? 'ring-2 ring-indigo-600' : ''}`} onError={(e) => e.target.src=`https://placehold.co/24x24/7c3aed/ffffff?text=${currentUserProfile.name ? currentUserProfile.name[0] : '?'}`}/>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                )}
                <span className="text-[10px] font-medium">Me</span>
            </button>
        </div>
    );
};

// --- TOP NAVBAR ---
const Navbar = ({ currentUser, currentUserProfile, onLogout, onSetView, onNavigateToChannel, onNavigateToBytes, searchTerm, onSearchChange, onOpenSettings }) => {
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (event) => { if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) setIsProfileMenuOpen(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    
    return (
        <nav className="bg-white dark:bg-gray-900 p-4 text-gray-800 dark:text-white shadow-md sticky top-0 z-40 border-b border-gray-200 dark:border-gray-700">
            <div className="container mx-auto flex items-center justify-between">
                <h1 onClick={() => onSetView('home')} className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer flex-shrink-0">VideoHub</h1>
                <div className="flex-grow flex justify-center mx-2 sm:mx-4">
                    <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} className="w-full max-w-md px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
                <div className="flex space-x-2 sm:space-x-4 items-center flex-shrink-0 relative">
                    {/* Hidden on mobile/small tablets (md:block) */}
                    <button onClick={() => { onSetView('home'); onSearchChange(''); }} className="hidden md:block px-4 py-2 bg-indigo-600 text-white rounded-full shadow-md hover:bg-indigo-700 transition-colors">Home</button>
                    <button onClick={onNavigateToBytes} className="hidden md:block px-4 py-2 bg-purple-600 text-white rounded-full shadow-md hover:bg-purple-700 transition-colors">Bytes</button>
                    
                    {currentUser ? (
                        <>
                            {/* Upload button hidden on mobile */}
                            <button onClick={() => onSetView('upload')} className="hidden md:block px-3 py-2 sm:px-4 sm:py-2 bg-green-600 text-white rounded-full shadow-md hover:bg-green-700 transition-colors text-sm sm:text-base">Upload</button>
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

const ContentGrid = ({ items, onWatch, onNavigateToChannel, title }) => (
    <div className="p-4 sm:p-8 pb-20 sm:pb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 border-b-2 border-indigo-500 pb-2">{title}</h2>
        {items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {items.map(item => <ContentCard key={item.id} item={item} onWatch={onWatch} onNavigateToChannel={onNavigateToChannel} />)}
            </div>
        ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center mt-10">No content found here.</p>
        )}
    </div>
);

const LandingPage = ({ handleGuestLogin, setView, setAuthMode }) => (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 pb-20 sm:pb-0">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md w-full mx-4">
            <h1 className="text-5xl font-bold text-indigo-600 dark:text-indigo-400 mb-4">Welcome to VideoHub</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-8">Your new favorite place for videos and shorts.</p>
            <div className="space-y-4">
                <button onClick={handleGuestLogin} className="w-full py-3 px-4 text-white bg-gray-600 rounded-md hover:bg-gray-700 transition-colors text-lg">Continue as Guest</button>
                <button onClick={() => { setAuthMode('login'); setView('authForm'); }} className="w-full py-3 px-4 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors text-lg">Login</button>
                <button onClick={() => { setAuthMode('signup'); setView('authForm'); }} className="w-full py-3 px-4 text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors text-lg">Create Account</button>
            </div>
        </div>
    </div>
);

const AuthForm = ({ mode, onLogin, onSignup, onGoogleLogin, setView }) => {
    const emailRef = useRef();
    const passwordRef = useRef();
    const handleSubmit = (e) => {
        e.preventDefault();
        if (mode === 'login') onLogin(emailRef.current.value, passwordRef.current.value);
        else onSignup(emailRef.current.value, passwordRef.current.value);
    };
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 pb-20 sm:pb-0">
            <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg mx-4">
                <button onClick={() => setView('landing')} className="text-indigo-600 dark:text-indigo-400 hover:underline mb-4">&larr; Back to Welcome</button>
                <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white">{mode === 'login' ? 'Login' : 'Create Account'}</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label><input ref={emailRef} type="email" required className="w-full px-3 py-2 mt-1 text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label><input ref={passwordRef} type="password" required className="w-full px-3 py-2 mt-1 text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                    <button type="submit" className="w-full py-2 px-4 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none">{mode === 'login' ? 'Login' : 'Sign Up'}</button>
                </form>
                <div className="mt-4">
                    <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300 dark:border-gray-600"></div></div><div className="relative flex justify-center text-sm"><span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or continue with</span></div></div>
                    <button onClick={onGoogleLogin} className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600">Sign in with Google</button>
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
        const thumbnailFile = form.querySelector('#thumbnail-file').files[0];
        const title = form.querySelector('#video-title').value;
        const description = form.querySelector('#video-description').value;
        if (!videoFile || !thumbnailFile || !title) { showMessage({ text: 'Please fill out all fields.', type: 'error' }); return; }
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
                <textarea id="video-description" rows="3" placeholder="Description" required className="w-full px-3 py-2 text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Video/Byte File</label><input type="file" id="video-file" accept="video/*" required className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 mt-1" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Thumbnail Image</label><input type="file" id="thumbnail-file" accept="image/*" required className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 mt-1" /></div>
                {isUploading && <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5"><div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div></div>}
                <button type="submit" disabled={isUploading} className="w-full py-2 px-4 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed">{isUploading ? `Uploading... ${uploadProgress.toFixed(0)}%` : 'Upload'}</button>
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
        const userRef = doc(db, `/artifacts/${appId}/public/data/users`, userId);
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
                    <img src={profile.profilePictureUrl} alt={profile.name} className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-indigo-500" onError={(e) => e.target.src=`https://placehold.co/128x128/7c3aed/ffffff?text=${profile.name ? profile.name[0].toUpperCase() : '?'}`}/>
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

const SettingsModal = ({ theme, onThemeChange, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 w-full max-w-sm">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h2>
            <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme</p>
                <button onClick={() => onThemeChange('light')} className={`w-full text-left p-3 rounded-md ${theme === 'light' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white'}`}>Light</button>
                <button onClick={() => onThemeChange('dark')} className={`w-full text-left p-3 rounded-md ${theme === 'dark' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white'}`}>Dark</button>
                <button onClick={() => onThemeChange('system')} className={`w-full text-left p-3 rounded-md ${theme === 'system' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white'}`}>System Default</button>
            </div>
            <div className="flex justify-end mt-8">
                <button onClick={onCancel} className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">Done</button>
            </div>
        </div>
    </div>
);

function App() {
    const [allVideos, setAllVideos] = useState([]);
    const [allBytes, setAllBytes] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [currentUserProfile, setCurrentUserProfile] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

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
    
    useEffect(() => {
        let userProfileUnsubscribe = null;
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user && !user.isAnonymous) {
                setCurrentUser(user);
                const userRef = doc(db, `/artifacts/${appId}/public/data/users`, user.uid);
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
            } else if (user && user.isAnonymous) {
                setCurrentUser(user);
                setCurrentUserProfile(null);
            } else {
                setCurrentUser(null);
                setCurrentUserProfile(null);
                if (userProfileUnsubscribe) userProfileUnsubscribe();
            }
            setIsAuthReady(true);
        });

        const unsubVideos = onSnapshot(query(collection(db, `/artifacts/${appId}/public/data/videos`)), (s) => {
            setAllVideos(s.docs.map(d=>({id: d.id, ...d.data()})).sort((a,b)=>(b.createdAt?.toMillis()||0)-(a.createdAt?.toMillis()||0)));
        }, console.error);

        const unsubBytes = onSnapshot(query(collection(db, `/artifacts/${appId}/public/data/bytes`)), (s) => {
            setAllBytes(s.docs.map(d=>({id:d.id, ...d.data()})).sort((a,b)=>(b.createdAt?.toMillis()||0)-(a.createdAt?.toMillis()||0)));
        }, console.error);

        return () => { unsubscribeAuth(); unsubVideos(); unsubBytes(); if (userProfileUnsubscribe) userProfileUnsubscribe(); };
    }, []); 
    
    const showMessageHandler = (text, type = 'info') => { setMessage({ text, type }); setTimeout(() => setMessage(null), 4000); };
    const handleGuestLogin = async () => { try { await signInAnonymously(auth); setView('home'); } catch (e) { showMessageHandler("Could not sign in as guest.", 'error'); }};
    const handleSignup = async (email, password) => { try { await createUserWithEmailAndPassword(auth, email, password); showMessageHandler('Account created!', 'success'); setView('home'); } catch (e) { showMessageHandler(e.message, 'error'); }};
    const handleLogin = async (email, password) => { try { await signInWithEmailAndPassword(auth, email, password); showMessageHandler('Logged in!', 'success'); setView('home'); } catch (e) { showMessageHandler(e.message, 'error'); }};
    const handleGoogleLogin = async () => { const provider = new GoogleAuthProvider(); try { await signInWithPopup(auth, provider); setView('home'); showMessageHandler('Logged in with Google!', 'success'); } catch (error) { console.error(error); showMessageHandler(error.message, 'error'); }};
    const handleLogout = async () => { try { await signOut(auth); setView('landing'); showMessageHandler('Logged out.', 'success'); } catch (e) { showMessageHandler('Failed to log out.', 'error'); }};

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
        try { const timestamp = Date.now(); const videoUrl = await uploadFile(videoFile, `content/${currentUser.uid}/${timestamp}_${videoFile.name}`, onProgress); const thumbnailUrl = await uploadFile(thumbnailFile, `content/${currentUser.uid}/${timestamp}_${thumbnailFile.name}`, null); await addDoc(collection(db, `/artifacts/${appId}/public/data/${type}s`), { title, description, videoUrl, thumbnailUrl, uploaderId: currentUser.uid, uploaderName: currentUserProfile.name || 'User', createdAt: serverTimestamp() }); showMessageHandler(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded!`, 'success'); handleSetView('home'); } 
        catch (e) { console.error(e); showMessageHandler('Upload failed. Please try again.', 'error'); }
    };

    const handleSubscribe = async (uploaderId) => {
        if (!currentUser) { showMessageHandler('You must be logged in to subscribe.', 'error'); return; }
        if (currentUser.uid === uploaderId) { showMessageHandler('You cannot subscribe to yourself.', 'error'); return; }
        const subsPath = `/artifacts/${appId}/public/data/subscribers`;
        const q = query(collection(db, subsPath), where("subscriberId", "==", currentUser.uid), where("uploaderId", "==", uploaderId));
        const snap = await getDocs(q);
        if (snap.empty) { await addDoc(collection(db, subsPath), { subscriberId: currentUser.uid, uploaderId, createdAt: serverTimestamp() }); showMessageHandler('Subscribed!', 'success'); } 
        else { showMessageHandler('Already subscribed.', 'info'); }
    };

    const handleOpenEditModal = (profile) => { setEditingProfile(profile); setIsEditModalOpen(true); };
    const handleCloseEditModal = () => { setIsEditModalOpen(false); setEditingProfile(null); };
    const handleUpdateProfile = async ({ name, description, profileImageFile }) => {
        if (!currentUser) return;
        const userRef = doc(db, `/artifacts/${appId}/public/data/users`, currentUser.uid);
        const updateData = { name, description };
        if (profileImageFile) { const uploadFile = (file, path) => new Promise((res, rej) => { const task = uploadBytesResumable(ref(storage, path), file); task.on('state_changed', null, rej, async () => res(await getDownloadURL(task.snapshot.ref))); }); try { const newProfilePictureUrl = await uploadFile(profileImageFile, `profile-pictures/${currentUser.uid}/${Date.now()}_${profileImageFile.name}`); updateData.profilePictureUrl = newProfilePictureUrl; } catch (error) { showMessageHandler('Failed to upload profile picture.', 'error'); return; } }
        await updateDoc(userRef, updateData);
        if (name !== currentUserProfile.name) {
            const videosQuery = query(collection(db, `/artifacts/${appId}/public/data/videos`), where("uploaderId", "==", currentUser.uid));
            const bytesQuery = query(collection(db, `/artifacts/${appId}/public/data/bytes`), where("uploaderId", "==", currentUser.uid));
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
            case 'authForm': return <AuthForm mode={authMode} onLogin={handleLogin} onSignup={handleSignup} onGoogleLogin={handleGoogleLogin} setView={handleSetView} />;
            case 'upload': return <UploadForm onUpload={handleUpload} showMessage={showMessageHandler} defaultType={defaultUploadType} />;
            case 'watch': return <WatchView video={watchingContent} onBack={() => handleSetView('home')} onSubscribe={handleSubscribe} onNavigateToChannel={handleNavigateToChannel} currentUser={currentUser} />;
            case 'bytesPlayer': return <BytesPlayer bytes={bytesPlayerData.items} startIndex={bytesPlayerData.index} onBack={() => handleSetView('home')} onSubscribe={handleSubscribe} onNavigateToChannel={handleNavigateToChannel} currentUser={currentUser} />;
            case 'channel': return <ChannelPage userId={viewingChannelId} currentUser={currentUser} allVideos={allVideos} allBytes={allBytes} onWatch={handleWatchContent} onNavigateToChannel={handleNavigateToChannel} onSubscribe={handleSubscribe} onEditProfile={handleOpenEditModal} />;
            case 'home': default: return <ContentGrid items={filteredVideos.map(v => ({...v, type: 'video'}))} title="All Videos" onWatch={handleWatchContent} onNavigateToChannel={handleNavigateToChannel} />;
        }
    };

    return (
        <div className="bg-gray-100 dark:bg-gray-950 min-h-screen text-gray-900 dark:text-white font-sans">
            <style>{`.animate-fade-in-out { animation: fadeInOut 4s ease-in-out; } @keyframes fadeInOut { 0%, 100% { opacity: 0; transform: translateY(-20px); } 15%, 85% { opacity: 1; transform: translateY(0); } }`}</style>
            <Message message={message} />
            {view !== 'landing' && view !== 'authForm' && <Navbar currentUser={currentUser} currentUserProfile={currentUserProfile} onLogout={handleLogout} onSetView={handleSetView} onNavigateToChannel={handleNavigateToChannel} onNavigateToBytes={handleNavigateToBytes} searchTerm={searchTerm} onSearchChange={setSearchTerm} onOpenSettings={() => setIsSettingsModalOpen(true)} />}
            {view !== 'landing' && view !== 'authForm' && <BottomNav currentUser={currentUser} currentUserProfile={currentUserProfile} currentView={view} onSetView={handleSetView} onNavigateToBytes={handleNavigateToBytes} onNavigateToChannel={handleNavigateToChannel} />}
            {isEditModalOpen && <EditProfileModal userProfile={editingProfile} onSave={handleUpdateProfile} onCancel={handleCloseEditModal} />}
            {isNoBytesModalOpen && <NoBytesModal onGoToUpload={handleGoToUploadFromModal} onCancel={() => setIsNoBytesModalOpen(false)} />}
            {isSettingsModalOpen && <SettingsModal theme={theme} onThemeChange={handleThemeChange} onCancel={() => setIsSettingsModalOpen(false)} />}
            <main className={view === 'bytesPlayer' ? '' : 'container mx-auto max-w-7xl px-2'}>{renderContent()}</main>
        </div>
    );
}

export default App;


