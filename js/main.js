/* Start global variables decleration */
let currentCalendarDate = new Date();
const apiUrl = "https://88s5rw95le.execute-api.us-east-1.amazonaws.com/Prod/tasks";
const indexPageURL = "https://oronix-tasks.s3.us-east-1.amazonaws.com/index.html";
const frontPageUrl = "https://oronix-tasks.s3.us-east-1.amazonaws.com/homePage.html";
const adminPageUrl = "https://oronix-tasks.s3.us-east-1.amazonaws.com/admin.html";
const headers = {
  "Content-Type": "application/json",
  "Authorization": sessionStorage.getItem("tokenId")
};

/* End global variables decleration */


/* Start document Ready */
$(document).ready(async function () {
  // Initialize the display
  await updateView();
  console.log("View updated successfully.");

  // Event Handlers
  registerEventHandlers();
  console.log("Event handlers registered.");

  // Update day options when year or month changes in Add/Edit form - NO DB
  $("#task-year, #task-month").on("change", function () {
    console.log("Updating deadline's selectors...");

    let selectedYear = parseInt($("#task-year").val());
    let selectedMonth = parseInt($("#task-month").val());
    let currentDay = new Date().getDate();

    if (!isNaN(selectedYear) && !isNaN(selectedMonth)) {
      loadDayOptions(currentDay, selectedMonth, selectedYear);
    }
  });

  // Close modal on outside click - NO DB
  $(document).on("click", function (e) {
    if (!$(e.target).closest(".task-modal").length && !$(e.target).hasClass("calendar-day")) {
      $(".task-modal").remove();
    }
  });

  // Calendar day click - NEW
  $(document).on("click", ".calendar-day:not(.empty)", async function () {
    const $element = $(this);
    const selectedDate = new Date($element.data("date"));
    const normalizedSelectedDate = selectedDate.toISOString().split("T")[0]; // Normalize to YYYY-MM-DD
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      notify("Cannot add/edit tasks for past dates!", "error");
      return;
    }
  
    const tasks = await GETtasksFromDB(); // Ensure tasks are fetched properly
    const tasksOnDate = tasks.filter((task) => {
      if (!task.dueDate) return false; // Skip tasks with invalid dates
      const taskDate = new Date(task.dueDate).toISOString().split("T")[0]; // Normalize task date to YYYY-MM-DD
      return (
        taskDate === normalizedSelectedDate &&
        task.status.toLowerCase() !== "completed"
      );
    });
  
    // Show modal with tasks
    $(".task-modal").remove();
    const modal = $("<div class='task-modal'></div>");
    const rect = $element[0].getBoundingClientRect();
  
    modal.css({
      top: `${rect.bottom + window.scrollY - 200}px`,
      left: `${rect.left + window.scrollX}px`,
    });
  
    modal.append(`<h3>Tasks for: ${selectedDate.toLocaleDateString("en-GB")}</h3>`);
  
    if (tasksOnDate.length > 0) {
      tasksOnDate.forEach((task) => {
        modal.append(`
          <div class="modal-task-item" data-task-id="${task.taskId}">
            <p>
              <strong>${task.title}</strong>
              (${task.status})
            </p>
          </div>
        `);
      });
    } else {
      modal.append("<p>No tasks due on this date.</p>");
    }
  
    modal.append(`<button class="add-task">Add Task</button>`);
    $("body").append(modal);
  
    $(".add-task").on("click", function () {
      clearForm();
      $("#task-day").val(selectedDate.getDate());
      $("#task-month").val(selectedDate.getMonth());
      $("#task-year").val(selectedDate.getFullYear());
      enableFormCalendarCreateMode();
      modal.remove();
    });
  
    $(".modal-task-item").on("click", function () {
      const taskId = $(this).data("task-id");
      const task = tasks.find((t) => t.taskId === taskId);
      if (task) {
        const button = document.getElementById("button-save");
        button.innerText = "Save changes";

        editTaskSection(task);
        modal.remove();
      }
    });
  });
});
/* End document ready */

