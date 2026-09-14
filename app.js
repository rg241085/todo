import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp, query, orderBy, arrayUnion } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC71yAhrT6y7cqFnqXjLKV6wiHg9oImGfE",
    authDomain: "todo-16b21.firebaseapp.com",
    projectId: "todo-16b21",
    storageBucket: "todo-16b21.firebasestorage.app",
    messagingSenderId: "910471081785",
    appId: "1:910471081785:web:ce56993b64e1361e2c82e8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const taskList = document.getElementById('taskList');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

// Modals
const editModal = document.getElementById('editModal');
const addModal = document.getElementById('addModal');
let currentEditId = null;

const tasksRef = collection(db, "tasks");
const q = query(tasksRef, orderBy("createdAt", "desc"));

onSnapshot(q, (snapshot) => {
    taskList.innerHTML = ''; 
    let totalTasks = 0;
    let completedTasks = 0;
    let serialIndex = 1;

    snapshot.forEach((docSnap) => {
        totalTasks++;
        const taskData = docSnap.data();
        const taskId = docSnap.id;

        if (taskData.completed) completedTasks++;

        const li = document.createElement('li');
        li.className = 'task-card'; 
        if (taskData.completed) li.classList.add('completed-card');

        let createdStr = 'Just now';
        if (taskData.createdAt) {
            createdStr = taskData.createdAt.toDate().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' });
        }

        let alertBadge = '';
        if (taskData.dueDate && !taskData.completed) {
            const due = new Date(taskData.dueDate);
            const today = new Date(); today.setHours(0,0,0,0); due.setHours(0,0,0,0);
            const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) alertBadge = `<span class="badge overdue"><i class="ri-error-warning-line"></i> Overdue by ${Math.abs(diffDays)} days</span>`;
            else if (diffDays === 0) alertBadge = `<span class="badge due-today"><i class="ri-timer-line"></i> Due Today</span>`;
            else alertBadge = `<span class="badge upcoming"><i class="ri-calendar-event-line"></i> ${diffDays} days left</span>`;
        } else if (taskData.dueDate && taskData.completed) {
            alertBadge = `<span class="badge"><i class="ri-check-double-line"></i> Due was: ${new Date(taskData.dueDate).toLocaleDateString('en-GB')}</span>`;
        }

        const priorityBadge = taskData.priority === 'high' ? `<span class="badge priority-high"><i class="ri-fire-line"></i> High</span>` : '';
        const safeText = taskData.text.replace(/"/g, '&quot;'); 

        let repliesHtml = '';
        if (taskData.replies && taskData.replies.length > 0) {
            repliesHtml = '<div class="replies-list">';
            taskData.replies.forEach(reply => {
                repliesHtml += `<div class="reply-item"><i class="ri-corner-down-right-line"></i> ${reply}</div>`;
            });
            repliesHtml += '</div>';
        }

        li.innerHTML = `
            <div class="card-header">
                <div class="card-header-left">
                    <span class="serial-no">#${serialIndex}</span>
                    <input type="checkbox" class="status-checkbox" data-id="${taskId}" ${taskData.completed ? 'checked' : ''}>
                </div>
                <div class="action-btns">
                    <button class="icon-btn edit-btn" data-id="${taskId}" data-text="${safeText}" data-date="${taskData.dueDate || ''}" data-priority="${taskData.priority || 'normal'}" title="Edit"><i class="ri-edit-2-line"></i></button>
                    <button class="icon-btn delete-btn" data-id="${taskId}" title="Delete"><i class="ri-delete-bin-line"></i></button>
                </div>
            </div>
            <div class="card-body"><div class="task-text">${taskData.text}</div></div>
            
            <div class="card-footer">
                <div class="badges-container">${priorityBadge} ${alertBadge}</div>
                <span class="created-time">${createdStr}</span>
            </div>
            
            <div class="reply-section">
                ${repliesHtml}
                <div class="reply-input-box">
                    <input type="text" class="reply-input" placeholder="Add a reply...">
                    <button class="send-reply-btn" data-id="${taskId}" title="Send Reply"><i class="ri-send-plane-fill"></i></button>
                </div>
            </div>
        `;
        taskList.appendChild(li);
        serialIndex++;
    });

    const progressPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
    progressFill.style.width = `${progressPercentage}%`;
    progressText.innerText = `${progressPercentage}%`;

    // Edit Modal Kholna
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const button = e.currentTarget;
            currentEditId = button.getAttribute('data-id');
            document.getElementById('editTaskInput').value = button.getAttribute('data-text');
            document.getElementById('editTaskDate').value = button.getAttribute('data-date');
            document.getElementById('editTaskPriority').value = button.getAttribute('data-priority');
            editModal.classList.add('active'); 
            document.getElementById('editTaskInput').focus();
        });
    });

    // Delete karna
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if(confirm("Are you sure you want to delete this task?")) {
                await deleteDoc(doc(db, "tasks", e.currentTarget.getAttribute('data-id')));
            }
        });
    });

    // Status Checkbox
    document.querySelectorAll('.status-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', async (e) => {
            await updateDoc(doc(db, "tasks", e.currentTarget.getAttribute('data-id')), { completed: e.currentTarget.checked });
        });
    });

    // Reply Bhejna
    document.querySelectorAll('.send-reply-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const taskId = e.currentTarget.getAttribute('data-id');
            const inputField = e.currentTarget.previousElementSibling;
            const replyText = inputField.value.trim();
            if(replyText !== "") {
                try {
                    await updateDoc(doc(db, "tasks", taskId), { replies: arrayUnion(replyText) });
                    inputField.value = '';
                } catch (error) { console.error("Error: ", error); }
            }
        });
        btn.previousElementSibling.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') btn.click();
        });
    });
});

