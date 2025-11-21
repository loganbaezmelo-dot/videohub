import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInAnonymously, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut 
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    getDoc, 
    addDoc, 
    onSnapshot, 
    collection, 
    query, 
    where, 
    getDocs, 
    serverTimestamp, 
    setDoc 
} from 'firebase/firestore';
import { 
    getStorage, 
    ref, 
    uploadBytesResumable, 
    getDownloadURL 
} from "firebase/storage";


// --- Firebase Configuration and Initialization ---
// Using the exact config you provided to ensure a direct connection.
const firebaseConfig = {
  apiKey: "AIzaSyAvG02ZrkIJk7A0C2KyGAQZSdeEpKNYz0Q",
  authDomain: "video-website-64dab.firebaseapp.com",
  projectId: "video-website-64dab",
  storageBucket: "video-website-64dab.appspot.com",
  messagingSenderId: "339989741883",
  appId: "1:339989741883:web:fe58607ad7cf36eb86371e",
  measurementId: "G-4XMY4TXS7G"
};

// Initialize Firebase with the hardcoded config.
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
// Use the appId from the config to build correct Firestore paths.
const appId = firebaseConfig.appId;


// --- Helper Components (No Changes Here) ---

const Message = ({ message }) => {
    if (!message) return null;
    const { text, type } = message;
    const bgColor = type === 'error' ? 'bg-red-500' : 'bg-green-500';
    return (
        <div className={`fixed top-5 right-5 ${bgColor} text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in-out z-50`}>
            {text}
        </div>
    );
};

const SubscriberCount = ({ uploaderId }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!uploaderId || !appId) return;
        const q = query(collection(db, `/artifacts/${appId}/public/data/subscribers`), where("uploaderId", "==", uploaderId));
        const unsubscribe = onSnapshot(q, (snapshot) => setCount(snapshot.size), console.error);
        return () => unsubscribe();
    }, [uploaderId]);

    return <span className="text-sm text-gray-400">{count} Subscribers</span>;
};

const Navbar = ({ currentUser, onLogout, onSetView, searchTerm, onSearchChange }) => (
    <nav className="bg-gray-900 p-4 text-white shadow-lg sticky top-0 z-40 border-b border-gray-700">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
            <h1 onClick={() => onSetView('home')} className="text-2xl font-bold text-indigo-400 cursor-pointer flex-shrink-0">VideoHub</h1>
            <div className="flex-grow flex justify-center mx-4 w-full sm:w-auto">
                <input type="text" placeholder="Search content..." value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} className="w-full max-w-md px-4 py-2 rounded-full bg-gray-800 text-gray-100 placeholder-gray-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
            </div>
            <div className="flex space-x-2 items-center flex-shrink-0">
                <button onClick={() => { onSetView('home'); onSearchChange(''); }} className="px-4 py-2 bg-indigo-600 text-white rounded-full shadow-md hover:bg-indigo-700 transition-colors">Home</button>
                <button onClick={() => { onSetView('bytes'); onSearchChange(''); }} className="px-4 py-2 bg-purple-600 text-white rounded-full shadow-md hover:bg-purple-700 transition-colors">Bytes</button>
                {currentUser ? (
                    <>
                        <button onClick={() => onSetView('upload')} className="px-4 py-2 bg-green-600 text-white rounded-full shadow-md hover:bg-green-700 transition-colors">Upload</button>
                        <button onClick={onLogout} className="px-4 py-2 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700 transition-colors">Logout</button>
                    </>
                ) : (
                    <button onClick={() => onSetView('landing')} className="px-4 py-2 bg-blue-600 text-white rounded-full shadow-md hover:bg-blue-700 transition-colors">Login / Sign Up</button>
                )}
            </div>
        </div>
    </nav>
);

const ContentCard = ({ item, onWatch }) => (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300 transform hover:-translate-y-1 cursor-pointer" onClick={() => onWatch(item)}>
        <img src={item.thumbnailUrl} alt={item.title} className="w-full h-48 object-cover" onError={(e) => e.target.src='https://placehold.co/600x400/1f2937/7c3aed?text=Image+Error'}/>
        <div className="p-4">
            <h3 className="font-bold text-lg text-white truncate">{item.title}</h3>
            <p className="text-gray-400 text-sm mt-1 truncate">{item.description}</p>
            <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-indigo-400 font-semibold">{item.uploaderName}</span>
                <SubscriberCount uploaderId={item.uploaderId} />
            </div>
        </div>
    </div>
);

const ContentGrid = ({ items, onWatch, title }) => (
    <div className="p-4 sm:p-8">
        <h2 className="text-3xl font-bold text-white mb-6 border-b-2 border-indigo-500 pb-2">{title}</h2>
        {items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {items.map(item => <ContentCard key={item.id} item={item} onWatch={onWatch} />)}
            </div>
        ) : (
            <p className="text-gray-400 text-center mt-10">No content found. Please log in and upload a video to get started!</p>
        )}
    </div>
);

