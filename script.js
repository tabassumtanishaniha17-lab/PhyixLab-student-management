const $ = (id) => document.getElementById(id);

const STUDENTS_KEY = "phyixlab_students_v3";
const EXAMS_KEY = "phyixlab_exams_v3";

let students = loadData(STUDENTS_KEY);
let exams = loadData(EXAMS_KEY);
let activeExamId = null;

function loadData(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveStudents() {
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
}

function saveExams() {
  localStorage.setItem(EXAMS_KEY, JSON.stringify(exams));
}

function makeId() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function formatDate(date) {
  if (!date) return "Date not set";

  const parts = date.split("-");

  if (parts.length !== 3) return date;

  return new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2])
  ).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatMonth(month) {
  if (!month) return "Unknown month";

  const parts = month.split("-");

  if (parts.length !== 2) return month;

  return new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    1
  ).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });
}

function showMessage(id, text, type = "success") {
  const element = $(id);

  element.textContent = text;
  element.className = "message " + type;
}

function getStudentMarks(exam, studentId) {
  const value = exam.marks?.[studentId];

  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function getStudent(studentId) {
  return students.find((student) => student.id === studentId);
}

/* ADD STUDENT */

$("studentForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const name = $("studentName").value.trim();
  const roll = $("studentRoll").value.trim();
  const studentClass = $("studentClass").value.trim();
  const batch = $("studentBatch").value.trim();
  const contact = $("studentContact").value.trim();

  if (!name || !roll || !studentClass || !batch) {
    showMessage(
      "studentMessage",
      "Please fill in all required fields.",
      "error"
    );
    return;
  }

  const duplicate = students.some((student) =>
    student.roll.toLowerCase() === roll.toLowerCase() &&
    student.batch.toLowerCase() === batch.toLowerCase() &&
    student.studentClass.toLowerCase() === studentClass.toLowerCase()
  );

  if (duplicate) {
    showMessage(
      "studentMessage",
      "This roll number already exists in this class and batch.",
      "error"
    );
    return;
  }

  students.push({
    id: makeId(),
    name,
    roll,
    studentClass,
    batch,
    contact,
    createdAt: new Date().toISOString()
  });

  saveStudents();
  $("studentForm").reset();
  renderStudents();

  showMessage(
    "studentMessage",
    "Student added successfully!"
  );
});

/* STUDENT DIRECTORY */

$("searchInput").addEventListener("input", renderStudents);

function renderStudents() {
  const query = $("searchInput").value.trim().toLowerCase();

  const filtered = students.filter((student) => {
    const text = [
      student.name,
      student.roll,
      student.studentClass,
      student.batch,
      student.contact
    ].join(" ").toLowerCase();

    return text.includes(query);
  });

  $("emptyStudents").style.display =
    filtered.length ? "none" : "block";

  $("studentList").innerHTML = filtered.map((student) => `
    <div class="student-item">
      <div class="item-title">${escapeHTML(student.name)}</div>

      <div class="item-meta">
        Roll: ${escapeHTML(student.roll)}
        · Class: ${escapeHTML(student.studentClass)}
        · Batch: ${escapeHTML(student.batch)}
      </div>

      ${student.contact ? `
        <div class="item-meta">
          Contact: ${escapeHTML(student.contact)}
        </div>
      ` : ""}

      <div class="item-actions">
        <button class="secondary-btn small-btn"
          data-action="history"
          data-id="${student.id}">
          View Marks
        </button>

        <button class="danger-btn small-btn"
          data-action="delete-student"
          data-id="${student.id}">
          Delete
        </button>
      </div>
    </div>
  `).join("");
}

$("studentList").addEventListener("click", (event) => {
  const button = event.target.closest("button");

  if (!button) return;

  const studentId = button.dataset.id;

  if (button.dataset.action === "history") {
    openHistory(studentId);
  }

  if (button.dataset.action === "delete-student") {
    deleteStudent(studentId);
  }
});

function deleteStudent(studentId) {
  const student = getStudent(studentId);

  if (!student) return;

  const confirmed = confirm(
    `Delete ${student.name}? Their marks will also be removed.`
  );

  if (!confirmed) return;

  students = students.filter(
    (student) => student.id !== studentId
  );

  exams.forEach((exam) => {
    if (exam.marks) {
      delete exam.marks[studentId];
    }
  });

  saveStudents();
  saveExams();
  renderStudents();
  renderExams();
}

/* CREATE EXAM
   MONTH IS AUTOMATICALLY DETECTED FROM EXAM DATE.
*/

