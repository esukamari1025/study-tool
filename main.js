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
if (db.objectStoreNames.contains("study_logs")) {
db.deleteObjectStore("study_logs");
}

const studyStore = db.createObjectStore("study_logs", {
keyPath: "id",
autoIncrement: true
});

studyStore.createIndex("examType", "examType", { unique: false });
//studyStore.createIndex("subject", "subject", { unique: false });
studyStore.createIndex("category", "category", { unique: false });
studyStore.createIndex("studyDate", "studyDate", { unique: false });

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

let problems = 0;
let correct = 0;
let amount = 0;

if (studyType === "book") {
amount = Number(document.getElementById("amountBook").value) || 0;
}
else if (studyType === "review") {
amount = Number(document.getElementById("amountReview").value) || 0;
}
else if (studyType === "mock-am") {
problems = Number(document.getElementById("mockTotal").value) || 0;
correct = Number(document.getElementById("mockCorrect").value) || 0;
amount = problems;
}
else if (studyType === "mock-pm") {
problems = Number(document.getElementById("mockTotal").value) || 0;
correct = Number(document.getElementById("mockCorrect").value) || 0;
amount = problems;
}
else {
amount = problems;
}

if (studyType === "morning") {
problems = Number(document.getElementById("amountMorning").value) || 0;
correct = Number(document.getElementById("correctCount").value) || 0;
amount = problems;
}
else if (studyType === "afternoon") {
problems = Number(document.getElementById("amountAfternoon").value) || 0;
correct = Number(document.getElementById("correctCount").value) || 0;
amount = problems;
}

const accuracy = problems > 0 ? correct / problems : 0;
const passLine = 0.6;

let result = "-";

if (problems > 0) {
result = accuracy >= passLine ? "pass" : "fail";
}

let categoryValue = document.getElementById("category").value || "";

if (studyType === "mock-am") {
categoryValue = "模試(午前)";
} else if (studyType === "mock-pm") {
categoryValue = "模試(午後)";
}

const record = {
examType: document.getElementById("examType").value,
section: document.getElementById("section").value,
category: categoryValue,
studyType: studyType,
content: document.getElementById("content").value,
amount: amount,
problems: problems,
correct: correct,
accuracy: accuracy,
result: result,
understanding: Number(document.getElementById("level").value),
studyDate: document.getElementById("date").value,
evaluation: document.getElementById("evaluation")?.value || ""
};

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
displayLogs();
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
const section = document.getElementById("filterSection").value;
const studyType = document.getElementById("filterStudyType").value;
const exam = document.getElementById("filterExam").value;

displayLogs(subject, section, studyType,exam);
}



// ==========================
// 学習記録表示
// ==========================
function displayLogs(subject = "",section = "", studyType = "", exam=""){


const tbody = document.getElementById("logList");
tbody.innerHTML = "";

const records = [];

const tx = db.transaction("study_logs", "readonly");
const store = tx.objectStore("study_logs");

store.openCursor().onsuccess = (e) => {

const cursor = e.target.result;

if (!cursor) {

// 日付の古い順に並び替え
records.sort((a, b) => new Date(a.studyDate) - new Date(b.studyDate));

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
<td>${r.examType}</td>
<td>${r.studyDate}</td>
<td>${r.category}</td>
<td>${r.content}</td>
<td>${r.section}</td>
<td>${{
morning: "午前問題",
afternoon: "午後問題",
"mock-am": "模試(午前)",
"mock-pm": "模試(午後)",
book: "参考書",
review: "復習"
}[r.studyType] || "-"}</td>
<td>${r.amount || "-"}</td>
<td>${accuracyText}</td>
<td class="${resultClass}">${result}</td>
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

updateNormalChart(records);
updateMockChart(records);
updateStudyVolumeChart(records);

return;
}


const r = cursor.value;

if (exam && r.examType !== exam) {
cursor.continue();
return;
}


if (subject && r.category !== subject) {
cursor.continue();
return;
}

if (section && r.section !== section) {
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
`「${record.category} - ${record.content}」を削除しますか？`;


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


function updateNormalChart(records) {

const ctx = document.getElementById("normalChart").getContext("2d");

if (window.normalChartInstance instanceof Chart) {
    window.normalChartInstance.destroy();
}

let morningTotal = 0;
let morningCount = 0;

let afternoonTotal = 0;
let afternoonCount = 0;

records.forEach(r => {

    if (r.studyType === "morning" && r.problems > 0) {
        morningTotal += r.accuracy;
        morningCount++;
    }

    if (r.studyType === "afternoon" && r.problems > 0) {
        afternoonTotal += r.accuracy;
        afternoonCount++;
    }
});

const morningAvg = morningCount ? (morningTotal / morningCount) * 100 : 0;
const afternoonAvg = afternoonCount ? (afternoonTotal / afternoonCount) * 100 : 0;

window.normalChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
        labels: ["午前", "午後"],
        datasets: [{
            label: "平均正答率(%)",
            data: [
                morningAvg.toFixed(1),
                afternoonAvg.toFixed(1)
            ]
        }]
    },
    options: {
        scales: {
            y: { min: 0, max: 100 }
        }
    }
});
}