/* Start event handlers */
function registerEventHandlers() {
  console.log("Registering event handlers.");

  // Add task button - NO DB
  $("#button-add").on("click", () => {
    resetFormState();
    enableFormCreateMode();
  });

  // Arrow back button - NO DB
  $("#arrow-back").on("click", () => {
    resetFormState();
    resetValidationErrors();
    if ($(".section-add-edit").is(":visible")) {
      $(".section-add-edit").hide();
      $(".section-home").show();
    } else if ($(".section-view").is(":visible")) {
      $(".section-view").hide();
      $(".section-home").show();
    }
    $("#arrow-back").css("visibility", "hidden");
  });

  // Calendar navigation buttons - NO DB
  $("#prev-month").on("click", async () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);

    const tasks = await GETtasksFromDB();

    displayCalendar(tasks);
    populateMonthYearSelectors();
  });
  $("#next-month").on("click", async () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);

    const tasks = await GETtasksFromDB();

    displayCalendar(tasks);
    populateMonthYearSelectors();
  });
  $("#select-month, #select-year").on("change", async function () {
    const month = parseInt($("#select-month").val());
    const year = parseInt($("#select-year").val());
    currentCalendarDate.setMonth(month);
    currentCalendarDate.setFullYear(year);

    const tasks = await GETtasksFromDB();

    displayCalendar(tasks);
  });

  // Type list task click
  $("#tasks-list").on("click", ".task-item",async function () {
    const taskId = $(this).data("task-id");
    console.log("Tasks type item clicked.", { taskId });
    
    const tasks = await GETtasksFromDB();
    const task = tasks.find((t) => t.taskId === taskId);

    const button = document.getElementById("button-save");
    button.innerText = "Save changes";

    if (task) {
      editTaskSection(task);
    } else {
      console.error("Task not found for editing.", { taskId });
    }

    // MAYBE ADD A LAMBDA FUNC TO GET A TASK BY ID //
    //const task = getTaskById(taskId);
    //if (task) editTaskSection(task);
  });

  // Today list task click - NEW
  $("#today-task-list").on("click", ".task-item",async function () {
    const taskId = $(this).data("task-id");
    console.log("Today task clicked.", { taskId });

    const button = document.getElementById("button-save");
    button.innerText = "Save changes";

    const tasks = await GETtasksFromDB();

    const task = tasks.find((t) => t.taskId === taskId);
    
    if (task) {
      editTaskSection(task);
    } else {
      console.error("Task not found for editing:", taskId);
    }
  });
  
  // Display Task Types
  $(".task-type").on("click", function () {
    const type = $(this).data("type");
    console.log("Task type clicked.", { type })

    displayTasksByType(type);
  });

  // CRUD Buttons
  // Save changes button
  $("#button-save").on("click", async function (event) {
    event.preventDefault();
    
    const buttonText = $(this).text();
    console.log("Save button clicked.", { buttonText });
    
    const action = buttonText === "Save changes" ? "put" : "post";

    const success = await submitTaskDB(action);

    if (success) {
      console.log(`Task ${action === "put" ? "updated" : "created"} successfully.`);
      resetFormState();
      displayHomeScreen();
      notify(`Task ${action === "put" ? "edited" : "created"} successfully!`, "success");
    } else {
      console.error("Failed to save task.");
      notify(`Failed to ${action === "put" ? "edit" : "create"} task!`, "error");
    }
  });

  // Create task button
  $("#button-create").on("click", async function (event) {
    event.preventDefault();

    const dueDate = await getTaskDate();

    const currTask = {
      "title": $("#task-name").val(),
      "description": encodeURIComponent($("#task-description").val()),
      "status": $("#task-status").val(),
      "dueDate": dueDate
    };

    let task = submitTaskDB(currTask);

    console.log(task);
    if (task) {
      resetFormState();
      displayHomeScreen();

      notify("Task created successfully!", "success");
    } else {
      notify("Could not create a task!", "error");
    }
  });

  // Delete task button
  $("#button-delete").on("click", function (event) {
    event.preventDefault();
    
    displayConfirmationDelete();
  });
  
  // Confirm delete
  $("#button-confirm-yes").on("click", async function (event) {
    event.preventDefault();
    
    const taskId = $("#task-id").val()
    
    hideConfirmationDelete();
    console.log("Task ID to delete: " + taskId);
    DELETEtask(taskId);
    resetFormState();
    resetValidationErrors();
    await updateView();
    displayCalendar();
  });
  
  // Unconfirm delete - NO DB
  $("#button-confirm-no").on("click", function (event) {
    event.preventDefault();
    
    hideConfirmationDelete();
  });
}
/* End event handlers */


