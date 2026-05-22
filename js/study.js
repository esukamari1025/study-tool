// ==========================
// 学習記録 登録
// ==========================
document.getElementById("studyForm").addEventListener("submit", (e) => {
e.preventDefault();

const studyType = document.getElementById("studyType").value;

const studyDate = document.getElementById("date").value;

if (!studyDate) {
    alert("学習日を入力してください");
    return;
}

const today = new Date();
today.setHours(0, 0, 0, 0);

const inputDate = new Date(studyDate);

if (inputDate > today) {
    alert("未来の日付は入力できません");
    return;
}

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
    alert("科目を入力してください");
    return;
}

if (!record.content.trim()) {
    alert("学習内容を入力してください");
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
updateSubjectFilterOptions();
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

document.getElementById("cancelEdit").style.display = "none";

showLogs();
};
});


// ==========================
// 学習記録表示
// ==========================
function displayLogs({subject="", section="", studyType="", exam="", level=""} = {}){

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

tr.style.cursor = "pointer";

tr.addEventListener("click", () => {
    loadForReuse(r);
});

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
<td>${STUDY_TYPE_LABELS[r.studyType] || r.studyType}</td>
<td>${r.studyTime || "-"}</td>
<td>${r.understanding}</td>
`;

const td = document.createElement("td");
const editBtn = document.createElement("button");
editBtn.textContent = "編集";
editBtn.classList.add("edit-btn");
editBtn.onclick = (e) => {
    e.stopPropagation();
    loadForEdit(r);
};
td.appendChild(editBtn);

const btn = document.createElement("button");
btn.textContent = "削除";
btn.classList.add("delete-btn");
btn.onclick = (e) => {
    e.stopPropagation();
    deleteLog(r);
};
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

if (level && String(r.understanding) !== level) {
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

function loadForReuse(record) {

    showRegister();

    editingId = null;

    document.getElementById("studyType").value = record.studyType;
    document.getElementById("studyType")
    .dispatchEvent(new Event("change"));

    document.getElementById("content").value = record.content;
    document.getElementById("subject").value = record.subject;
    document.getElementById("studyTime").value = record.studyTime;
    document.getElementById("level").value = record.understanding;

    // 日付は今日
    document.getElementById("date").valueAsDate = new Date();

    document.getElementById("submitBtn").textContent = "登録";
    document.getElementById("submitBtn")
    .classList.remove("edit-mode");

    document.getElementById("cancelEdit").style.display = "none";

    window.scrollTo({ top: 0, behavior: "smooth" });
}

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