const LandingPage = ({ handleGuestLogin, setView, setAuthMode }) => (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center p-8 bg-gray-800 rounded-xl shadow-lg">
            <h1 className="text-5xl font-bold text-indigo-400 mb-4">Welcome to VideoHub</h1>
            <p className="text-gray-300 mb-8">Your new favorite place for videos and shorts.</p>
            <div className="space-y-4">
                <button onClick={handleGuestLogin} className="w-full py-3 px-4 text-white bg-gray-600 rounded-md hover:bg-gray-700 transition-colors text-lg">Continue as Guest</button>
                <button onClick={() => { setAuthMode('login'); setView('authForm'); }} className="w-full py-3 px-4 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors text-lg">Login</button>
                <button onClick={() => { setAuthMode('signup'); setView('authForm'); }} className="w-full py-3 px-4 text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors text-lg">Create Account</button>
            </div>
        </div>
    </div>
);

const AuthForm = ({ mode, onLogin, onSignup, setView }) => {
    const emailRef = useRef();
    const passwordRef = useRef();
    const handleSubmit = (e) => {
        e.preventDefault();
        if (mode === 'login') onLogin(emailRef.current.value, passwordRef.current.value);
        else onSignup(emailRef.current.value, passwordRef.current.value);
    };
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900">
            <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-xl shadow-lg">
                <button onClick={() => setView('landing')} className="text-indigo-400 hover:underline mb-4">&larr; Back to Welcome</button>
                <h2 className="text-3xl font-bold text-center text-white">{mode === 'login' ? 'Login' : 'Create Account'}</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div><label className="block text-sm font-medium text-gray-300">Email Address</label><input ref={emailRef} type="email" required className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                    <div><label className="block text-sm font-medium text-gray-300">Password</label><input ref={passwordRef} type="password" required className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                    <button type="submit" className="w-full py-2 px-4 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none">{mode === 'login' ? 'Login' : 'Sign Up'}</button>
                </form>
            </div>
        </div>
    );
};

const UploadForm = ({ onUpload, showMessage }) => {
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [fileType, setFileType] = useState('video');
    const handleSubmit = async (event) => {
        event.preventDefault();
        if (isUploading) return;
        const form = event.target;
        const videoFile = form.querySelector('#video-file').files[0];
        const thumbnailFile = form.querySelector('#thumbnail-file').files[0];
        const title = form.querySelector('#video-title').value;
        const description = form.querySelector('#video-description').value;
        if (!videoFile || !thumbnailFile || !title) { showMessage({ text: 'Please fill out all fields and select both files.', type: 'error' }); return; }
        setIsUploading(true);
        await onUpload({ videoFile, thumbnailFile, title, description, type: fileType, onProgress: setUploadProgress });
        setIsUploading(false);
        setUploadProgress(0);
        form.reset();
    };
    return (
        <div className="max-w-2xl mx-auto p-8 bg-gray-800 rounded-lg mt-10 shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-6">Upload New Content</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <select value={fileType} onChange={(e) => setFileType(e.target.value)} className="w-full px-3 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"><option value="video">Video (Long Form)</option><option value="byte">Byte (Short Form)</option></select>
                <input type="text" id="video-title" placeholder="Title" required className="w-full px-3 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <textarea id="video-description" rows="3" placeholder="Description" required className="w-full px-3 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
                <div><label className="block text-sm font-medium text-gray-300">Video/Byte File</label><input type="file" id="video-file" accept="video/*" required className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 mt-1" /></div>
                <div><label className="block text-sm font-medium text-gray-300">Thumbnail Image</label><input type="file" id="thumbnail-file" accept="image/*" required className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 mt-1" /></div>
                {isUploading && <div className="w-full bg-gray-700 rounded-full h-2.5"><div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div></div>}
                <button type="submit" disabled={isUploading} className="w-full py-2 px-4 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed">{isUploading ? `Uploading... ${uploadProgress.toFixed(0)}%` : 'Upload'}</button>
            </form>
        </div>
    );
};

const WatchView = ({ video, onBack, onSubscribe, currentUser }) => {
    if (!video) return null;
    return (
        <div className="p-4 sm:p-8">
            <button onClick={onBack} className="mb-4 px-4 py-2 bg-gray-700 text-white rounded-full hover:bg-gray-600">&larr; Back</button>
            <div className="bg-black rounded-lg overflow-hidden"><video src={video.videoUrl} controls autoPlay className="w-full max-h-[70vh]"></video></div>
            <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                <h1 className="text-3xl font-bold text-white">{video.title}</h1>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-2 space-y-2 sm:space-y-0">
                    <div className="flex items-center space-x-4"><span className="text-lg text-indigo-400">{video.uploaderName}</span><SubscriberCount uploaderId={video.uploaderId} /></div>
                    {currentUser && currentUser.uid !== video.uploaderId && <button onClick={() => onSubscribe(video.uploaderId)} className="px-6 py-2 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700">Subscribe</button>}
                </div>
                <p className="text-gray-300 mt-4">{video.description}</p>
            </div>
        </div>
    );
};

