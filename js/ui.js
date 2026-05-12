function showToast(message, type = "success") {

const toast = document.getElementById("toast");
if (!toast) return;

toast.className = `toast show ${type}`;
toast.textContent = message;

setTimeout(() => {
toast.className = "toast";
}, 2000);
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
