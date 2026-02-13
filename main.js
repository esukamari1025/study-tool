// ==========================
// DB 設定
// ==========================
const DB_NAME = "studyDB";
const DB_VERSION = 2;
let db;


// ==========================
// IndexedDB を開く
// ==========================
const request = indexedDB.open(DB_NAME, DB_VERSION);

request.onupgradeneeded = (event) => {
const db = event.target.result;

// 学習記録ストア
if (!db.objectStoreNames.contains("study_logs")) {
const store = db.createObjectStore("study_logs", {
    keyPath: "id",
    autoIncrement: true
});
store.createIndex("subject", "subject", { unique: false });
}

// 苦手メモストア
if (!db.objectStoreNames.contains("weak_points")) {
const store = db.createObjectStore("weak_points", {
    keyPath: "id",
    autoIncrement: true
});
store.createIndex("priority", "priority", { unique: false });
}
};

request.onsuccess = (event) => {
db = event.target.result;
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
if (!studyType) {
alert("学習区分を選択してください");
return;
}

const record = {
date: document.getElementById("date").value,
subject: document.getElementById("subject").value,
content: document.getElementById("content").value,
level: Number(document.getElementById("level").value),
studyType,
amount: null
};

// 午後なら分野必須
if (studyType === "afternoon") {
const field = document.getElementById("afternoonField").value;
if (!field) {
    alert("午後問題は分野を選択してください");
    return;
}
record.field = field;
}

// 学習量の取得
const amountMap = {
morning: "amountMorning",
afternoon: "amountAfternoon",
book: "amountBook",
review: "amountReview",
mock: "amountMock"
};

const id = amountMap[studyType];
if (id) {
record.amount = Number(document.getElementById(id).value);
}

const tx = db.transaction("study_logs", "readwrite");
tx.objectStore("study_logs").add(record);

tx.oncomplete = () => {
    e.target.reset();
    displayLogs();
    showToast("学習記録を登録しました", "success");
};
}
);


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
// 学習区分 切替
// ==========================
document.getElementById("studyType").addEventListener("change", (e) => {

const type = e.target.value;

document.querySelectorAll(".amount-field")
.forEach(el => el.style.display = "none");

const target = document.querySelector(`.amount-field[data-type="${type}"]`);
if (target) target.style.display = "block";

document.getElementById("afternoonExtra").style.display =
type === "afternoon" ? "block" : "none";
});


// ==========================
// CSV取込（午前）
// ==========================
document.getElementById("morningCsvInput")
.addEventListener("change", (e) => {
const file = e.target.files[0];
if (file) importMorningCSV(file);
});


// ==========================
// フィルター
// ==========================
document.getElementById("filterSubject")
.addEventListener("change", applyFilters);

document.getElementById("filterStudyType")
?.addEventListener("change", applyFilters);

document.getElementById("filterField")
?.addEventListener("change", applyFilters);

function applyFilters() {
const subject = document.getElementById("filterSubject").value;
const studyType = document.getElementById("filterStudyType")?.value || "";
const field = document.getElementById("filterField")?.value || "";

displayLogs(subject, studyType, field);
}

// ==========================
// 学習記録表示
// ==========================
function displayLogs(subject = "", studyType= "", field= "") {

const tbody = document.getElementById("logList");
tbody.innerHTML = "";

const records = [];

const tx = db.transaction("study_logs", "readonly");
const store = tx.objectStore("study_logs");

store.openCursor().onsuccess = (e) => {

const cursor = e.target.result;

if (!cursor) {

    // 日付の古い順に並び替え
    records.sort((a, b) => new Date(a.date) - new Date(b.date));

    records.forEach(r => {

        const tr = document.createElement("tr");

        if (r.level <= 2) tr.classList.add("level-low");
        else if (r.level === 3) tr.classList.add("level-mid");
        else tr.classList.add("level-high");

        const fieldText =
            r.studyType === "afternoon" && r.field
                ? `（${r.field}）`
                : "";
        

        tr.innerHTML = `
            <td>${r.date}</td>
            <td>${r.subject}</td>
            <td>${r.content}${fieldText}</td>
            <td>${studyTypeLabel(r.studyType)}</td>
            <td>${formatStudyAmount(r.studyType, r.amount)}</td>
            <td>${r.level}</td>
        `;

        const td = document.createElement("td");
        const btn = document.createElement("button");
        btn.textContent = "削除";
        btn.onclick = () => deleteLog(r);
        td.appendChild(btn);
        tr.appendChild(td);

        tbody.appendChild(tr);
    });

    updateSubjectAverageChart(records);
    updateAfternoonFieldChart(records);
    calculateAfternoonFieldAverage(records);
    updateFilterOptionsAll();

    return;
}


const r = cursor.value;

// フィルター判定
if (subject && r.subject !== subject) {
    cursor.continue();
    return;
}

if (studyType && r.studyType !== studyType) {
    cursor.continue();
    return;
}

if (field && r.field !== field) {
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
    const fieldText =
    record.studyType === "afternoon" && record.field
        ? `（${record.field}）`
        : "";

    const message =
        `「${record.subject} - ${record.content}${fieldText}」を削除しますか？`;


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
// 科目別 平均グラフ
// ==========================
function updateSubjectAverageChart(records) {

    const ul = document.getElementById("subjectAverage");
    if (!ul) return;

    ul.innerHTML = "";

    const totals = {};

    records.forEach(r => {

        const key = `${r.subject}｜${r.studyType}`;

        if (!totals[key]) {
            totals[key] = { sum: 0, count: 0 };
        }

        totals[key].sum += r.level;
        totals[key].count++;
    });

    const labels = [];
    const values = [];
    const colors = [];

    Object.keys(totals).forEach(key => {

        const avg = totals[key].sum / totals[key].count;

        const [subject, type] = key.split("｜");

        const li = document.createElement("li");
        li.textContent =
            `${subject}（${studyTypeLabel(type)}）：平均理解度 ${avg.toFixed(2)}`;

        if (avg < 2.5) {
            li.classList.add("avg-weak");
            colors.push("rgba(255,99,132,0.7)");
        } else if (avg < 3.5) {
            li.classList.add("avg-normal");
            colors.push("rgba(255,159,64,0.7)");
        } else {
            li.classList.add("avg-strong");
            colors.push("rgba(75,192,192,0.7)");
        }

        ul.appendChild(li);

        labels.push(`${subject}-${studyTypeLabel(type)}`);
        values.push(avg.toFixed(2));
    });

    const ctx = document.getElementById("avgChart").getContext("2d");

    if (window.subjectChart instanceof Chart) {
        window.subjectChart.destroy();
    }

    window.subjectChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "科目×区分 平均理解度",
                data: values,
                backgroundColor: colors
            }]
        },
        options: {
            scales: {
                y: { min: 0, max: 5, ticks: { stepSize: 1 } }
            }
        }
    });
}


