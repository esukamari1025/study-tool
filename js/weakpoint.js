
// ==========================
// 苦手メモ 表示
// ==========================
function displayWeakPoints() {

const ul = document.getElementById("weakList");
if (!ul) return;

ul.innerHTML = "";

const records = [];

const tx = db.transaction("weak_points", "readonly");
const store = tx.objectStore("weak_points");

store.openCursor().onsuccess = (e) => {

    const cursor = e.target.result;

    if (!cursor) {

        // 優先度順 → 同じ優先度なら入力順
        records.sort((a, b) => {
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }

            return a.id - b.id;
        });

        records.forEach(m => {

            const li = document.createElement("li");

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

        });

        return;
    }

    records.push(cursor.value);
    cursor.continue();
};
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
    
    