const BytesPlayer = ({ bytes, startIndex, onBack, onSubscribe, currentUser }) => {
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
        <div className="relative w-full h-[calc(100vh-68px)] bg-black flex items-center justify-center" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <button onClick={onBack} className="absolute top-4 left-4 z-30 px-4 py-2 bg-gray-800 bg-opacity-50 text-white rounded-full hover:bg-opacity-75">&larr; Back</button>
            <div className="relative w-full sm:w-auto h-full max-w-sm flex items-center justify-center">
                <video ref={videoRef} key={currentByte.id} src={currentByte.videoUrl} autoPlay loop muted playsInline className="w-full h-full object-contain"></video>
                <div className="absolute bottom-0 left-0 p-4 text-white z-20 bg-gradient-to-t from-black/70 to-transparent w-full">
                    <h3 className="font-bold text-lg">{currentByte.title}</h3>
                    <p className="text-sm mt-1">{currentByte.description}</p>
                    <div className="flex items-center justify-between mt-3">
                        <div><span className="text-indigo-300 font-semibold">{currentByte.uploaderName}</span><SubscriberCount uploaderId={currentByte.uploaderId} /></div>
                        {currentUser && currentUser.uid !== currentByte.uploaderId && <button onClick={() => onSubscribe(currentByte.uploaderId)} className="px-4 py-1.5 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700 text-sm">Subscribe</button>}
                    </div>
                </div>
            </div>
            <button onClick={goToPrev} disabled={currentIndex === 0} className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 bg-gray-800 bg-opacity-50 rounded-full disabled:opacity-20 hover:bg-opacity-75"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg></button>
            <button onClick={goToNext} disabled={currentIndex === bytes.length - 1} className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 bg-gray-800 bg-opacity-50 rounded-full disabled:opacity-20 hover:bg-opacity-75"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>
        </div>
    );
};