// --- CORE FUNCTION TO ADD TASK TO FIREBASE ---
async function createTaskToDB(text, date, priority) {
    if (text === '') return;
    try {
        await addDoc(tasksRef, {
            text: text, dueDate: date, priority: priority, completed: false, 
            replies: [], createdAt: serverTimestamp()
        });
    } catch (error) { alert("Error adding task!"); }
}

// --- DESKTOP ADD LOGIC ---
const taskInput = document.getElementById('taskInput');
document.getElementById('addBtn').addEventListener('click', async () => {
    await createTaskToDB(taskInput.value.trim(), document.getElementById('taskDate').value, document.getElementById('taskPriority').value);
    taskInput.value = ''; document.getElementById('taskDate').value = ''; document.getElementById('taskPriority').value = 'normal';
    taskInput.focus();
});
taskInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('addBtn').click(); });

// --- MOBILE ADD LOGIC ---
document.getElementById('mobileFabBtn').addEventListener('click', () => {
    addModal.classList.add('active');
    document.getElementById('mobileTaskInput').focus();
});
document.getElementById('saveMobileAddBtn').addEventListener('click', async () => {
    const text = document.getElementById('mobileTaskInput').value.trim();
    if(text !== '') {
        await createTaskToDB(text, document.getElementById('mobileTaskDate').value, document.getElementById('mobileTaskPriority').value);
        document.getElementById('mobileTaskInput').value = ''; 
        addModal.classList.remove('active');
    }
});
document.getElementById('closeAddModalIcon').addEventListener('click', () => addModal.classList.remove('active'));
document.getElementById('cancelAddBtn').addEventListener('click', () => addModal.classList.remove('active'));

// --- EDIT LOGIC ---
function closeEditPopup() { editModal.classList.remove('active'); currentEditId = null; }
document.getElementById('cancelEditBtn').addEventListener('click', closeEditPopup);
document.getElementById('closeModalIcon').addEventListener('click', closeEditPopup);
document.getElementById('saveEditBtn').addEventListener('click', async () => {
    const updatedText = document.getElementById('editTaskInput').value.trim();
    if (!currentEditId || updatedText === '') return;
    try {
        await updateDoc(doc(db, "tasks", currentEditId), {
            text: updatedText, dueDate: document.getElementById('editTaskDate').value, priority: document.getElementById('editTaskPriority').value
        });
        closeEditPopup();
    } catch (error) { console.error("Error updating: ", error); }
});

// General Shortcut
document.addEventListener('keydown', (e) => { if (e.key === 'F8') { e.preventDefault(); taskInput.focus(); } });