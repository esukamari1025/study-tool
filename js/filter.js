// ==========================
// フィルター
// ==========================
document.getElementById("filterSubject")
?.addEventListener("change", applyFilters);

document.getElementById("filterStudyType")
?.addEventListener("change", applyFilters);

document.getElementById("filterSection")
?.addEventListener("change", applyFilters);

document.getElementById("filterExam")
?.addEventListener("change", applyFilters);

document.getElementById("filterLevel")
?.addEventListener("change", applyFilters);


// ==========================
// フィルター更新
// ==========================
function updateSubjectFilterOptions() {

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
function applyFilters() {

const filters = {
    subject: document.getElementById("filterSubject")?.value || "",
    studyType: document.getElementById("filterStudyType")?.value || "",
    level: document.getElementById("filterLevel")?.value || "",
    section: document.getElementById("filterSection")?.value || "",
    exam: document.getElementById("filterExam")?.value || ""
};

displayLogs(filters);
}