// ==========================
// 午後 分野別グラフ
// ==========================
function updateAfternoonFieldChart(records) {

const totals = {};

records.forEach(r => {
if (r.studyType !== "afternoon" || !r.field) return;

const key = `${r.subject}-${r.field}`;

if (!totals[key]) totals[key] = { sum: 0, count: 0 };

totals[key].sum += r.level;
totals[key].count++;
});

const labels = [];
const values = [];
const colors = [];

Object.keys(totals).forEach(key => {

const avg = totals[key].sum / totals[key].count;

labels.push(key);
values.push(avg.toFixed(2));

if (avg < 2.5) colors.push("rgba(255,99,132,0.7)");
else if (avg < 3.5) colors.push("rgba(255,159,64,0.7)");
else colors.push("rgba(75,192,192,0.7)");
});

const ctx = document.getElementById("afternoonChart").getContext("2d");

if (window.afternoonChart instanceof Chart) window.afternoonChart.destroy();

window.afternoonChart = new Chart(ctx, {
type: "bar",
data: {
    labels,
    datasets: [{
        label: "午後分野別 平均理解度",
        data: values,
        backgroundColor: colors
    }]
},
options: {
    scales: {
        y: { min: 0, max: 5, ticks: { stepSize: 1 } }
    }
}
});
}


// ==========================
// CSV取込ロジック
// ==========================
function convertRateToLevel(correct, total) {

const rate = correct / total;

if (rate < 0.5) return 1;
if (rate < 0.6) return 2;
if (rate < 0.7) return 3;
if (rate < 0.8) return 4;
return 5;
}

function importMorningCSV(file) {

const reader = new FileReader();

reader.onload = function(event) {

const text = event.target.result;
const lines = text.split("\n").slice(1);

let total = 0;
let correct = 0;

lines.forEach(line => {

    if (!line.trim()) return;

    const cols = line.split(",");
    const result = cols[1].trim();

    total++;
    if (result === "○") correct++;
});

const level = convertRateToLevel(correct, total);

const record = {
    date: new Date().toISOString().split("T")[0],
    subject: "応用情報技術者試験",
    content: "午前CSV取込",
    studyType: "morning",
    amount: total,
    correct,
    level
};

const tx = db.transaction("study_logs", "readwrite");
tx.objectStore("study_logs").add(record);

tx.oncomplete = displayLogs;
};

reader.readAsText(file, "UTF-8");
}


// ==========================
// 表示用ユーティリティ
// ==========================
function studyTypeLabel(type) {
return {
morning: "午前問題",
afternoon: "午後問題",
book: "参考書",
review: "復習",
mock: "模試"
}[type] || "";
}

function formatStudyAmount(type, amount) {
if (amount == null) return "";
return {
morning: `${amount}問`,
afternoon: `設問${amount}`,
book: `${amount}ページ`,
review: `${amount}分`,
mock: `${amount}点`
}[type] || "";
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

subjects.add(cursor.value.subject);
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


// ==========================
// 午後分野別 平均理解度（リスト表示）
// ==========================
function calculateAfternoonFieldAverage(records) {

const totals = {};

records.forEach(r => {
if (r.studyType !== "afternoon") return;
if (!r.field) return;

const key = `${r.subject}｜${r.field}`;

if (!totals[key]) {
    totals[key] = { sum: 0, count: 0 };
}

totals[key].sum += r.level;
totals[key].count++;
});

displayAfternoonFieldAverage(totals);
}


// ==========================
// 午後分野別 平均理解度（リスト表示）
// ==========================
function displayAfternoonFieldAverage(data) {

const ul = document.getElementById("afternoonFieldAverage");
if (!ul) return;

ul.innerHTML = "";

Object.keys(data).forEach(key => {

const avg = data[key].sum / data[key].count;

const li = document.createElement("li");
li.textContent = `${key}：平均理解度 ${avg.toFixed(2)}`;

if (avg < 2.5) li.classList.add("avg-weak");
else if (avg < 3.5) li.classList.add("avg-normal");
else li.classList.add("avg-strong");

ul.appendChild(li);
});
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
