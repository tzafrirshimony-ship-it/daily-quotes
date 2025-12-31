import React, { useState, useEffect, useRef } from 'react';

// רשימת משפטים מורחבת
const QUOTES = [
  "הדרך היחידה לעשות עבודה נהדרת היא לאהוב את מה שאתה עושה.",
  "העתיד שייך לאלו המאמינים ביופי של החלומות שלהם.",
  "כל יום הוא הזדמנות שנייה.",
  "אל תספור את הימים, גרום לימים להיספר.",
  "ההצלחה היא לא סופית, והכישלון אינו גורלי.",
  "מה שאתה עושה היום יכול לשפר את כל המחרים שלך.",
  "אל תחכה להזדמנות, צור אותה.",
  "השינוי מתחיל בך.",
  "גם מסע של אלף מייל מתחיל בצעד אחד קטן.",
  "תאמין שאתה יכול, ואתה כבר בחצי הדרך.",
  "אתה חזק יותר ממה שאתה חושב.",
  "תהיה אדיב לעצמך היום.",
  "היום הוא התחלה חדשה לכל מה שתרצה.",
  "האנרגיה שלך היא המגנט שלך."
];

const App = () => {
  const [time, setTime] = useState(localStorage.getItem('reminderTime') || '08:00');
  const [isLocked, setIsLocked] = useState(true);
  const [quote, setQuote] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [bgStatus, setBgStatus] = useState('idle'); // idle, active, denied, error
  const [notifPermission, setNotifPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'denied');
  const audioRef = useRef(null);
  const swRegistration = useRef(null);

  // רישום Service Worker עם טיפול בשגיאות משופר
  useEffect(() => {
    const registerSW = async () => {
      if ('serviceWorker' in navigator) {
        try {
          // שימוש ב-Data URL במקום Blob עבור תאימות גבוהה יותר בסביבות מסוימות
          const swCode = `
            self.addEventListener('install', e => self.skipWaiting());
            self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
            self.addEventListener('notificationclick', e => {
              e.notification.close();
              e.waitUntil(clients.matchAll({type: 'window'}).then(clients => {
                if (clients.length > 0) return clients[0].focus();
                return clients.openWindow('/');
              }));
            });
          `;
          const blob = new Blob([swCode], { type: 'application/javascript' });
          const swUrl = URL.createObjectURL(blob);
          
          const reg = await navigator.serviceWorker.register(swUrl);
          swRegistration.current = reg;
          console.log('Service Worker registered successfully');
        } catch (error) {
          console.warn('Service Worker registration failed, using fallback notification method:', error);
          setBgStatus('error');
        }
      }
    };

    registerSW();
  }, []);

  useEffect(() => {
    updateQuoteStatus();
    const interval = setInterval(updateQuoteStatus, 15000); 
    return () => clearInterval(interval);
  }, [time]);

  const updateQuoteStatus = () => {
    const now = new Date();
    const currentStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const dayIdx = Math.floor(diff / (1000 * 60 * 60 * 24));
    const dailyQuote = QUOTES[dayIdx % QUOTES.length];
    setQuote(dailyQuote);

    if (currentStr >= time) {
      setIsLocked(false);
      
      const lastNotified = localStorage.getItem('lastNotifiedDate');
      if (currentStr === time && lastNotified !== now.toDateString()) {
        triggerNotification(dailyQuote);
        localStorage.setItem('lastNotifiedDate', now.toDateString());
      }
    } else {
      setIsLocked(true);
    }
  };

  const triggerNotification = (text) => {
    const title = 'ההשראה היומית שלך ✨';
    const options = {
      body: text,
      icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
      vibrate: [200, 100, 200],
      requireInteraction: true
    };

    if (notifPermission === 'granted') {
      // מנסה קודם דרך ה-Service Worker
      if (swRegistration.current) {
        swRegistration.current.showNotification(title, options);
      } else {
        // Fallback להתראה רגילה אם ה-SW לא זמין
        new Notification(title, options);
      }
    }
  };

  const handleInitialClick = async () => {
    if (typeof Notification !== 'undefined') {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
    }

    if (audioRef.current) {
      try {
        await audioRef.current.play();
        setBgStatus('active');
      } catch (e) {
        console.error("Audio playback failed:", e);
        setBgStatus('denied');
      }
    }
    
    localStorage.setItem('reminderTime', time);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
    updateQuoteStatus();
  };

  const testNow = () => {
    if (notifPermission !== 'granted') {
      Notification.requestPermission().then(setNotifPermission);
    }
    triggerNotification("בדיקת מערכת: ההתראות שלך עובדות! 🚀");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 font-sans text-slate-800" dir="rtl">
      {/* סאונד שקט לשמירה על אפליקציה פעילה ברקע */}
      <audio ref={audioRef} loop preload="auto">
        <source src="data:audio/wav;base64,UklGRigAAABXQVZFAmZtdCAQAAAAEAAKAnABAAgAAABhZGF0YQAAAAA=" type="audio/wav" />
      </audio>

      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
        
        {/* לוח בקרה טכני */}
        <div className="bg-slate-900 p-4 text-[10px] text-slate-400 grid grid-cols-3 gap-2 text-center">
          <div className="flex flex-col items-center">
            <div className={`w-2 h-2 rounded-full mb-1 ${notifPermission === 'granted' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>הרשאות</span>
          </div>
          <div className="flex flex-col items-center">
            <div className={`w-2 h-2 rounded-full mb-1 ${bgStatus === 'active' ? 'bg-green-500 animate-pulse' : bgStatus === 'error' ? 'bg-yellow-500' : 'bg-orange-500'}`}></div>
            <span>מצב רקע</span>
          </div>
          <div className="flex flex-col items-center">
            <div className={`w-2 h-2 rounded-full mb-1 ${typeof window !== 'undefined' && (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>מסך בית</span>
          </div>
        </div>

        <div className="p-8">
          <header className="text-center mb-10">
            <h1 className="text-3xl font-black text-indigo-600 mb-2">העצמה יומית</h1>
            <p className="text-slate-400 text-sm">הגדר שעה וקבל כוח בכל יום</p>
          </header>

          <div className="space-y-6">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <label className="block text-xs font-bold text-slate-400 mb-3 text-right uppercase tracking-wider">שעת התראה</label>
              <div className="flex gap-2">
                <input 
                  type="time" 
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="flex-1 bg-white border-2 border-slate-200 rounded-2xl px-4 py-3 text-2xl font-bold text-indigo-900 focus:border-indigo-500 outline-none transition-all"
                />
                <button 
                  onClick={handleInitialClick}
                  className="bg-indigo-600 text-white px-6 rounded-2xl font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-100"
                >
                  הפעל
                </button>
              </div>
              <button 
                onClick={testNow}
                className="w-full mt-4 text-xs text-indigo-400 font-medium underline"
              >
                שלח התראת בדיקה עכשיו
              </button>
            </div>

            <div className="min-h-[180px] flex items-center justify-center bg-indigo-50/30 rounded-[2.5rem] p-8 border-2 border-dashed border-indigo-100 relative overflow-hidden">
              {isLocked ? (
                <div className="text-center group">
                  <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 text-indigo-300 group-hover:text-indigo-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <p className="text-indigo-400 font-bold">ההשראה תתגלה בשעה {time}</p>
                </div>
              ) : (
                <div className="text-center animate-in fade-in zoom-in duration-700">
                  <p className="text-xl md:text-2xl font-bold text-slate-700 italic leading-relaxed">"{quote}"</p>
                  <button 
                    onClick={() => navigator.share({ title: 'העצמה יומית', text: quote, url: window.location.href })}
                    className="mt-6 flex items-center gap-2 mx-auto text-indigo-600 font-bold text-sm bg-white px-4 py-2 rounded-full shadow-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    שתף הצלחה
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-6 text-[10px] text-slate-400 text-center leading-relaxed">
          <p>חובה להוסיף למסך הבית (Share → Add to Home Screen)</p>
          <p>ולהשאיר את האפליקציה פתוחה ברקע כדי לקבל התראות.</p>
        </div>
      </div>

      {showToast && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-8 py-4 rounded-2xl shadow-2xl font-bold animate-in slide-in-from-bottom-4">
          המערכת הופעלה! נתראה בשעה {time} ✨
        </div>
      )}
    </div>
  );
};

export default App;