/* Start functions */
// Notifications - NO DB
function notify(message, typeMessage) {
  const notification = document.createElement("div");
  
  notification.classList.add(`notification-${typeMessage}`, "notification");
  notification.textContent = message;

  const container = document.getElementById("notifications");
  container.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Update the page
async function updateView() {
  const tasks = await GETtasksFromDB();

  updateHomeScreen(tasks); 
  displayCalendar(tasks); 
  displayTodayTasks(tasks); 
  loadDataSelect();
  populateMonthYearSelectors();
}

// Display home screen - NO DB
function displayHomeScreen() {
  $(".navbar").show();
  $(".section-add-edit").hide();
  $(".section-view").hide();
  $(".section-home").show();
  $("#arrow-back").css("visibility", "hidden");
}

// Create/Edit mode
// Edit task mode - NO DB
function enableFormEditMode() {
  resetValidationErrors();
  $("#arrow-back").css("visibility", "visible");
  $(".section-home").hide();
  $(".section-view").hide();
  $(".section-add-edit").show();
  $(".form-create-mode").hide();
  $(".form-edit-mode").show();
}

// Edit calendar task mode - NO DB
function enableFormCalendarCreateMode() {
  resetValidationErrors();
  $("#arrow-back").css("visibility", "visible");
  $(".section-home").hide();
  $(".section-view").hide();
  $(".section-add-edit").show();
  $(".form-create-mode").hide();
  $(".form-edit-mode").show();
  document.getElementById("button-delete").style.display = "none";
}

// Create task mode - NO DB
function enableFormCreateMode() {
  resetFormState(); 
  resetValidationErrors();
  $("#arrow-back").css("visibility", "visible");
  $(".section-home").hide();
  $(".section-view").hide();
  $(".section-add-edit").show();
  $(".form-create-mode").show();
  $(".form-edit-mode").hide();
}

// Load the dates data - NO DB
function loadDataSelect() {
  let today = new Date();
  let currentDay = today.getDate();
  let currentMonth = today.getMonth();
  let currentYear = today.getFullYear();

  loadYearOptions(currentYear);
  loadMonthOptions(currentMonth, currentYear);
  loadDayOptions(currentDay, currentMonth, currentYear);
}

// Load year options - NO DB
function loadYearOptions(currentYear) {
  $("#task-year").empty();
  for (let i = currentYear; i <= currentYear + 20; i++) {
    $("#task-year").append(`<option value="${i}" ${currentYear === i ? "selected" : ""}>${i}</option>`);
  }
}

// Load month options - NO DB
function loadMonthOptions(currentMonth) {
  $("#task-month").empty();
  for (let i = 0; i < 12; i++) {
    $("#task-month").append(
      `<option value="${i}" ${currentMonth === i ? "selected" : ""}>${new Date(0, i).toLocaleString("default", {
        month: "long",
      })}</option>`
    );
  }
}

// Load day options - NO DB
function loadDayOptions(currentDay, selectedMonth, selectedYear) {
  $("#task-day").empty();
  let daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    $("#task-day").append(`<option value="${i}" ${currentDay === i ? "selected" : ""}>${i}</option>`);
  }
}

