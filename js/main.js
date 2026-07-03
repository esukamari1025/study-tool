let editingId = null;

document.addEventListener("DOMContentLoaded", () => {
    restoreLastInput();
});

function restoreLastInput() {

    const last = JSON.parse(localStorage.getItem("lastStudyInput") || "{}");

    if (last.subject) {
        document.getElementById("subject").value = last.subject;
    }

    if (last.studyType) {
        document.getElementById("studyType").value = last.studyType;
    }
}