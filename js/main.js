let editingId = null;

function restoreLastInput() {

    const last = JSON.parse(localStorage.getItem("lastStudyInput") || "{}");

    if (last.subject) {
        document.getElementById("subject").value = last.subject;
    }

    if (last.studyType) {
        document.getElementById("studyType").value = last.studyType;
    }
}

document.addEventListener("DOMContentLoaded", restoreLastInput);