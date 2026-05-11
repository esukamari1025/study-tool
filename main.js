// ==========================
// DB 設定
// ==========================
const DB_NAME = "studyDB";
const DB_VERSION = 3;
let db;
let editingId = null;

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

updateFilterOptionsAll();
displayLogs();
displayWeakPoints();
};

request.onerror = () => {
console.error("DB open failed");
};


// ==========================
// 学習記録 登録
// ==========================
document.getElementById("studyForm").addEventListener("submit", (e) => {
e.preventDefault();

const studyType = document.getElementById("studyType").value;

let amount = 0;

if (studyType === "class" || studyType === "self") {
    amount = Number(document.getElementById("studyTime").value) || 0;
}
else if (studyType === "book") {
    amount = Number(document.getElementById("amountBook").value) || 0;
}
else if (studyType === "review") {
    amount = Number(document.getElementById("studyTime").value) || 0;
}

const studyTimeEl = document.getElementById("studyTime");

if (studyTimeEl) {

    const studyTime = Number(studyTimeEl.value);

    if (studyTime < 0) {
        alert("学習時間は0以上で入力してください");
        return;
    }
}

const record = {
    subject: document.getElementById("subject").value,
    studyType: studyType,
    content: document.getElementById("content").value,
    studyTime: Number(document.getElementById("studyTime").value) || 0,
    understanding: Number(document.getElementById("level").value),
    studyDate: document.getElementById("date").value,

    amount,

};

if (!record.subject.trim()) {
    alert("科目を入力して");
    return;
}

localStorage.setItem("lastStudyInput", JSON.stringify({
    subject: record.subject,
    studyType: record.studyType
}));

const tx = db.transaction("study_logs", "readwrite");
if (editingId) {
record.id = editingId;
tx.objectStore("study_logs").put(record);
} else {
tx.objectStore("study_logs").add(record);
}


tx.oncomplete = () => {
e.target.reset();
document.getElementById("date").valueAsDate = new Date();
updateFilterOptionsAll();
displayLogs();
updateSubjectCandidates();
showToast(
editingId ? "学習記録を更新しました" : "学習記録を登録しました",
"success"
);

editingId = null;

const btn = document.getElementById("submitBtn");
btn.textContent = "登録";
btn.classList.remove("edit-mode");

showLogs();
};
});


// ==========================
// 苦手メモ  記録
// ==========================
document.getElementById("weakForm").addEventListener("submit", (e) => {
e.preventDefault();

const record = {
subject: document.getElementById("weakSubject").value,
content: document.getElementById("weakContent").value,
priority: Number(document.getElementById("weakPriority").value)
};

const tx = db.transaction("weak_points", "readwrite");
tx.objectStore("weak_points").add(record);

tx.oncomplete = () => {
e.target.reset();
displayWeakPoints();
showToast("苦手メモを追加しました", "success");
};
});



// ==========================
// フィルター
// ==========================
document.getElementById("filterSubject")
.addEventListener("change", applyFilters);

document.getElementById("filterStudyType")
?.addEventListener("change", applyFilters);

document.getElementById("filterSection")
?.addEventListener("change", applyFilters);

document.getElementById("filterExam")
?.addEventListener("change", applyFilters);

function applyFilters() {
    const subject = document.getElementById("filterSubject").value;
    const studyType = document.getElementById("filterStudyType").value;

    displayLogs({ subject, studyType });
}

