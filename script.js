
const API_URL = "https://task-flow-y0wl.onrender.com/api";

let token = localStorage.getItem("token");
let currentUser = JSON.parse(localStorage.getItem("user")) || null;
let allTasks = [];

// HTML ELEMENTS
const authSection = document.getElementById("authSection");
const taskSection = document.getElementById("taskSection");

const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const authMessage = document.getElementById("authMessage");
const taskMessage = document.getElementById("taskMessage");

const taskTitle = document.getElementById("taskTitle");
const taskDescription = document.getElementById("taskDescription");
const taskStatus = document.getElementById("taskStatus");
const taskPriority = document.getElementById("taskPriority");
const taskDueDate = document.getElementById("taskDueDate");

const taskList = document.getElementById("taskList");
const taskSearch = document.getElementById("taskSearch");
const taskFilter = document.getElementById("taskFilter");
const taskSort = document.getElementById("taskSort");

const welcomeUser = document.getElementById("welcomeUser");

// API HELPER
async function apiRequest(endpoint, method = "GET", data = null) {
    const options = {
        method,
        headers: {
            "Content-Type": "application/json"
        }
    };

    if (token) {
        options.headers.Authorization = `Bearer ${token}`;
    }

    if (data) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(result.message || "Something went wrong");
    }

    return result;
}

// REGISTER
document.getElementById("registerBtn").addEventListener("click", async () => {
    try {
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!name || !email || !password) {
            authMessage.textContent = "Please fill all fields.";
            return;
        }

        const result = await apiRequest("/auth/register", "POST", {
            name,
            email,
            password
        });

        authMessage.textContent =
            result.message || "Registration successful. Please login.";

    } catch (error) {
        authMessage.textContent = error.message;
    }
});

// LOGIN
document.getElementById("loginBtn").addEventListener("click", async () => {
    try {
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            authMessage.textContent = "Enter email and password.";
            return;
        }

        const result = await apiRequest("/auth/login", "POST", {
            email,
            password
        });

        token = result.token;
        currentUser = result.user;

        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(currentUser));

        authMessage.textContent = "";

        showTaskSection();
        await loadTasks();

    } catch (error) {
        authMessage.textContent = error.message;
    }
});

// SHOW TASK SECTION
function showTaskSection() {
    authSection.style.display = "none";
    taskSection.style.display = "block";

    welcomeUser.textContent =
        `Welcome, ${currentUser?.name || "User"}!`;
}

// LOAD TASKS
async function loadTasks() {
    try {
        const result = await apiRequest("/tasks");

        allTasks = Array.isArray(result) ? result : [];

        updateSummary();
        applyTaskFilters();

    } catch (error) {
        taskMessage.textContent = error.message;
    }
}

// CHECK OVERDUE TASK
function isOverdue(task) {
    if (!task.dueDate || task.status === "Completed") {
        return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    return dueDate < today;
}

// UPDATE DASHBOARD SUMMARY
function updateSummary() {
    document.getElementById("totalTasks").textContent =
        allTasks.length;

    document.getElementById("pendingTasks").textContent =
        allTasks.filter(task => task.status === "Pending").length;

    document.getElementById("inProgressTasks").textContent =
        allTasks.filter(task => task.status === "In Progress").length;

    document.getElementById("completedTasks").textContent =
        allTasks.filter(task => task.status === "Completed").length;

    // OVERDUE TASK COUNT
    document.getElementById("overdueTasks").textContent =
        allTasks.filter(task => isOverdue(task)).length;
}

// APPLY SEARCH, FILTER AND SORT
function applyTaskFilters() {
    const selectedFilter = taskFilter.value;
    const searchText = taskSearch.value.trim().toLowerCase();
    const selectedSort = taskSort.value;

    // SEARCH AND FILTER
    let filteredTasks = allTasks.filter(task => {
        const status = task.status || "Pending";

        const matchesStatus =
            selectedFilter === "All" || status === selectedFilter;

        const matchesSearch =
            (task.title || "").toLowerCase().includes(searchText) ||
            (task.description || "").toLowerCase().includes(searchText);

        return matchesStatus && matchesSearch;
    });

    // SORT TASKS
    const priorityOrder = {
        High: 1,
        Medium: 2,
        Low: 3
    };

    filteredTasks.sort((a, b) => {
        switch (selectedSort) {

            case "newest":
                return new Date(b.createdAt || 0) -
                       new Date(a.createdAt || 0);

            case "oldest":
                return new Date(a.createdAt || 0) -
                       new Date(b.createdAt || 0);

            case "dueDate":
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;

                return new Date(a.dueDate) -
                       new Date(b.dueDate);

            case "priority":
                return (priorityOrder[a.priority || "Medium"] || 2) -
                       (priorityOrder[b.priority || "Medium"] || 2);

            default:
                return 0;
        }
    });

    displayTasks(filteredTasks);
}

// SEARCH, FILTER AND SORT EVENTS
taskFilter.addEventListener("change", applyTaskFilters);
taskSearch.addEventListener("input", applyTaskFilters);
taskSort.addEventListener("change", applyTaskFilters);

// FORMAT DATE
function formatDate(dateValue) {
    if (!dateValue) {
        return "No due date";
    }

    const date = new Date(dateValue);

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

// DISPLAY TASKS
function displayTasks(tasks) {
    taskList.innerHTML = "";

    if (tasks.length === 0) {
        taskList.textContent = "No tasks found.";
        return;
    }

    tasks.forEach(task => {
        const card = document.createElement("div");
        card.className = "task-card";

        const title = document.createElement("h3");
        title.textContent = task.title;

        const description = document.createElement("p");
        description.textContent =
            task.description || "No description";

        const status = document.createElement("p");
        status.textContent =
            `Status: ${task.status || "Pending"}`;

        // PRIORITY
        const priorityValue = task.priority || "Medium";

        const priority = document.createElement("p");
        priority.className =
            `priority-badge priority-${priorityValue.toLowerCase()}`;

        priority.textContent = `Priority: ${priorityValue}`;

        // DUE DATE
        const dueDate = document.createElement("p");
        dueDate.className = "task-due-date";

        dueDate.textContent =
            `Due Date: ${formatDate(task.dueDate)}`;

        // OVERDUE LABEL
        if (isOverdue(task)) {
            dueDate.classList.add("overdue");
            dueDate.textContent += " - OVERDUE";
        }

        // EDIT BUTTON
        const editButton = document.createElement("button");
        editButton.textContent = "Edit";

        editButton.addEventListener("click", () => {
            editTask(task);
        });

        // DELETE BUTTON
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
            deleteTask(task._id);
        });

        card.appendChild(title);
        card.appendChild(description);
        card.appendChild(status);
        card.appendChild(priority);
        card.appendChild(dueDate);
        card.appendChild(editButton);
        card.appendChild(deleteButton);

        taskList.appendChild(card);
    });
}

