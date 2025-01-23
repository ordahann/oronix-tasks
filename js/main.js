/* Start global variables decleration */
let currentCalendarDate = new Date();
/* End global variables decleration */


/* Start document Ready */
$(document).ready(function () {
  // Initialize the display
  updateView();
  console.log("View updated!");
  
  // Event Handlers
  registerEventHandlers();
  console.log("Register the event handlers!");

  // Update day options when year or month changes in Add/Edit form
  $("#task-year, #task-month").on("change", function () {
    console.log("Updating deadline's selectors...");

    let selectedYear = parseInt($("#task-year").val());
    let selectedMonth = parseInt($("#task-month").val());
    let currentDay = new Date().getDate();

    if (!isNaN(selectedYear) && !isNaN(selectedMonth)) {
      loadDayOptions(currentDay, selectedMonth, selectedYear);
    }
  });

  // Close modal on outside click
  $(document).on("click", function (e) {
    console.log("Closing the modal...");

    if (!$(e.target).closest(".task-modal").length && !$(e.target).hasClass("calendar-day")) {
      $(".task-modal").remove();
    }
  });

  // Calendar day click
  $(document).on("click", ".calendar-day:not(.empty)", function () {
    console.log("Calendar day clicked...");

    const $element = $(this);
    const selectedDate = new Date($element.data("date"));

    console.log(selectedDate);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
  
    if (selectedDate < today) {
      notify("Cannot add/edit tasks for past dates!", "error");
      return;
    }
  
    const tasksOnDate = getTasks().filter((task) => {
      const taskStatus = task.taskStatus ? task.taskStatus.toLowerCase() : "";
      const taskDate = new Date(task.deadline);
      return (
        taskDate.toDateString() === selectedDate.toDateString() &&
        taskStatus !== "completed" 
      );
    });
    
  
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
          <div class="modal-task-item" data-task-id="${task.id}">
            <p>
              <strong>${task.name}</strong>
              (${task.taskStatus})
            </p>
          </div>
        `);
      });
    } else {
      modal.append("<p>No tasks due to this date.</p>");
    }
  
    modal.append(`
      <button class="add-task">Add Task</button>
    `);
  
    $("body").append(modal);
  
    // Automatically fill and select the date in the form
    $(".add-task").on("click", function () {
      clearForm();

      $("#task-day").val(selectedDate.getDate());
      console.log("The day: " + selectedDate.getDate());
      
      $("#task-month").val(selectedDate.getMonth());
      console.log("The month: " + selectedDate.getMonth());

      $("#task-year").val(selectedDate.getFullYear());
      console.log("The year: " + selectedDate.getDate());
  
      enableFormEditMode();

      modal.remove();
    });
  
    $(".modal-task-item").on("click", function () {
      const taskId = $(this).data("task-id");
      const task = getTaskById(taskId);
      if (task) {
        editTask(task);
        modal.remove();
      }
    });
  });
});
/* End document ready */

/* Start event handlers */
function registerEventHandlers() {
  // Add task button
  $("#button-add").on("click", () => {
    resetFormState();
    enableFormCreateMode();
  });

  // Arrow back button 
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

  // Calendar navigation buttons
  $("#prev-month").on("click", () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    displayCalendar();
    populateMonthYearSelectors();
  });
  $("#next-month").on("click", () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    displayCalendar();
    populateMonthYearSelectors();
  });
  $("#select-month, #select-year").on("change", function () {
    const month = parseInt($("#select-month").val());
    const year = parseInt($("#select-year").val());
    currentCalendarDate.setMonth(month);
    currentCalendarDate.setFullYear(year);
    displayCalendar();
  });

  // Type list task click
  $("#tasks-list").on("click", ".task-item", function () {
    const taskId = $(this).data("task-id");
    const task = getTaskById(taskId);
    if (task) editTask(task);
  });

  // Today list task click
  $("#today-task-list").on("click", ".task-item", function () {
    const taskId = $(this).data("task-id");
    const task = getTaskById(taskId);
    if (task) editTask(task);
  });

  // Display Task Types
  $(".task-type").on("click", function () {
    const type = $(this).data("type");
    displayTasksByType(type);
  });

  // CRUD Buttons
  // Save changes button
  $("#button-save").on("click", function (event) {
    event.preventDefault();
    if (submitTask()) {
      resetFormState();
      displayHomeScreen();
      
      const taskId = $("#task-id").val();

      if(taskId) {
        notify("Task updated successfully!", "success");
      } else {
        notify("Task created successfully!", "success");
      }    
    }
  });
  // Create task button
  $("#button-create").on("click", function (event) {
    event.preventDefault();
    if (submitTask()) {
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
  $("#button-confirm-yes").on("click", function (event) {
    event.preventDefault();
    hideConfirmationDelete();
    deleteCurrentTask();
    resetFormState();
    resetValidationErrors();
    updateView();
  });
  // Unconfirm delete
  $("#button-confirm-no").on("click", function (event) {
    event.preventDefault();
    hideConfirmationDelete();
  });
}
/* End event handlers */


/* Start functions */
// Notifications
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
function updateView() {
  console.log("Updating view...");
  updateHomeScreen(); 
  displayCalendar(); 
  displayTodayTasks(); 
  loadDataSelect();
  populateMonthYearSelectors();
}

// Display home screen
function displayHomeScreen() {
  $(".navbar").show();
  $(".section-add-edit").hide();
  $(".section-view").hide();
  $(".section-home").show();
  $("#arrow-back").css("visibility", "hidden");
}

// Create/Edit mode
// Edit task mode
function enableFormEditMode() {
  resetValidationErrors();
  $("#arrow-back").css("visibility", "visible");
  $(".section-home").hide();
  $(".section-view").hide();
  $(".section-add-edit").show();
  $(".form-create-mode").hide();
  $(".form-edit-mode").show();
}
// Create task mode
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

// Load the dates data
function loadDataSelect() {
  let today = new Date();
  let currentDay = today.getDate();
  let currentMonth = today.getMonth();
  let currentYear = today.getFullYear();

  loadYearOptions(currentYear);
  loadMonthOptions(currentMonth, currentYear);
  loadDayOptions(currentDay, currentMonth, currentYear);
}

// Load year options
function loadYearOptions(currentYear) {
  $("#task-year").empty();
  for (let i = currentYear; i <= currentYear + 20; i++) {
    $("#task-year").append(`<option value="${i}" ${currentYear === i ? "selected" : ""}>${i}</option>`);
  }
}

// Load month options
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

// Load day options
function loadDayOptions(currentDay, selectedMonth, selectedYear) {
  $("#task-day").empty();
  let daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    $("#task-day").append(`<option value="${i}" ${currentDay === i ? "selected" : ""}>${i}</option>`);
  }
}

// Load year options
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

// Validate fields
function validateFields() {
  if (!validateFieldByName("name")) return false;
  if (!validateDeadline()) return false;
  if (!validateFieldByName("description")) return false;
  if (!validateFieldByName("status")) return false;
  return true;
}

// Validate specific field
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

// Validate deadline
function validateDeadline() {
  try {
    let selectedDate = new Date(getTaskDate());
    console.log("Selected Date:", selectedDate);

    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    console.log("Today:", today);

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

// Display confirmation to delete task
function displayConfirmationDelete() {
  $(".crud-buttons").hide();
  $(".confirmation-delete").show();
  $("#button-confirm-no").focus();
}

// Hide Confirmation Modal
function hideConfirmationDelete() {
  $(".crud-buttons").show();
  $(".confirmation-delete").hide();
}

// Clear form after closing create/edit sections
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

// Reset form fields
function resetFormState() {
  clearForm();
  $("#input-error").hide();
  $("#arrow-back").css("visibility", "hidden");
  $(".section-add-edit").hide();
  $(".section-view").hide();
  $(".section-home").show();
}

// Reset validation errors
function resetValidationErrors() {
  $(".input-error").hide(); // Hide all error messages
}

// Update the home screen
function updateHomeScreen() {
  // Filter tasks by type and current month
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  let tasks = getTasks();

  const filteredTasks = tasks.filter(task => {
    const taskDate = new Date(task.deadline);
    return (
      taskDate.getMonth() === currentMonth &&
      taskDate.getFullYear() === currentYear
    );
  });

  let completedTasks = tasks.filter((t) => t.taskStatus.toLowerCase() === "completed").length;
  let completedTasks30Days = filteredTasks.filter((t) => t.taskStatus.toLowerCase() === "completed").length;

  let allTasksNum = tasks.length - completedTasks;
  
  $("#task-count-completed").text(`${completedTasks30Days} Tasks`);
  $("#task-count-all").text(`${allTasksNum} Tasks`);
  $("#task-count-low").text(`${tasks.filter((t) => t.taskStatus.toLowerCase() === "low").length} Tasks`);
  $("#task-count-moderate").text(`${tasks.filter((t) => t.taskStatus.toLowerCase() === "moderate").length} Tasks`);
  $("#task-count-high").text(`${tasks.filter((t) => t.taskStatus.toLowerCase() === "high").length} Tasks`);
}

// Display the calendar
function displayCalendar() {
  const calendar = $("#task-calendar");
  calendar.empty();

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const tasks = getTasks().filter(task => {
    const taskStatus = task.taskStatus ? task.taskStatus.toLowerCase() : "";
    return taskStatus !== "completed";
  });
  

  for (let i = 0; i < firstDay; i++) {
    calendar.append('<div class="calendar-day empty"></div>');
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day);
    const dateString = currentDate.toISOString().split("T")[0];
    const taskOnDate = tasks.find((task) => task.deadline.startsWith(dateString));

    let taskClass = "";
    if (taskOnDate) {
      taskClass = `task-day ${taskOnDate.taskStatus.toLowerCase()}-status`;
    }

    calendar.append(`
      <div class="calendar-day ${taskClass}" data-date="${currentDate.toISOString()}">
        <span>${day}</span>
      </div>
    `);
  }
}

// Display today's tasks list
function displayTodayTasks() {
  const taskList = $("#today-task-list");
  taskList.empty();

  const today = new Date(); 
  today.setHours(0, 0, 0, 0); 

  const todayTasks = getTasks().filter((task) => {
    const taskDate = new Date(task.deadline); 
    taskDate.setHours(0, 0, 0, 0); 
    return taskDate.getTime() === today.getTime() && task.taskStatus.toLowerCase() !== "completed";
  });

  if (todayTasks.length === 0) {
    taskList.append("<li>No tasks due today.</li>");
    return;
  }

  todayTasks
    .sort((a, b) => {
      const taskStatusOrder = { High: 1, Moderate: 2, Low: 3 };
      return taskStatusOrder[a.taskStatus] - taskStatusOrder[b.taskStatus];
    })
    .forEach((task) => {
      taskList.append(`
        <li class="task-item task-status-${task.taskStatus.toLowerCase()}" data-task-id="${task.id}">
          <div class="task-name">${task.name}</div>
          <div class="task-deadline"><strong>Deadline:</strong> ${formatDate(task.deadline)}</div>
          <div class="task-status"><strong>Status:</strong> ${task.taskStatus}</div>
          <div class="complete-task" data-task-id="${task.id}">
            <p>
              &#9745;
            </p>
          </div>
        </li>
      `);
    });

    // Event handlers for complete and delete buttons
    $(".complete-task").on("click", function (event) {
      event.stopPropagation(); 

      const taskId = $(this).data("task-id");
      
      let task = getTaskById(taskId);
      task.taskStatus = "completed";
  
      let tasks = getTasks();
      console.log("Current tasks: " + tasks);
      
      if (taskId) {
        tasks = tasks.map((t) => (t.id === task.id ? task : t));
        notify("Task marked as completed!", "success");
      } else {
        //tasks.push(task);
        notify("Could no mark task as completed!", "error");
      }
    
      localStorage.setItem("tasks", JSON.stringify(tasks)); 
      
      console.log("Updated tasks list: " + tasks);
  
      updateView(); 
    });
}

// Display the tasks by type list - Expiriment
function displayTasksByType(type) {
  console.log("In displaytaskByType(type) function...")
  console.log(type);

  const tasks = getTasks();
  // Filter tasks by type and current month
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const filteredTasks = tasks.filter(task => {
    const taskStatus = task.taskStatus ? task.taskStatus.toLowerCase() : "";
    const taskDate = new Date(task.deadline);
    return (
      (type === "completed"
        ? taskStatus === "completed" // Include only completed tasks
        : type === "all"
        ? taskStatus !== "completed" // Exclude completed tasks in "all"
        : taskStatus === type.toLowerCase()) &&
      taskDate.getMonth() === currentMonth &&
      taskDate.getFullYear() === currentYear
    );
  });

  console.log(filteredTasks.length);

  const taskList = $("#tasks-list");
  taskList.empty();

  if (filteredTasks.length === 0) {
    notify("No tasks found for this category due to this month", "error");
    return;
  }
  
  filteredTasks.forEach(task => {
    const isCompleted = task.taskStatus.toLowerCase() === "completed";

    taskList.append(`
      <li class="task-item task-status-${task.taskStatus.toLowerCase()}" data-task-id="${task.id}" style="${type === "completed" ? "pointer-events: none; opacity: 0.8;" : ""}">
        <div class="task-name">${task.name}</div>
        <div class="task-deadline"><strong>Deadline:</strong> ${formatDate(task.deadline)}</div>
        <div class="task-status"><strong>Status:</strong> ${task.taskStatus}</div>
        ${
          isCompleted
            ? "" 
            : `
              <div class="complete-task" data-task-id="${task.id}">
                <p>
                    &#9745;
                </p>
              </div>
            `
        }
      </li>
    `);
  });

  // Event handlers for complete
  if (type.toLowerCase() !== "completed") {
    $(".complete-task").on("click", function (event) {
      event.stopPropagation(); 

      const taskId = $(this).data("task-id");
      
      let task = getTaskById(taskId);
      task.taskStatus = "completed";

      let tasks = getTasks();
      console.log("Current tasks: " + tasks);
      
      if (taskId) {
        tasks = tasks.map((t) => (t.id === task.id ? task : t));
        notify("Task marked as completed!", "success");
      } else {
        //tasks.push(task);
        notify("Could no mark task as completed!", "error");
      }
    
      localStorage.setItem("tasks", JSON.stringify(tasks)); 
      
      console.log("Updated tasks list: " + tasks);

      updateView(); 
      displayTasksByType(type);
    });
  }

  $(".section-home").hide();
  $(".section-view").show();
  $("#arrow-back").css("visibility", "visible");
}

// Edit task (from todays tasks list/calendar/tasks by type list)
function editTask(task) {
  console.log("In editTask(task) function...")

  $("#task-id").val(task.id);
  $("#task-name").val(task.name);
  $("#task-description").val(decodeURIComponent(task.description));
  $("#task-status").val(task.taskStatus);

  const taskDate = new Date(task.deadline);
  $("#task-day").val(taskDate.getDate());
  $("#task-month").val(taskDate.getMonth());
  $("#task-year").val(taskDate.getFullYear());

  console.log("Opening the edit a task section...")
  enableFormEditMode();
}

// Check if a course to delete exists
function deleteCurrentTask() {
  console.log("In deleteCurrentTask() function...");

  const taskId = $("#task-id").val();
  if (!taskId) return;
  deleteTask(taskId);
}

// Change the format of the date to dd/mm/yyyy
function formatDate(date) {
  console.log("In formatDate(date) function...");
  console.log("The date to format is: " + date);

  const d = new Date(date);
  if (isNaN(d)) {
    console.error("Invalid date format:", date);
    return "Invalid Date";
  }

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  let formatedDate = `${day}/${month}/${year}`;
  
  console.log("The formated date is: " + formatedDate)

  return formatedDate;
}
/* End functions */


/* Start utility functions */
// Get all tasks
function getTasks() {
  console.log("In getTasks() function...");

  return JSON.parse(localStorage.getItem("tasks")) || [];
}

// Get task by id
function getTaskById(taskId) {
  console.log("In getTaskById(taskId) function...");

  const tasks = getTasks();
  return tasks.find((task) => task.id === taskId);
}

// Delete a task
function deleteTask(taskId) {
  console.log("In deleteTasks() function...");

  const tasks = getTasks().filter((task) => task.id !== parseInt(taskId));
  localStorage.setItem("tasks", JSON.stringify(tasks));

  notify("Task deleted successfully!", "success");

  updateView();
}

// Submit a task
function submitTask() {
  console.log("In submitTask() function...");

  console.log("Validating fields...");
  if (!validateFields()) {
    console.log("Validation failed");
    return false;
  }

  const taskId = $("#task-id").val();
  
  const task = {
    id: taskId ? parseInt(taskId) : getNewTaskId(),
    name: $("#task-name").val(),
    description: encodeURIComponent($("#task-description").val()),
    taskStatus: $("#task-status").val(),
    deadline: getTaskDate()
  };

  console.log("The new/updated task:" + JSON.stringify(task));

  let tasks = getTasks();
  console.log("Current tasks: " + JSON.stringify(tasks));

  if (taskId) {
    tasks = tasks.map((t) => (t.id === task.id ? task : t));
  } else {
    tasks.push(task);
  }

  localStorage.setItem("tasks", JSON.stringify(tasks)); 
  
  console.log("Updated tasks list: " + tasks);
  
  updateView(); 
  return true;
}

// Get the next task id
function getNewTaskId() {
  const tasks = getTasks(); 
  if (!tasks.length) {
    return 1;
  }
  const lastTaskId = Math.max(...tasks.map((task) => task.id));
  return lastTaskId + 1;
}

// Get the date of a task
function getTaskDate() {
  let day = parseInt($("#task-day").val());
  let month = parseInt($("#task-month").val());
  let year = parseInt($("#task-year").val());

  return new Date(year, month, day).toISOString();
}
/* End utility functions */