// Load year options - NO DB
function populateMonthYearSelectors() {
  const monthSelect = $("#select-month");
  const yearSelect = $("#select-year");

  monthSelect.empty();
  yearSelect.empty();

  for (let i = 0; i < 12; i++) {
    const monthName = new Date(0, i).toLocaleString("default", { month: "long" });
    monthSelect.append(`<option value="${i}" ${i === currentCalendarDate.getMonth() ? "selected" : ""}>${monthName}</option>`);
  }

  const currentYear = new Date().getFullYear();
  for (let i = currentYear; i <= currentYear + 20; i++) {
    yearSelect.append(`<option value="${i}" ${i === currentCalendarDate.getFullYear() ? "selected" : ""}>${i}</option>`);
  }
}

// Validate fields - NO DB
function validateFields() {
  if (!validateFieldByName("name")) return false;
  if (!validateDeadline()) return false;
  if (!validateFieldByName("description")) return false;
  if (!validateFieldByName("status")) return false;
  return true;
}

// Validate specific field - NO DB
function validateFieldByName(fieldName) {
  const value = $.trim($(`#task-${fieldName}`).val());
  if (!value) {
    console.log(`Validation failed: ${fieldName} is required`);
    $(`#task-${fieldName}`).focus();
    $(`#input-error-${fieldName}`).show();
    return false;
  }
  $(`#input-error-${fieldName}`).hide();
  return true;
}

// Validate deadline - NO DB
function validateDeadline() {
  try {
    let selectedDate = new Date(getTaskDate());

    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    if (selectedDate < today) {
      $("#input-error-deadline").text("The selected date cannot be in the past!").show();
      return false;
    }

    $("#input-error-deadline").hide();
    return true;
  } catch (error) {
    $("#input-error-deadline").text("Invalid Date Entered!").show();
    return false;
  }
}

// Display confirmation to delete task - NO DB
function displayConfirmationDelete() {
  $(".crud-buttons").hide();
  $(".confirmation-delete").show();
  $("#button-confirm-no").focus();
}

// Hide Confirmation Modal - NO DB
function hideConfirmationDelete() {
  $(".crud-buttons").show();
  $(".confirmation-delete").hide();
}

// Clear form after closing create/edit sections - NO DB
function clearForm() {
  $("#task-id").val("");
  $("#task-name").val("");
  $("#task-description").val("");
  $("#task-status").val("");
  $("#task-day").val("");
  $("#task-month").val("");
  $("#task-year").val("");

  loadDataSelect();
}

// Reset form fields - NO DB
function resetFormState() {
  clearForm();
  $("#input-error").hide();
  $("#arrow-back").css("visibility", "hidden");
  $(".section-add-edit").hide();
  $(".section-view").hide();
  $(".section-home").show();
}

// Reset validation errors - NO DB
function resetValidationErrors() {
  $(".input-error").hide();
}

// Update the home screen
function updateHomeScreen(tasks) {
  // Ensure tasks is an array
  if (!Array.isArray(tasks)) {
    console.error("Invalid tasks data");
    tasks = [];
  }

  // Filter tasks by type and current month
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const filteredTasks = tasks.filter(task => {
    const taskDate = new Date(task.dueDate);
    return (
      taskDate.getMonth() === currentMonth &&
      taskDate.getFullYear() === currentYear
    );
  });

  const completedTasks = tasks.filter(t => t.status.toLowerCase() === "completed").length;
  const completedTasks30Days = filteredTasks.filter(t => t.status.toLowerCase() === "completed").length;
  const allTasksNum = tasks.length - completedTasks;

  // Update the task counts on the DOM
  $("#task-count-completed").text(`${completedTasks30Days} Tasks`);
  $("#task-count-all").text(`${allTasksNum} Tasks`);
  $("#task-count-low").text(`${tasks.filter(t => t.status.toLowerCase() === "low").length} Tasks`);
  $("#task-count-moderate").text(`${tasks.filter(t => t.status.toLowerCase() === "moderate").length} Tasks`);
  $("#task-count-high").text(`${tasks.filter(t => t.status.toLowerCase() === "high").length} Tasks`);
}