$("examForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const name = $("examName").value.trim();
  const date = $("examDate").value;
  const total = Number($("examTotal").value);
  const pass = Number($("examPass").value);

  if (!name || !date) {
    showMessage(
      "examMessage",
      "Please enter the exam name and date.",
      "error"
    );
    return;
  }

  if (!Number.isFinite(total) || total <= 0) {
    showMessage(
      "examMessage",
      "Total marks must be greater than zero.",
      "error"
    );
    return;
  }

  if (!Number.isFinite(pass) || pass < 0 || pass > total) {
    showMessage(
      "examMessage",
      "Pass marks must be between 0 and total marks.",
      "error"
    );
    return;
  }

  // Automatic month detection from exam date.
  const month = date.slice(0, 7);

  exams.push({
    id: makeId(),
    name,
    date,
    month,
    total,
    pass,
    marks: {}
  });

  saveExams();
  $("examForm").reset();
  renderExams();

  showMessage(
    "examMessage",
    `Exam created! Month detected: ${formatMonth(month)}`
  );
});

/* EXAM DIRECTORY */

function renderExams() {
  const sortedExams = [...exams].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  $("emptyExams").style.display =
    sortedExams.length ? "none" : "block";

  $("examList").innerHTML = sortedExams.map((exam) => {
    const enteredCount = students.filter(
      (student) => getStudentMarks(exam, student.id) !== null
    ).length;

    return `
      <div class="exam-item">
        <div class="exam-heading">
          <div>
            <div class="item-title">
              ${escapeHTML(exam.name)}
            </div>

            <div class="item-meta">
              ${escapeHTML(formatDate(exam.date))}
            </div>

            <div class="item-meta">
              Month: ${escapeHTML(
                formatMonth(exam.month || exam.date.slice(0, 7))
              )}
            </div>
          </div>

          <span class="badge">
            ${enteredCount}/${students.length} marked
          </span>
        </div>

        <div class="item-meta">
          Total: ${exam.total} · Pass: ${exam.pass}
        </div>

        <div class="item-actions">
          <button class="secondary-btn small-btn"
            data-action="enter-marks"
            data-id="${exam.id}">
            Enter Marks
          </button>

          <button class="danger-btn small-btn"
            data-action="delete-exam"
            data-id="${exam.id}">
            Delete Exam
          </button>
        </div>
      </div>
    `;
  }).join("");
}

$("examList").addEventListener("click", (event) => {
  const button = event.target.closest("button");

  if (!button) return;

  const examId = button.dataset.id;

  if (button.dataset.action === "enter-marks") {
    openMarksPanel(examId);
  }

  if (button.dataset.action === "delete-exam") {
    deleteExam(examId);
  }
});

function deleteExam(examId) {
  const exam = exams.find((item) => item.id === examId);

  if (!exam) return;

  if (!confirm(`Delete exam "${exam.name}" and its marks?`)) {
    return;
  }

  exams = exams.filter((item) => item.id !== examId);

  saveExams();
  renderExams();
}

/* ENTER MARKS */

function openMarksPanel(examId) {
  const exam = exams.find((item) => item.id === examId);

  if (!exam) return;

  activeExamId = examId;

  $("selectedExamName").textContent = exam.name;

  $("selectedExamInfo").textContent =
    `${formatDate(exam.date)} · ${formatMonth(
      exam.month || exam.date.slice(0, 7)
    )} · Total ${exam.total} · Pass ${exam.pass}`;

  if (!students.length) {
    $("marksList").innerHTML =
      '<p class="empty">Add students before entering marks.</p>';
  } else {
    $("marksList").innerHTML = [...students]
      .sort((a, b) => a.roll.localeCompare(b.roll, undefined, {
        numeric: true
      }))
      .map((student) => {
        const savedMark = getStudentMarks(exam, student.id);

        return `
          <div class="mark-row">
            <div>
              <div class="mark-student-name">
                ${escapeHTML(student.name)}
              </div>

              <div class="mark-student-meta">
                Roll ${escapeHTML(student.roll)}
                · ${escapeHTML(student.batch)}
              </div>
            </div>

            <input
              type="number"
              min="0"
              max="${exam.total}"
              step="any"
              class="student-mark-input"
              data-student-id="${student.id}"
              value="${savedMark === null ? "" : savedMark}"
              placeholder="Marks"
              aria-label="Marks for ${escapeHTML(student.name)}">
          </div>
        `;
      }).join("");
  }

  $("marksMessage").textContent = "";
  $("marksPanel").classList.remove("hidden");
}

$("saveMarks").addEventListener("click", () => {
  const exam = exams.find((item) => item.id === activeExamId);

  if (!exam) return;

  const inputs = [
    ...$("marksList").querySelectorAll(".student-mark-input")
  ];

  const updatedMarks = { ...exam.marks };

  for (const input of inputs) {
    const value = input.value.trim();
    const studentId = input.dataset.studentId;

    if (value === "") {
      delete updatedMarks[studentId];
      continue;
    }

    const mark = Number(value);

    if (
      !Number.isFinite(mark) ||
      mark < 0 ||
      mark > exam.total
    ) {
      showMessage(
        "marksMessage",
        `Enter marks between 0 and ${exam.total}.`,
        "error"
      );
      input.focus();
      return;
    }

    updatedMarks[studentId] = mark;
  }

  exam.marks = updatedMarks;

  saveExams();
  renderExams();

  showMessage("marksMessage", "Marks saved successfully!");
});

