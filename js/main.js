let editingId = null;

document.addEventListener("DOMContentLoaded", function () {

const last = JSON.parse(localStorage.getItem("lastStudyInput") || "{}");

if (last.subject) {
    document.getElementById("subject").value = last.subject;
}

if (last.studyType) {
    el.value = last.studyType;
    el.dispatchEvent(new Event("change"));
}

});
// test