// Display the calendar
function displayCalendar(tasks) {
  const calendar = $("#task-calendar");
  calendar.empty();

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const filteredTasks = tasks.filter((task) => {
    return task.status && task.status.toLowerCase() !== "completed";
  });

  // Add empty cells before the first day
  for (let i = 0; i < firstDay; i++) {
    calendar.append('<div class="calendar-day empty"></div>');
  }

  // Loop through days in the current month
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day);
    const normalizedCurrentDate = currentDate.toISOString().split("T")[0];

    const taskOnDate = filteredTasks.find((task) => {
      const taskDate = new Date(task.dueDate).toISOString().split("T")[0]; // Normalize to YYYY-MM-DD
      return taskDate === normalizedCurrentDate;
    });

    let taskClass = "";
    if (taskOnDate) {
      taskClass = `task-day ${taskOnDate.status.toLowerCase()}-status`;
    }

    // Add day to calendar
    calendar.append(`
      <div class="calendar-day ${taskClass}" data-date="${currentDate.toISOString()}">
        <span>${day}</span>
      </div>
    `);
  }
}

// Display today's tasks list
async function displayTodayTasks(tasks) {
  const taskList = $("#today-task-list");
  taskList.empty();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayTasks = tasks.filter((task) => {
    if (!task.dueDate) return false; // Skip tasks with invalid dates
    const taskDate = new Date(task.dueDate);
    taskDate.setHours(0, 0, 0, 0); // Normalize time
    return taskDate.getTime() === today.getTime() && task.status.toLowerCase() !== "completed";
  });

  if (todayTasks.length === 0) {
    taskList.append("<li>No tasks due today.</li>");
    return;
  }

  todayTasks
    .sort((a, b) => {
      const taskStatusOrder = { high: 1, moderate: 2, low: 3 };
      return (
        (taskStatusOrder[a.status.toLowerCase()] || 4) -
        (taskStatusOrder[b.status.toLowerCase()] || 4)
      );
    })
    .forEach((task) => {
      taskList.append(`
        <li class="task-item task-status-${task.status.toLowerCase()}" data-task-id="${task.taskId}">
          <div class="task-name">${task.title}</div>
          <div class="task-deadline"><strong>Due date:</strong> ${formatDate(task.dueDate)}</div>
          <div class="task-status"><strong>Status:</strong> ${task.status}</div>
          <div class="complete-task" data-task-id="${task.taskId}">
            <p>&#9745;</p>
          </div>
        </li>
      `);
    });

  // Add event listeners for completing tasks
  $(".complete-task").on("click", async function (event) {
    event.stopPropagation();

    const taskId = $(this).data("task-id");
    const task = await GETtaskById(taskId);
    
    if (task) {
      const status = await POSTtaskCompleted(taskId);

      if(status) {
        notify("Task marked as completed!", "success");
      } 
    } else {
      notify("Task could not marked as completed!", "error");
    }

  });
}

