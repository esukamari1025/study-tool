// ==========================
// DB 設定
// ==========================
const DB_NAME = "studyDB";
const DB_VERSION = 3;
let db;


// ==========================
// IndexedDB を開く
// ==========================
const request = indexedDB.open(DB_NAME, DB_VERSION);

request.onupgradeneeded = (event) => {
const db = event.target.result;

// --- 学習記録ストア ---
if (!db.objectStoreNames.contains("study_logs")) {
    const studyStore = db.createObjectStore("study_logs", {
        keyPath: "id",
        autoIncrement: true
    });

    studyStore.createIndex("subject", "subject", { unique: false });
    studyStore.createIndex("studyDate", "studyDate", { unique: false });
}

// --- 苦手メモストア ---
if (!db.objectStoreNames.contains("weak_points")) {
const weakStore = db.createObjectStore("weak_points", {
keyPath: "id",
autoIncrement: true
});
weakStore.createIndex("priority", "priority", { unique: false });
}
};

request.onsuccess = (event) => {
    db = event.target.result;
    
    document.getElementById("date").valueAsDate = new Date();
    
    updateSubjectFilterOptions();
    displayLogs();
    displayWeakPoints();
    
    const currentView = localStorage.getItem("currentView");
    
    if (currentView === "logs") {
        showLogs();
    } else {
        showRegister();
    }
    };

request.onerror = () => {
console.error("DB open failed");
};