$("closeMarks").addEventListener("click", () => {
  $("marksPanel").classList.add("hidden");
});

$("marksPanel").addEventListener("click", (event) => {
  if (event.target === $("marksPanel")) {
    $("marksPanel").classList.add("hidden");
  }
});

/* COMPLETE STUDENT HISTORY */

function openHistory(studentId) {
  const student = getStudent(studentId);

  if (!student) return;

  $("historyTitle").textContent =
    `${student.name} — Performance History`;

  const completedExams = exams
    .map((exam) => ({
      ...exam,
      studentMark: getStudentMarks(exam, studentId),
      month: exam.month || exam.date.slice(0, 7)
    }))
    .filter((exam) => exam.studentMark !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!completedExams.length) {
    $("historyDetails").innerHTML = `
      <p class="empty">
        No marks have been entered for this student yet.
      </p>
    `;

    $("historyModal").classList.remove("hidden");
    return;
  }

  const overallObtained = completedExams.reduce(
    (sum, exam) => sum + exam.studentMark, 0
  );

  const overallTotal = completedExams.reduce(
    (sum, exam) => sum + exam.total, 0
  );

  const overallPercentage = overallTotal > 0
    ? (overallObtained / overallTotal) * 100
    : 0;

  const passedCount = completedExams.filter(
    (exam) => exam.studentMark >= exam.pass
  ).length;

  // Group exam results automatically by month.
  const grouped = {};

  completedExams.forEach((exam) => {
    if (!grouped[exam.month]) {
      grouped[exam.month] = [];
    }

    grouped[exam.month].push(exam);
  });

  const monthKeys = Object.keys(grouped).sort();

  let html = `
    <p class="muted">
      Roll: ${escapeHTML(student.roll)}
      · Class: ${escapeHTML(student.studentClass)}
      · Batch: ${escapeHTML(student.batch)}
    </p>

    <div class="history-summary">
      <div class="stat">
        <span>Exams Completed</span>
        <strong>${completedExams.length}</strong>
      </div>

      <div class="stat">
        <span>Overall Percentage</span>
        <strong>${overallPercentage.toFixed(1)}%</strong>
      </div>

      <div class="stat">
        <span>Passed Exams</span>
        <strong>${passedCount}/${completedExams.length}</strong>
      </div>

      <div class="stat">
        <span>Total Marks</span>
        <strong>
          ${overallObtained.toFixed(2).replace(/\.00$/, "")}
          /
          ${overallTotal.toFixed(2).replace(/\.00$/, "")}
        </strong>
      </div>
    </div>
  `;

  monthKeys.reverse().forEach((month) => {
    const monthExams = grouped[month];

    const monthObtained = monthExams.reduce(
      (sum, exam) => sum + exam.studentMark, 0
    );

    const monthTotal = monthExams.reduce(
      (sum, exam) => sum + exam.total, 0
    );

    const monthPercentage = monthTotal > 0
      ? (monthObtained / monthTotal) * 100
      : 0;

    html += `
      <section class="month-section">
        <h3>${escapeHTML(formatMonth(month))}</h3>
    `;

    monthExams.forEach((exam) => {
      const percentage = (exam.studentMark / exam.total) * 100;
      const passed = exam.studentMark >= exam.pass;

      html += `
        <div class="history-exam">
          <div class="history-exam-top">
            <div>
              <strong>${escapeHTML(exam.name)}</strong>

              <div class="item-meta">
                ${escapeHTML(formatDate(exam.date))}
              </div>
            </div>

            <span class="result ${passed ? "pass" : "fail"}">
              ${passed ? "PASS" : "FAIL"}
            </span>
          </div>

          <div class="item-meta">
            Marks:
            ${exam.studentMark}/${exam.total}
            · ${percentage.toFixed(1)}%
            · Pass mark: ${exam.pass}
          </div>
        </div>
      `;
    });

    html += `
        <div class="history-month-summary">
          <strong>Monthly Summary</strong><br>
          Exams: ${monthExams.length}<br>
          Total marks:
          ${monthObtained.toFixed(2).replace(/\.00$/, "")}
          /
          ${monthTotal.toFixed(2).replace(/\.00$/, "")}<br>
          Monthly percentage: ${monthPercentage.toFixed(1)}%
        </div>
      </section>
    `;
  });

  $("historyDetails").innerHTML = html;
  $("historyModal").classList.remove("hidden");
}

$("closeHistory").addEventListener("click", () => {
  $("historyModal").classList.add("hidden");
});

$("historyModal").addEventListener("click", (event) => {
  if (event.target === $("historyModal")) {
    $("historyModal").classList.add("hidden");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    $("marksPanel").classList.add("hidden");
    $("historyModal").classList.add("hidden");
  }
});

/* INITIALIZE APP */

renderStudents();
renderExams();