// Display the tasks by type list - Expiriment
async function displayTasksByType(type) {
  const tasks = await GETtasksFromDB();
  console.log("Tasks fetched:", tasks); // Debug fetched tasks

  let filteredTasks = [];

  try {
    // Filter tasks by type
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    if(type === "all") {
      filteredTasks = tasks.filter((task) => {
        const taskStatus = task.status ? task.status.toLowerCase() : "";
        return (
          !type || taskStatus !== "completed"
        );
      });
    } else {
      filteredTasks = tasks.filter((task) => {
        const taskStatus = task.status ? task.status.toLowerCase() : "";
        const taskDate = new Date(task.dueDate);
  
        return (
          taskDate.getMonth() === currentMonth &&
          taskDate.getFullYear() === currentYear &&
          (!type || taskStatus === type.toLowerCase())
        );
      });
    }

    console.log("Filtered tasks:", filteredTasks); // Debug filtered tasks

    const taskList = $("#tasks-list");
    taskList.empty();

    if (filteredTasks.length === 0) {
      notify("No tasks found for this category this month", "error");
      return;
    }

    filteredTasks.forEach((task) => {
      const isCompleted = task.status.toLowerCase() === "completed";

      taskList.append(`
        <li class="task-item task-status-${task.status.toLowerCase()}" 
            data-task-id="${task.taskId}" 
            style="${type === "completed" ? "pointer-events: none; opacity: 0.8;" : ""}">
          <div class="task-name">${task.title}</div>
          <div class="task-deadline"><strong>Due date:</strong> ${formatDate(task.dueDate)}</div>
          <div class="task-status"><strong>Status:</strong> ${task.status}</div>
          ${
            isCompleted
              ? ""
              : `
                <div class="complete-task" data-task-id="${task.taskId}">
                  <p>&#9745;</p>
                </div>
              `
          }
        </li>
      `);
    });

    // Attach click events
    $(".complete-task").on("click", async function (event) {
      event.stopPropagation();

      const taskId = $(this).data("task-id");
      const task = await GETtaskById(taskId);
      
      if (task) {
        const status = await POSTtaskCompleted(taskId);
  
        if(status) {
          notify("Task marked as completed!", "success");
         
        } 
      } else {
        notify("Task could not marked as completed!", "error");
      }
    });

    $(".section-home").hide();
    $(".section-view").show();
    $("#arrow-back").css("visibility", "visible");
  } catch (error) {
    console.error("Error in displayTasksByType:", error);
  }
}

function editTaskSection(task) {
  $("#task-id").val(task.taskId);
  $("#task-name").val(task.title);
  $("#task-description").val(decodeURIComponent(task.description));
  $("#task-status").val(task.status);

  const taskDate = new Date(task.dueDate);
  if (isNaN(taskDate)) {
    console.error("Invalid dueDate for task:", task);
    return; // Prevent editing if dueDate is invalid
  }
  $("#task-day").val(taskDate.getDate());
  $("#task-month").val(taskDate.getMonth());
  $("#task-year").val(taskDate.getFullYear());

  enableFormEditMode();
}

