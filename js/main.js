let editingId = null;

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

document.getElementById("date").valueAsDate = new Date();

// const currentView = localStorage.getItem("currentView");

// if (currentView === "logs") {
//     showLogs();
// } else {
//     showRegister();
// }

// updateSubjectFilterOptions();
// displayLogs();
// displayWeakPoints();

});