// ==========================
// 学習記録表示
// ==========================
function displayLogs({subject="", section="", studyType="", exam=""} = {}){

const tbody = document.getElementById("logList");
tbody.innerHTML = "";

const records = [];

const tx = db.transaction("study_logs", "readonly");
const store = tx.objectStore("study_logs");

store.openCursor().onsuccess = (e) => {

const cursor = e.target.result;

if (!cursor) {

// 日付の古い順に並び替え
records.sort((a, b) => new Date(b.studyDate) - new Date(a.studyDate));
records.forEach(r => {

const tr = document.createElement("tr");

if (r.understanding <= 2) tr.classList.add("level-low");
else if (r.understanding === 3) tr.classList.add("level-mid");
else tr.classList.add("level-high");


const accuracyText = r.problems > 0
? (r.accuracy * 100).toFixed(1) + "%"
: "-";

const result =
r.result === "pass" ? "合格圏"
: r.result === "fail" ? "未達"
: "-";

const resultClass = r.result || "";


tr.innerHTML = `
<td>${r.studyDate}</td>
<td>${r.subject}</td>
<td>${r.content}</td>
<td>${{
    class: "授業",
    self: "自主学習",
    review: "復習"
}[r.studyType] || r.studyType}</td>
<td>${r.studyTime || "-"}</td>
<td>${r.understanding}</td>
`;

const td = document.createElement("td");
const editBtn = document.createElement("button");
editBtn.textContent = "編集";
editBtn.classList.add("edit-btn");
editBtn.onclick = () => loadForEdit(r);
td.appendChild(editBtn);

const btn = document.createElement("button");
btn.textContent = "削除";
btn.classList.add("delete-btn");
btn.onclick = () => deleteLog(r);
td.appendChild(btn);
tr.appendChild(td);

tbody.appendChild(tr);
});

return;
}


const r = cursor.value;

if (subject && r.subject !== subject) {
cursor.continue();
return;
}

if (studyType && r.studyType !== studyType) {
    cursor.continue();
    return;
}

records.push(r);
cursor.continue();


};
}


// ==========================
// 削除
// ==========================
function deleteLog(record) {
    const message =
    `「${record.subject} - ${record.content}」を削除しますか？`;

const ok = confirm(message);
if (!ok) return;

const tx = db.transaction("study_logs", "readwrite");
tx.objectStore("study_logs").delete(record.id);

tx.oncomplete = () => {

showToast("学習記録を削除しました","delete");

const subject =
document.getElementById("filterSubject").value;
applyFilters();
};
}

// ==========================
// フィルター更新
// ==========================
function updateFilterOptionsAll() {

const select = document.getElementById("filterSubject");
const tx = db.transaction("study_logs", "readonly");
const store = tx.objectStore("study_logs");

const subjects = new Set();

store.openCursor().onsuccess = (e) => {

const cursor = e.target.result;

if (!cursor) {

select.innerHTML = '<option value="">すべて</option>';

subjects.forEach(subject => {
const option = document.createElement("option");
option.value = subject;
option.textContent = subject;
select.appendChild(option);
});

return;
}

if (cursor.value.subject) {
    subjects.add(cursor.value.subject);
}
cursor.continue();
};
}


// ==========================
// 苦手メモ 表示
// ==========================
function displayWeakPoints() {
const ul = document.getElementById("weakList");
if (!ul) return; // 要素がない場合は何もしない

ul.innerHTML = "";

const tx = db.transaction("weak_points", "readonly");
const store = tx.objectStore("weak_points");

store.openCursor().onsuccess = (e) => {
const cursor = e.target.result;
if (!cursor) return;

const m = cursor.value;

const li = document.createElement("li");

// 優先度ごとの色分け
if (Number(m.priority) === 1) {
li.classList.add("weak");
} else if (Number(m.priority) === 2) {
li.classList.add("normal");
} else {
li.classList.add("strong");
}


li.classList.add("weak-item");

const textSpan = document.createElement("span");
textSpan.textContent =
`【${priorityLabel(m.priority)}】${m.subject}：${m.content}`;

const btn = document.createElement("button");
btn.textContent = "削除";
btn.classList.add("delete-btn");

btn.onclick = () => deleteWeakPoint(m.id);

li.appendChild(textSpan);
li.appendChild(btn);
ul.appendChild(li);

cursor.continue();
};
}


function showToast(message, type = "success") {

const toast = document.getElementById("toast");
if (!toast) return;

toast.className = `toast show ${type}`;
toast.textContent = message;

setTimeout(() => {
toast.className = "toast";
}, 2000);
}