// Change the format of the date to dd/mm/yyyy
function formatDate(dateInput) {
  console.log("Formatting date.", { dateInput });

  const date = new Date(dateInput);

  if (isNaN(date)) {
    console.error("Invalid date format:", dateInput);
    return "Invalid Date";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${year}/${month}/${day}`;
}
/* End functions */


/* Start utility functions */
// Get all tasks -> DB 
async function GETtasksFromDB() {
  console.log(headers);
  console.log("Fetching tasks from the database.");

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers,
      mode: "cors",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const responseBody = await response.json();
    console.log("Tasks fetched successfully.", responseBody.data);
    return responseBody.data || [];
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }
}

// Delete a task -> DB
async function DELETEtask(taskId) {
  if (!taskId) return false;

  let body = {
    "taskId" : taskId
  };

  try {
    const response = await fetch(apiUrl, {
      method: "DELETE",
      headers: headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const responseBody = await response.json();
    console.log(responseBody.message); 
    await updateView();
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

// Submit a task -> DB
async function submitTaskDB(action) {
  if (!validateFields()) {
    console.log("Validation failed");
    return false;
  }

  // Resolve the due date value
  const dueDate = await getTaskDate();
  
  if (action === "put") {
    const task = {
      "taskId": $("#task-id").val(),
      "title": $("#task-name").val(),
      "description": encodeURIComponent($("#task-description").val()),
      "status": $("#task-status").val(),
      "dueDate": dueDate
    };

    console.log("Task to update:", task);

    return await PUTtask(task);
  } else if (action === "post") {
    const task = {
      "title": $("#task-name").val(),
      "description": encodeURIComponent($("#task-description").val()),
      "status": $("#task-status").val(),
      "dueDate": dueDate
    };
    console.log("Task to create:", task);

    return POSTnewTask(task);
  } else {
    console.log("Task to create:", action);

    return POSTnewTask(action);
  }
}

// Post a new task -> DB
async function POSTnewTask(task) {
  console.log("Creating new task.", task);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(task),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const responseBody = await response.json();
    console.log("Task created successfully.", responseBody);
    await updateView();
    return true;
  } catch (error) {
    console.error("Error creating task:", error);
    return false;
  }
}

// Put a task -> DB
async function PUTtask(task) {
  console.log("Updating task.", task);

  try {
    const response = await fetch(apiUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify(task),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const responseBody = await response.json();
    console.log("Task updated successfully.", responseBody);
    await updateView();
    return true;
  } catch (error) {
    console.error("Error updating task:", error);
    return false;
  }
}

// get a task by id -> DB
async function GETtaskById(taskId) {
  if (!taskId) return false;

  let body = {
    "taskId" : taskId
  };

  try {
    const response = await fetch(`${apiUrl}/task`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const responseBody = await response.json();
    console.log("Task fetched successfully.", responseBody.data);
    return responseBody.data || [];
  } catch (error) {
    console.log(error);
    return false;
  }
}

// Put completed task task -> DB
async function POSTtaskCompleted(taskId) {
  console.log("Updating task: ", taskId);

  let body = {
    "taskId" : taskId
  };

  try {
    const response = await fetch(
      "https://88s5rw95le.execute-api.us-east-1.amazonaws.com/Prod/tasks/complete", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const responseBody = await response.json();
    console.log("Task updated successfully.", responseBody);
    await updateView();
    return true;
  } catch (error) {
    console.error("Error updating task:", error);
    return false;
  }
}

// Get the date of a task
async function getTaskDate() {
  const day = parseInt($("#task-day").val());
  const month = parseInt($("#task-month").val());
  const year = parseInt($("#task-year").val());

  const date = new Date(year, month, day).toISOString(); // Convert to ISO string
  console.log("Resolved dueDate:", date); // Log the resolved due date
  return date; // Return the ISO string
}

/* Admin */

/* End utility functions */

/* Cognito */ 
window.onload = async () => {
  await checkParameters();
  loginOperate();
};

const loginOperate = () => {
  const loginBtn = document.getElementById("loginBtn");

  loginBtn.addEventListener("click", function (event) {
      event.preventDefault();

      sessionStorage.clear();

      window.location.href = frontPageUrl;
  });
};

const checkParameters = async () => {
  const urlParams = new URLSearchParams(window.location.hash.substring(1));
  if (urlParams.size !== 0) {
      const tokenId = urlParams.get("id_token");
      console.log("Extracted Token ID:", tokenId);

      // Store the token in session storage
      sessionStorage.setItem("tokenId", tokenId);

      // Call the API to check the user's role
      const userData = await checkUserRole(tokenId);

      console.log("User Data Retrieved:", userData);

      if (userData.isAdmin) {
          console.log("Redirecting to Admin Page...");
          window.location.href = adminPageUrl; // Replace with your admin page URL
      } else {
          console.log("Redirecting to Index Page...");
          window.location.href = indexPageURL; // Replace with your regular user page URL
      }
  }
};

// Function to call the API and check the user's role
const checkUserRole = async (tokenId) => {
  console.log("In checkUserRole with token:", tokenId);

  // Define headers with token from session storage
  const headers = {
      "Content-Type": "application/json",
      "Authorization": tokenId,
  };

  try {
      const response = await fetch("https://88s5rw95le.execute-api.us-east-1.amazonaws.com/Prod/user", {
          method: "GET",
          headers: headers, // Use the correct headers object
      });

      if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Raw API Response:", result);

      const userData = result.data;
      console.log("Parsed User Details:", userData);

      // Store user details in session storage for later use
      sessionStorage.setItem("userEmail", userData.email);
      sessionStorage.setItem("userName", userData.name);
      sessionStorage.setItem("isAdmin", userData.isAdmin);

      return userData; // Return user details
  } catch (error) {
      console.error("Error checking user role:", error);
      return null; // Return null in case of an error
  }
};