// ADD TASK
document.getElementById("addTaskBtn").addEventListener("click", async () => {
    try {
        const title = taskTitle.value.trim();
        const description = taskDescription.value.trim();
        const status = taskStatus.value;
        const priority = taskPriority.value;
        const dueDate = taskDueDate.value || null;

        if (!title) {
            taskMessage.textContent = "Task title is required.";
            return;
        }

        await apiRequest("/tasks", "POST", {
            title,
            description,
            status,
            priority,
            dueDate
        });

        taskMessage.textContent = "Task added successfully!";

        taskTitle.value = "";
        taskDescription.value = "";
        taskStatus.value = "Pending";
        taskPriority.value = "Medium";
        taskDueDate.value = "";

        await loadTasks();

    } catch (error) {
        taskMessage.textContent = error.message;
    }
});

// EDIT TASK
async function editTask(task) {
    const title = prompt("Enter new task title:", task.title);

    if (title === null) return;

    const description = prompt(
        "Enter new description:",
        task.description || ""
    );

    if (description === null) return;

    const status = prompt(
        "Enter status (Pending, In Progress, Completed):",
        task.status || "Pending"
    );

    if (status === null) return;

    const priority = prompt(
        "Enter priority (High, Medium, Low):",
        task.priority || "Medium"
    );

    if (priority === null) return;

    const existingDate = task.dueDate
        ? new Date(task.dueDate).toISOString().slice(0, 10)
        : "";

    const dueDate = prompt(
        "Enter due date (YYYY-MM-DD), or leave empty for no due date:",
        existingDate
    );

    if (dueDate === null) return;

    const validStatuses = [
        "Pending",
        "In Progress",
        "Completed"
    ];

    const validPriorities = [
        "High",
        "Medium",
        "Low"
    ];

    if (!title.trim()) {
        alert("Task title cannot be empty.");
        return;
    }

    if (!validStatuses.includes(status)) {
        alert("Invalid status.");
        return;
    }

    if (!validPriorities.includes(priority)) {
        alert("Invalid priority.");
        return;
    }

    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
        alert("Please enter the date in YYYY-MM-DD format.");
        return;
    }

    try {
        await apiRequest(`/tasks/${task._id}`, "PUT", {
            title: title.trim(),
            description,
            status,
            priority,
            dueDate: dueDate || null
        });

        alert("Task updated successfully!");

        await loadTasks();

    } catch (error) {
        alert(error.message);
    }
}

// DELETE TASK
async function deleteTask(id) {
    const confirmDelete = confirm(
        "Are you sure you want to delete this task?"
    );

    if (!confirmDelete) return;

    try {
        await apiRequest(`/tasks/${id}`, "DELETE");

        taskMessage.textContent = "Task deleted successfully!";

        await loadTasks();

    } catch (error) {
        taskMessage.textContent = error.message;
    }
}

// LOGOUT
document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    token = null;
    currentUser = null;
    allTasks = [];

    taskList.innerHTML = "";

    taskSearch.value = "";
    taskFilter.value = "All";
    taskSort.value = "newest";

    updateSummary();

    taskSection.style.display = "none";
    authSection.style.display = "block";

    authMessage.textContent = "";
    taskMessage.textContent = "";
    passwordInput.value = "";
});

// RESTORE SESSION
async function restoreSession() {
    if (token && currentUser) {
        showTaskSection();
        await loadTasks();
    }
}

restoreSession();
