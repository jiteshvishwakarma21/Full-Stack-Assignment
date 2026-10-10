"use strict";

// Change these constants to match your college's marking rules.
const SUBJECTS = ["HTML5", "CSS3", "JavaScript", "Database Management", "Computer Networks"];
const PASS_MARK = 40;
const MAX_MARK = 100;
const STORAGE_KEY = "student-result-system-v1";
const form = document.querySelector("#student-form");
const message = document.querySelector("#message");
let students = [];

// textContent safely displays student input without interpreting it as HTML.
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function notify(text, error = false) {
  message.textContent = text;
  message.className = error ? "error" : "";
}
function calculateResult(marks) {
  const total = marks.reduce((sum, mark) => sum + mark, 0);
  return { total, percentage: Number((total / (SUBJECTS.length * MAX_MARK) * 100).toFixed(2)), status: marks.every(mark => mark >= PASS_MARK) ? "Pass" : "Fail" };
}
SUBJECTS.forEach((subject, index) => {
  const label = element("label", subject);
  const input = document.createElement("input");
  Object.assign(input, { type: "number", name: `mark${index}`, min: "0", max: String(MAX_MARK), step: "1", required: true, placeholder: "0–100" });
  label.append(input);
  document.querySelector("#marks-fields").append(label);
});

function validStoredStudent(student) {
  return student && typeof student.name === "string" && typeof student.roll === "string" && typeof student.email === "string" && typeof student.course === "string" && Array.isArray(student.marks) && student.marks.length === SUBJECTS.length && student.marks.every(mark => Number.isInteger(mark) && mark >= 0 && mark <= MAX_MARK);
}
try {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  if (!Array.isArray(stored) || !stored.every(validStoredStudent)) throw new Error("Invalid records");
  students = stored.map(student => ({ ...student, ...calculateResult(student.marks) }));
} catch {
  notify("Saved records could not be loaded. Export or back up any existing data before saving new records.", true);
}

function showResult(student) {
  const result = document.querySelector("#result");
  result.replaceChildren();
  result.append(element("h3", student.name, "result-name"), element("p", `${student.roll} · ${student.course}`, "meta"), element("p", student.email, "meta"), element("span", student.status.toUpperCase(), `badge ${student.status === "Fail" ? "fail" : ""}`));
  const metrics = element("div", undefined, "metrics");
  [[`${student.total} / ${SUBJECTS.length * MAX_MARK}`, "Total marks"], [`${student.percentage.toFixed(2)}%`, "Percentage"]].forEach(([value, label]) => {
    const metric = element("div", undefined, "metric");
    metric.append(element("strong", value), element("span", label));
    metrics.append(metric);
  });
  result.append(metrics);
  SUBJECTS.forEach((subject, index) => {
    const row = element("div", undefined, "subject-row");
    row.append(element("span", subject), element("strong", `${student.marks[index]} / ${MAX_MARK}`, student.marks[index] < PASS_MARK ? "low" : ""));
    result.append(row);
  });
  result.append(element("p", student.status === "Pass" ? "Passed all subjects. Well done!" : "Below 40 marks in one or more subjects.", "hint"));
}

function persist(nextStudents) {
  try {
    // Convert the array of student objects to JSON before storing it.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStudents));
    students = nextStudents;
    renderRecords();
    return true;
  } catch {
    notify("Could not save changes. Browser storage may be disabled or full. Your existing records have been kept.", true);
    return false;
  }
}
function renderRecords() {
  const body = document.querySelector("#records-body");
  body.replaceChildren();
  const query = document.querySelector("#search").value.trim().toLowerCase();
  const visible = students.filter(student => `${student.name} ${student.roll}`.toLowerCase().includes(query));
  document.querySelector("#count").textContent = students.length;
  document.querySelector("#export").disabled = students.length === 0;
  const empty = document.querySelector("#records-empty");
  empty.hidden = visible.length > 0;
  empty.textContent = students.length ? "No records match your search." : "No records yet. Save your first student result above.";
  visible.forEach(student => {
    const row = element("tr");
    [student.name, student.roll, student.course, `${student.total} / ${SUBJECTS.length * MAX_MARK}`, `${student.percentage.toFixed(2)}%`].forEach(value => row.append(element("td", value)));
    const status = element("td");
    status.append(element("span", student.status, `badge ${student.status === "Fail" ? "fail" : ""}`));
    const actions = element("td");
    const view = element("button", "View", "secondary");
    view.setAttribute("aria-label", `View result for ${student.name}`);
    view.addEventListener("click", () => { showResult(student); document.querySelector("#result-title").scrollIntoView({ behavior: "smooth", block: "center" }); });
    const remove = element("button", "Delete", "delete");
    remove.setAttribute("aria-label", `Delete record for ${student.name}`);
    remove.addEventListener("click", () => {
      if (confirm(`Delete the saved record for ${student.name} (${student.roll})?`)) {
        if (persist(students.filter(item => item.roll !== student.roll))) {
          document.querySelector("#result").replaceChildren(element("p", "Select a saved record or calculate a new result.", "hint"));
          notify("Student record deleted.");
        }
      }
    });
    actions.append(view, remove);
    row.append(status, actions);
    body.append(row);
  });
}
form.addEventListener("submit", event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const name = data.get("name").trim();
  const roll = data.get("roll").trim().toUpperCase();
  const email = data.get("email").trim();
  const marks = SUBJECTS.map((_, index) => Number(data.get(`mark${index}`)));
  if (!name || !roll || !email || marks.some(mark => !Number.isInteger(mark) || mark < 0 || mark > MAX_MARK)) {
    notify("Enter student details and whole-number marks between 0 and 100.", true);
    return;
  }
  if (students.some(student => student.roll.toUpperCase() === roll)) {
    notify("This roll number is already registered. Delete its saved record before registering it again.", true);
    return;
  }
  const student = { name, roll, email, course: data.get("course"), subjects: SUBJECTS, marks, ...calculateResult(marks) };
  showResult(student);
  if (persist([...students, student])) notify(`Result calculated and saved for ${name}.`);
});
form.addEventListener("reset", () => { notify(""); });
document.querySelector("#search").addEventListener("input", renderRecords);
document.querySelector("#export").addEventListener("click", () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(students, null, 2)], { type: "application/json" }));
  const link = element("a");
  link.href = url;
  link.download = "student-results.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
renderRecords();
