let editingId = null;

document.addEventListener("DOMContentLoaded", function () {

const studyTypeSelect = document.getElementById("studyType");

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