// --- Main App Component ---
function App() {
    const [allVideos, setAllVideos] = useState([]);
    const [allBytes, setAllBytes] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [view, setView] = useState('landing');
    const [authMode, setAuthMode] = useState('login');
    const [watchingContent, setWatchingContent] = useState(null);
    const [bytesPlayerData, setBytesPlayerData] = useState({ items: [], index: 0 });
    const [message, setMessage] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!firebaseConfig.apiKey) {
            console.error("CRITICAL: Firebase config is missing. App cannot start.");
            setIsAuthReady(true);
            return;
        }

        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user && !user.isAnonymous) {
                setCurrentUser(user);
                const userRef = doc(db, `/artifacts/${appId}/public/data/users`, user.uid);
                const userDoc = await getDoc(userRef);
                if (!userDoc.exists()) {
                    await setDoc(userRef, { email: user.email, name: `User-${user.uid.substring(0, 6)}`, createdAt: serverTimestamp() });
                }
            } else {
                setCurrentUser(null);
            }
            setIsAuthReady(true);
        });
        
        const unsubVideos = onSnapshot(query(collection(db, `/artifacts/${appId}/public/data/videos`)), 
            (snapshot) => {
                const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                list.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
                setAllVideos(list);
            }, 
            (error) => console.error(`Firestore permission error for videos:`, error)
        );

        const unsubBytes = onSnapshot(query(collection(db, `/artifacts/${appId}/public/data/bytes`)), 
            (snapshot) => {
                const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                list.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
                setAllBytes(list);
            },
            (error) => console.error(`Firestore permission error for bytes:`, error)
        );

        return () => { 
            unsubscribeAuth();
            unsubVideos();
            unsubBytes();
        };
    }, []);
    
    const showMessageHandler = (text, type = 'info') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 4000);
    };

    const handleGuestLogin = async () => {
        try {
            await signInAnonymously(auth);
            setView('home');
        } catch (error) { showMessageHandler("Could not sign in as guest.", 'error'); }
    };

    const handleSignup = async (email, password) => {
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            showMessageHandler('Account created successfully!', 'success');
            setView('home');
        } catch (error) { showMessageHandler(error.message, 'error'); }
    };

    const handleLogin = async (email, password) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            showMessageHandler('Logged in successfully!', 'success');
            setView('home');
        } catch (error) { showMessageHandler(error.message, 'error'); }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setView('landing');
            showMessageHandler('Logged out successfully.', 'success');
        } catch (error) { showMessageHandler('Failed to log out.', 'error'); }
    };

    const handleUpload = async ({ videoFile, thumbnailFile, title, description, type, onProgress }) => {
        if (!currentUser) { showMessageHandler('You must be logged in to upload.', 'error'); return; }
        const uploadFile = (file, path, progressCallback) => new Promise((resolve, reject) => {
            const uploadTask = uploadBytesResumable(ref(storage, path), file);
            uploadTask.on('state_changed', (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (progressCallback) progressCallback(progress);
            }, reject, async () => resolve(await getDownloadURL(uploadTask.snapshot.ref)));
        });
        try {
            const timestamp = Date.now();
            const videoUrl = await uploadFile(videoFile, `content/${currentUser.uid}/${timestamp}_${videoFile.name}`, onProgress);
            const thumbnailUrl = await uploadFile(thumbnailFile, `content/${currentUser.uid}/${timestamp}_${thumbnailFile.name}`, null);
            const userDoc = await getDoc(doc(db, `/artifacts/${appId}/public/data/users`, currentUser.uid));
            await addDoc(collection(db, `/artifacts/${appId}/public/data/${type}s`), { title, description, videoUrl, thumbnailUrl, uploaderId: currentUser.uid, uploaderName: userDoc.data()?.name || 'User', createdAt: serverTimestamp() });
            showMessageHandler(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded!`, 'success');
            setView(type === 'video' ? 'home' : 'bytes');
        } catch (error) { showMessageHandler('Upload failed.', 'error'); }
    };

    const handleSubscribe = async (uploaderId) => {
        if (!currentUser) { showMessageHandler('You must be logged in to subscribe.', 'error'); return; }
        if (currentUser.uid === uploaderId) { showMessageHandler('You cannot subscribe to yourself.', 'error'); return; }
        const subsPath = `/artifacts/${appId}/public/data/subscribers`;
        const q = query(collection(db, subsPath), where("subscriberId", "==", currentUser.uid), where("uploaderId", "==", uploaderId));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            await addDoc(collection(db, subsPath), { subscriberId: currentUser.uid, uploaderId, createdAt: serverTimestamp() });
            showMessageHandler('Subscribed!', 'success');
        } else { showMessageHandler('Already subscribed.', 'info'); }
    };

    const filteredVideos = allVideos.filter(v => v.title.toLowerCase().includes(searchTerm.toLowerCase()) || v.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredBytes = allBytes.filter(b => b.title.toLowerCase().includes(searchTerm.toLowerCase()) || b.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const renderContent = () => {
        if (!isAuthReady) return <div className="flex justify-center items-center h-screen text-white">Loading...</div>;
        switch (view) {
            case 'landing': return <LandingPage handleGuestLogin={handleGuestLogin} setView={setView} setAuthMode={setAuthMode} />;
            case 'authForm': return <AuthForm mode={authMode} onLogin={handleLogin} onSignup={handleSignup} setView={setView} />;
            case 'upload': return <UploadForm onUpload={handleUpload} showMessage={showMessageHandler} />;
            case 'watch': return <WatchView video={watchingContent} onBack={() => setView('home')} onSubscribe={handleSubscribe} currentUser={currentUser} />;
            case 'bytesPlayer': return <BytesPlayer bytes={bytesPlayerData.items} startIndex={bytesPlayerData.index} onBack={() => setView('bytes')} onSubscribe={handleSubscribe} currentUser={currentUser} />;
            case 'bytes': return <ContentGrid items={filteredBytes} title="Bytes | Short Form Content" onWatch={(item) => { const i = filteredBytes.findIndex(b => b.id === item.id); setBytesPlayerData({ items: filteredBytes, index: i >= 0 ? i : 0 }); setView('bytesPlayer'); }} />;
            case 'home': default: return <ContentGrid items={filteredVideos} title="Videos | Featured Content" onWatch={(item) => { setWatchingContent(item); setView('watch'); }} />;
        }
    };

    return (
        <div className="bg-gray-900 min-h-screen text-white font-sans">
            <style>{`.animate-fade-in-out { animation: fadeInOut 4s ease-in-out; } @keyframes fadeInOut { 0%, 100% { opacity: 0; transform: translateY(-20px); } 15%, 85% { opacity: 1; transform: translateY(0); } }`}</style>
            <Message message={message} />
            {view !== 'landing' && view !== 'authForm' && <Navbar currentUser={currentUser} onLogout={handleLogout} onSetView={setView} searchTerm={searchTerm} onSearchChange={setSearchTerm} />}
            <main className={view === 'bytesPlayer' ? '' : 'container mx-auto'}>{renderContent()}</main>
        </div>
    );
}

export default App;