function deleteWeakPoint(id) {

const tx = db.transaction("weak_points", "readonly");
const store = tx.objectStore("weak_points");

const req = store.get(id);

req.onsuccess = () => {

const m = req.result;
if (!m) return;

const message =
`【${priorityLabel(m.priority)}】${m.subject}：${m.content}\nを削除しますか？`;

const ok = confirm(message);
if (!ok) return;

const deleteTx = db.transaction("weak_points", "readwrite");
deleteTx.objectStore("weak_points").delete(id);

deleteTx.oncomplete = () => {
displayWeakPoints();
showToast("苦手メモを削除しました");
};
};
}


function priorityLabel(priority) {
return {
1: "高",
2: "中",
3: "低"
}[Number(priority)] || "";
}

document.addEventListener("DOMContentLoaded", function () {

const studyTypeSelect = document.getElementById("studyType");
const amountFields = document.querySelectorAll(".amount-field");

if (studyTypeSelect) {
    studyTypeSelect.addEventListener("change", function () {

        const selected = this.value;
        const categoryArea = document.getElementById("categoryArea");
        const categorySelect = document.getElementById("category");

        if (categoryArea && categorySelect) {

            if (selected === "mock-am" ||
                selected === "mock-pm" ||
                exam === "FE"||
                section === "AM" ||
                section === "AM1" ||
                section === "AM2"
            ) {
                categoryArea.style.display = "none";
                categorySelect.required = false;
            } else {
                categoryArea.style.display = "block";
                categorySelect.required = true;
            }

        }

        amountFields.forEach(field => {
            field.style.display = "none";
        });

        if (!selected) return;

        amountFields.forEach(field => {
            if (categoryArea && categorySelect) {
                categoryArea.style.display = "block";
            }
        });

    });
}

const last = JSON.parse(localStorage.getItem("lastStudyInput") || "{}");

if (last.subject) {
    document.getElementById("subject").value = last.subject;
}

if (last.studyType) {
    const el = document.getElementById("studyType");
    el.value = last.studyType;
    el.dispatchEvent(new Event("change"));
}

});

function loadForEdit(record) {

    showRegister();

    editingId = record.id;

    document.getElementById("studyType").value = record.studyType;
    document.getElementById("studyType").dispatchEvent(new Event("change"));
    document.getElementById("content").value = record.content;
    document.getElementById("level").value = record.understanding;
    document.getElementById("date").value = record.studyDate;
    document.getElementById("subject").value = record.subject;
    document.getElementById("studyTime").value = record.studyTime;

    document.getElementById("submitBtn").textContent = "更新";
    document.getElementById("submitBtn").classList.add("edit-mode");

    window.scrollTo({ top: 0, behavior: "smooth" });
    document.getElementById("cancelEdit").style.display = "inline-block";
}

function showRegister() {
document.getElementById("registerView").style.display = "block";
document.getElementById("logsView").style.display = "none";
}

function showLogs() {
document.getElementById("registerView").style.display = "none";
document.getElementById("logsView").style.display = "block";
}

document.getElementById("cancelEdit").addEventListener("click", () => {

    editingId = null;

    const form = document.getElementById("studyForm");
    form.reset();

    document.getElementById("date").valueAsDate = new Date();

    document.getElementById("submitBtn").textContent = "登録";
    document.getElementById("submitBtn").classList.remove("edit-mode");

    document.getElementById("cancelEdit").style.display = "none";
    showLogs();
});


function updateSubjectCandidates() {

    const datalist = document.getElementById("subjectList");
    const tx = db.transaction("study_logs", "readonly");
    const store = tx.objectStore("study_logs");

    const subjects = new Set();

    store.openCursor().onsuccess = (e) => {
        const cursor = e.target.result;

        if (!cursor) {
            datalist.innerHTML = "";

            subjects.forEach(s => {
                const option = document.createElement("option");
                option.value = s;
                datalist.appendChild(option);
            });

            return;
        }

        if (cursor.value.subject) {
            subjects.add(cursor.value.subject);
        }

        cursor.continue();
    };
}