function updateMockChart(records) {

const ctx = document.getElementById("mockChart").getContext("2d");

if (window.mockChartInstance instanceof Chart) {
    window.mockChartInstance.destroy();
}

let mockAMTotal = 0;
let mockAMCount = 0;

let mockPMTotal = 0;
let mockPMCount = 0;

records.forEach(r => {

    if (r.studyType === "mock-am" && r.problems > 0) {
        mockAMTotal += r.accuracy;
        mockAMCount++;
    }

    if (r.studyType === "mock-pm" && r.problems > 0) {
        mockPMTotal += r.accuracy;
        mockPMCount++;
    }
});

const mockAMAvg = mockAMCount ? (mockAMTotal / mockAMCount) * 100 : 0;
const mockPMAvg = mockPMCount ? (mockPMTotal / mockPMCount) * 100 : 0;

window.mockChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
        labels: ["模試午前", "模試午後"],
        datasets: [{
            label: "平均正答率(%)",
            data: [
                mockAMAvg.toFixed(1),
                mockPMAvg.toFixed(1)
            ]
        }]
    },
    options: {
        scales: {
            y: { min: 0, max: 100 }
        }
    }
});
}


function updateStudyVolumeChart(records) {

    const ctx = document.getElementById("afternoonChart").getContext("2d");

    if (window.volumeChart instanceof Chart) {
        window.volumeChart.destroy();
    }

    let bookTotal = 0;
    let reviewTotal = 0;

    records.forEach(r => {
        if (r.studyType === "book") {
            bookTotal += r.amount || 0;
        }
        if (r.studyType === "review") {
            reviewTotal += r.amount || 0;
        }

    });

    window.volumeChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["参考書(ページ)", "復習(分)"],
            datasets: [{
                label: "累計学習量",
                data: [bookTotal, reviewTotal]
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
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

if (cursor.value.category) {
subjects.add(cursor.value.category);
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



const sectionOptions = {
FE: [{value:"AM",text:"午前"},{value:"PM",text:"午後"}],
AP: [{value:"AM",text:"午前"},{value:"PM",text:"午後"}],
SC: [
{value:"AM1",text:"午前Ⅰ"},
{value:"AM2",text:"午前Ⅱ"},
{value:"PM",text:"午後"}
],
ADV: [
{value:"AM1",text:"午前Ⅰ"},
{value:"AM2",text:"午前Ⅱ"},
{value:"PM1",text:"午後Ⅰ"},
{value:"PM2",text:"午後Ⅱ（論文）"}
]
};

const majorCategories = [
"テクノロジ系",
"マネジメント系",
"ストラテジ系"
];

const apAfternoonSubjects = [
"情報セキュリティ",
"経営戦略",
"プログラミング",
"システムアーキテクチャ",
"ネットワーク",
"データベース",
"組込みシステム開発",
"情報システム開発",
"プロジェクトマネジメント",
"サービスマネジメント",
"システム監査"
];

const scAm1Categories = [
"テクノロジ系",
"マネジメント系",
"ストラテジ系"
];

const scAm2Categories = [
"暗号",
"認証・PKI",
"ネットワークセキュリティ",
"マルウェア・攻撃手法",
"脆弱性・診断",
"法務・ガイドライン",
"リスク管理"
];

const scPmCategories = [
"暗号設計",
"認証設計",
"ログ解析",
"インシデント対応",
"セキュア設計",
"クラウドセキュリティ",
"Webセキュリティ"
];

const advancedCategories = [
    "ネットワーク",
    "データベース",
    "セキュリティ",
    "システムアーキテクチャ",
    "プロジェクトマネジメント",
    "サービスマネジメント",
    "システム監査"
];


const examSelect = document.getElementById("examType");
const categorySelect = document.getElementById("category");
const sectionSelect = document.getElementById("section");

examSelect.addEventListener("change", function () {

const exam = this.value;

sectionSelect.innerHTML = '<option value="">選択してください</option>';
categorySelect.innerHTML = '<option value="">選択してください</option>';

const sections = sectionOptions[exam] || [];

sections.forEach(sec => {
const op = document.createElement("option");
op.value = sec.value;
op.textContent = sec.text;
sectionSelect.appendChild(op);
});

});


function updateSubjects() {

const exam = examSelect.value;
const section = sectionSelect.value;

categorySelect.innerHTML = '<option value="">選択してください</option>';

document.getElementById("evaluationArea").style.display = "none";

if (!exam || !section) return;


// ===== FE =====
if (exam === "FE") {

majorCategories.forEach(cat => {
const op = document.createElement("option");
op.value = cat;
op.textContent = cat;
categorySelect.appendChild(op);
});

}


// ===== AP =====
if (exam === "AP") {

// 午前（AM）
if (section === "AM") {

majorCategories.forEach(cat => {
const op = document.createElement("option");
op.value = cat;
op.textContent = cat;
categorySelect.appendChild(op);
});

}

// 午後（PM）
if (section === "PM") {

apAfternoonSubjects.forEach(sub => {
const op = document.createElement("option");
op.value = sub;
op.textContent = sub;
categorySelect.appendChild(op);
});

}

}


// ===== SC（支援士） =====
if (exam === "SC") {

if (section === "AM1") {
    scAm1Categories.forEach(cat => {
        const op = document.createElement("option");
        op.value = cat;
        op.textContent = cat;
        categorySelect.appendChild(op);
    });
}

if (section === "AM2") {
    scAm2Categories.forEach(cat => {
        const op = document.createElement("option");
        op.value = cat;
        op.textContent = cat;
        categorySelect.appendChild(op);
    });
}

if (section === "PM") {
    scPmCategories.forEach(cat => {
        const op = document.createElement("option");
        op.value = cat;
        op.textContent = cat;
        categorySelect.appendChild(op);
    });
}
}


// ===== ADV（高度種） =====
if (exam === "ADV") {

// 午前Ⅰ・Ⅱ → 大分類
if (section === "AM1" || section === "AM2") {
    majorCategories.forEach(cat => {
        const op = document.createElement("option");
        op.value = cat;
        op.textContent = cat;
        categorySelect.appendChild(op);
    });
}

// 午後Ⅰ → 分野選択
if (section === "PM1") {
    advancedCategories.forEach(sub => {
        const op = document.createElement("option");
        op.value = sub;
        op.textContent = sub;
        categorySelect.appendChild(op);
    });
}

// 午後Ⅱ（論文） → 分野不要
if (section === "PM2") {
    const op = document.createElement("option");
    op.value = "論文";
    op.textContent = "論文";
    categorySelect.appendChild(op);

    // 論文評価を表示
    document.getElementById("evaluationArea").style.display = "block";
}
}

}


sectionSelect.addEventListener("change", updateSubjects);
examSelect.addEventListener("change", updateSubjects);


document.addEventListener("DOMContentLoaded", function () {

const studyTypeSelect = document.getElementById("studyType");
const amountFields = document.querySelectorAll(".amount-field");

if (studyTypeSelect) {
    studyTypeSelect.addEventListener("change", function () {

        const selected = this.value;
        const categoryArea = document.getElementById("categoryArea");
        const categorySelect = document.getElementById("category");

        if (categoryArea && categorySelect) {

            if (selected === "mock-am" || selected === "mock-pm") {
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
            if (
                field.dataset.type === selected ||
                (selected === "morning" && field.dataset.type === "correct") ||
                (selected === "afternoon" && field.dataset.type === "correct") ||
                (selected === "mock" && field.dataset.type === "mock-afternoon")
            ){
                field.style.display = "block";
            }
        });

    });
}

});

function loadForEdit(record) {

showRegister();

editingId = record.id;

// ① examセット
document.getElementById("examType").value = record.examType;

// ② section optionを生成
const event = new Event("change");
document.getElementById("examType").dispatchEvent(event);

// ③ sectionセット
document.getElementById("section").value = record.section;

// ④ category option生成
document.getElementById("section").dispatchEvent(new Event("change"));

// ⑤ categoryセット
document.getElementById("category").value = record.category;

// ⑥ 他項目
document.getElementById("studyType").value = record.studyType;
document.getElementById("content").value = record.content;
document.getElementById("level").value = record.understanding;
document.getElementById("date").value = record.studyDate;

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