const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
let locale = "ko";
let focusTimer;
let focusSeconds = 0;
let guestFocusedSeconds = 4800;
let guestSessionCount = 2;
let menuContext = "task";
let activeMenuTrigger = null;
let selectedScheduleDay = 29;
let activeTaskScheduleTrigger = null;
let taskScheduleMode = "none";
let selectedTaskScheduleDays = [];
let taskRepeatMode = "none";
function flowStateCopy(total, completed) {
  if (!total) return { percent:0, percentLabel:"—", ko:"오늘은 예정된 작업이 없어요", en:"No tasks are scheduled for today", emoji:"🌙" };
  const percent = Math.round(completed / total * 100);
  if (percent === 0) return { percent, percentLabel:"0%", ko:"아직 시작 전이에요", en:"Not started yet", emoji:"🌧️" };
  if (percent < 40) return { percent, percentLabel:`${percent}%`, ko:"천천히 흐름을 만들고 있어요", en:"Building momentum slowly", emoji:"☁️" };
  if (percent < 70) return { percent, percentLabel:`${percent}%`, ko:"좋은 흐름을 이어가고 있어요", en:"Keeping up a good flow", emoji:"🌥️" };
  if (percent < 100) return { percent, percentLabel:`${percent}%`, ko:"거의 다 왔어요", en:"Almost there", emoji:"🌤️" };
  return { percent, percentLabel:"100%", ko:"오늘의 작업을 모두 마쳤어요", en:"All of today's tasks are complete", emoji:"☀️" };
}
function updateTodayFlow(total, completed) {
  const state = flowStateCopy(total, completed);
  $(".day-summary>div span").textContent = locale === "ko"
    ? (total?`${total}개 중 ${completed}개 완료 · ${state.ko} ${state.emoji}`:`${state.ko} ${state.emoji}`)
    : (total?`${completed} of ${total} complete · ${state.en} ${state.emoji}`:`${state.en} ${state.emoji}`);
  $(".day-summary .progress i").style.width = `${state.percent}%`;
  $(".flow-percent").textContent = state.percentLabel;
}
function updateGuestFocusSummary() {
  const totalMinutes = Math.floor(guestFocusedSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  $(".guest-focus-total").textContent = locale === "ko"
    ? [hours ? `${hours}시간` : "", minutes ? `${minutes}분` : ""].filter(Boolean).join(" ")
    : [hours ? `${hours}h` : "", minutes ? `${minutes}m` : ""].filter(Boolean).join(" ");
  $(".guest-focus-count").textContent = locale === "ko" ? `${guestSessionCount}회` : `${guestSessionCount}`;
}
function updateGuestScheduleLabels() {
  if (!$("#app").classList.contains("guest-mode")) return;
  const tasks = $$(".schedule-tasks>.task-row");
  const completed = tasks.filter(item => item.classList.contains("is-complete")).length;
  $(".schedule-tasks").previousElementSibling.querySelector("span").textContent = tasks.length;
  updateTodayFlow(tasks.length, completed);
}
function restoreMemberScheduleLabels() {
  $(".schedule-tasks").previousElementSibling.querySelector("span").textContent = "5";
  updateTodayFlow($$(".schedule-tasks>.task-row").length,$$(".schedule-tasks>.task-row.is-complete").length);
}
function showFocusToast(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const duration = locale === "ko"
    ? [minutes ? `${minutes}분` : "", remainingSeconds || !minutes ? `${remainingSeconds}초` : ""].filter(Boolean).join(" ")
    : [minutes ? `${minutes}m` : "", remainingSeconds || !minutes ? `${remainingSeconds}s` : ""].filter(Boolean).join(" ");
  const toast = document.createElement("div");
  toast.className = "focus-toast";
  toast.setAttribute("role", "status");
  toast.innerHTML = '<span><svg><use href="#i-check"></use></svg></span><div><strong></strong><small></small></div>';
  $("strong", toast).textContent = locale === "ko" ? "집중 시간이 기록됐어요" : "Focus time recorded";
  $("small", toast).textContent = locale === "ko"
    ? `오늘 집중 기록에 ${duration}${duration.endsWith("분") ? "을" : "를"} 추가했어요.`
    : `Added ${duration} to today's focus record.`;
  $("#focusToastStack").appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => toast.remove(), 180);
  }, 3500);
}

function calendarMarkup(target) {
  const weekdays = locale === "ko" ? ["일","월","화","수","목","금","토"] : ["S","M","T","W","T","F","S"];
  target.innerHTML = weekdays.map(day => `<span>${day}</span>`).join("") +
    Array.from({ length: 35 }, (_, index) => {
      const day = index - 2;
      if (day < 1 || day > 31) return "<i></i>";
      const showRecorded = target.id !== "taskScheduleCalendar" && [3,8,12,18,24,29,30].includes(day);
      const classes = [day === 29 ? "is-today" : "", showRecorded ? "is-recorded" : "", target.id === "scheduleCalendar" && day === selectedScheduleDay ? "is-selected" : ""].filter(Boolean).join(" ");
      return `<button class="${classes}" data-calendar-day="${day}">${day}</button>`;
    }).join("");
}
function selectScheduleDay(day) {
  selectedScheduleDay = Number(day);
  const isToday = selectedScheduleDay === 29;
  const schedulePage = $('[data-page="schedule"]');
  const date = new Date(2026, 6, selectedScheduleDay);
  const weekdaysKo = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
  const weekdaysEn = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
  $(".eyebrow", schedulePage).textContent = `2026. 7. ${selectedScheduleDay} ${locale === "ko" ? weekdaysKo[date.getDay()] : weekdaysEn[date.getDay()]}`;
  $("h1", schedulePage).textContent = isToday
    ? (locale === "ko" ? "오늘의 일정" : "Today's schedule")
    : (locale === "ko" ? `7월 ${selectedScheduleDay}일 일정` : `Schedule for July ${selectedScheduleDay}`);
  $(".calendar-today-button", schedulePage).hidden = isToday;
  const visibleRows = [];
  $$(".schedule-tasks>.task-row").forEach(row => {
    const days = (row.dataset.scheduleDays || "29").split(",").map(Number);
    row.hidden = !days.includes(selectedScheduleDay);
    const focusTrigger = $(".start-focus", row);
    const playTrigger = $(".focus-arrow", row);
    if (focusTrigger) focusTrigger.disabled = !isToday || row.classList.contains("is-complete");
    if (playTrigger) playTrigger.disabled = !isToday || !focusTrigger || row.classList.contains("is-complete");
    if (!row.hidden) visibleRows.push(row);
  });
  const completed = visibleRows.filter(row => row.classList.contains("is-complete")).length;
  const isPast = selectedScheduleDay < 29;
  $(".day-summary").hidden = !isToday;
  $(".page-head p", schedulePage).textContent = isToday
    ? (locale === "ko" ? "작업을 누르면 집중을 시작해요." : "Select a task to start focusing.")
    : isPast
      ? (locale === "ko"
        ? `${visibleRows.length}개 중 ${completed}개 완료 · ${visibleRows.length ? Math.round(completed / visibleRows.length * 100) : 0}%`
        : `${completed} of ${visibleRows.length} complete · ${visibleRows.length ? Math.round(completed / visibleRows.length * 100) : 0}%`)
      : (locale === "ko" ? `예정 작업 ${visibleRows.length}개` : `${visibleRows.length} scheduled ${visibleRows.length === 1 ? "task" : "tasks"}`);
  $(".day-summary strong").textContent = locale === "ko" ? "오늘의 흐름" : "Today's flow";
  updateTodayFlow(visibleRows.length, completed);
  $(".schedule-tasks").previousElementSibling.querySelector("span").textContent = visibleRows.length;
  $(".schedule-empty").hidden = visibleRows.length > 0;
  $$("[data-calendar-day]", $("#scheduleCalendar")).forEach(button => button.classList.toggle("is-selected", Number(button.dataset.calendarDay) === selectedScheduleDay));
}
function bindScheduleCalendar() {
  $$("[data-calendar-day]", $("#scheduleCalendar")).forEach(button => button.addEventListener("click", () => selectScheduleDay(button.dataset.calendarDay)));
}
calendarMarkup($("#scheduleCalendar"));
calendarMarkup($("#taskScheduleCalendar"));
bindScheduleCalendar();
bindTaskScheduleCalendar();
selectScheduleDay(selectedScheduleDay);

const chartData = [
  { minutes:70, height:58, parts:[["sky",28],["mint",18],["gray",12]] },
  { minutes:45, height:38, parts:[["lilac",18],["peach",20]] },
  { minutes:150, height:100, parts:[["sky",55],["mint",27],["peach",18]] },
  { minutes:60, height:50, parts:[["mint",20],["sky",30]] },
  { minutes:95, height:70, parts:[["lilac",30],["sky",25],["gray",15]] },
  { minutes:25, height:24, parts:[["peach",24]] },
  { minutes:0, height:0, parts:[] }
];
function formatMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (locale === "ko") return [hours ? `${hours}시간` : "", rest ? `${rest}분` : ""].filter(Boolean).join(" ");
  return [hours ? `${hours}h` : "", rest ? `${rest}m` : ""].filter(Boolean).join(" ");
}
function localizeLooseUnits() {
  $$("span,strong,small,b").forEach(item => {
    if (item.children.length || item.dataset.ko) return;
    if (!item.dataset.autoKo && /(\d+시간|\d+분|\d+월\s*\d+일)/.test(item.textContent)) item.dataset.autoKo = item.textContent.trim();
    if (!item.dataset.autoKo) return;
    if (locale === "ko") {
      item.textContent = item.dataset.autoKo;
      return;
    }
    item.textContent = item.dataset.autoKo
      .replace(/(\d+)시간/g, "$1h")
      .replace(/(\d+)분/g, "$1m")
      .replace(/(\d+)월\s*(\d+)일/g, (_, month, day) => `${["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(month)]} ${day}`);
  });
}
function renderWeeklyChart() {
  const days = locale === "ko" ? ["월","화","수","목","금","토","일"] : ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  $("#weeklyChart").innerHTML =
    `<div class="plot-grid">${chartData.map((item,index) => `<button class="chart-day ${index === 2 ? "is-selected" : ""}" data-day-index="${index}"><span class="bar-track"><span class="stack" style="height:${item.height}%">${item.parts.map(([color,height]) => `<i class="${color}" style="height:${height}%"></i>`).join("")}</span></span></button>`).join("")}</div>` +
    `<div class="weekday-grid">${days.map(day => `<strong>${day}</strong>`).join("")}</div>` +
    `<div class="duration-grid">${chartData.map(item => `<small>${formatMinutes(item.minutes)}</small>`).join("")}</div>`;
  $$(".chart-day").forEach(button => button.addEventListener("click", () => {
    $$(".chart-day").forEach(item => item.classList.toggle("is-selected", item === button));
    const index = Number(button.dataset.dayIndex);
    const hasRecord = chartData[index].minutes > 0;
    $(".weekly-detail-record").hidden = !hasRecord;
    $(".weekly-detail-empty").hidden = hasRecord;
    if (hasRecord) {
      const dayNames = locale === "ko" ? ["월요일","화요일","수요일","목요일","금요일","토요일","일요일"] : ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
      $(".weekly-detail-record h3").textContent = locale === "ko" ? `${dayNames[index]} · 영역별 집중` : `${dayNames[index]} · focus by area`;
    }
  }));
}
function renderMonthGrid() {
  const days = locale === "ko" ? ["일","월","화","수","목","금","토"] : ["S","M","T","W","T","F","S"];
  const recordedDays = [3,8,12,18,24,29];
  $("#monthGrid").innerHTML = days.map(day => `<span>${day}</span>`).join("") + Array.from({length:35},(_,index) => {
    const day=index-2; if(day<1||day>31) return "<i></i>";
    return `<button class="${recordedDays.includes(day) ? "is-recorded" : ""} ${day===29 ? "is-today" : ""} ${day===24 ? "is-selected" : ""}" data-month-day="${day}">${day}</button>`;
  }).join("");
  $$("[data-month-day]").forEach(button => button.addEventListener("click", () => {
    $$("[data-month-day]").forEach(item => item.classList.toggle("is-selected", item === button));
    const recorded = recordedDays.includes(Number(button.dataset.monthDay));
    $(".month-detail-title").textContent = locale === "ko"
      ? `7월 ${button.dataset.monthDay}일${recorded ? " · 1시간 40분" : ""}`
      : `July ${button.dataset.monthDay}${recorded ? " · 1h 40m" : ""}`;
    $(".month-detail-record").hidden = !recorded;
    $(".month-detail-empty").hidden = recorded;
  }));
}
renderWeeklyChart();
renderMonthGrid();
localizeLooseUnits();

const pieDetails = {
  week: [
    { end:55, ko:"성장 · 1시간 20분 · 55%", en:"Growth · 1h 20m · 55%" },
    { end:82, ko:"건강 · 45분 · 27%", en:"Health · 45m · 27%" },
    { end:100, ko:"생활 · 25분 · 18%", en:"Life · 25m · 18%" }
  ],
  month: [
    { end:40, ko:"건강 · 40분 · 40%", en:"Health · 40m · 40%" },
    { end:68, ko:"업무 · 28분 · 28%", en:"Work · 28m · 28%" },
    { end:88, ko:"개인 성장 · 20분 · 20%", en:"Personal growth · 20m · 20%" },
    { end:100, ko:"영역 없음 · 12분 · 12%", en:"No area · 12m · 12%" }
  ]
};
$$("[data-pie]").forEach(pie => pie.addEventListener("mousemove", event => {
  const rect = pie.getBoundingClientRect();
  const angle = (Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2)) * 180 / Math.PI + 450) % 360;
  const segment = pieDetails[pie.dataset.pie].find(item => angle / 3.6 <= item.end);
  $(".pie-tooltip", pie).textContent = segment[locale];
}));

const completionData = {
  week: [{ko:"월",en:"Mon",done:3,total:4},{ko:"화",en:"Tue",done:2,total:3},{ko:"수",en:"Wed",done:4,total:4},{ko:"목",en:"Thu",done:2,total:3},{ko:"금",en:"Fri",done:4,total:5},{ko:"토",en:"Sat",done:2,total:3},{ko:"일",en:"Sun",done:1,total:1}],
  month: [{ko:"1주",en:"Week 1",done:12,total:15},{ko:"2주",en:"Week 2",done:16,total:20},{ko:"3주",en:"Week 3",done:18,total:22},{ko:"4주",en:"Week 4",done:15,total:19}]
};
function renderCompletion(period = $(".report-period .is-active")?.dataset.period || "week") {
  $("#completionChart").innerHTML = completionData[period].map(item => `<div class="completion-row"><span>${item[locale]}</span><i class="completion-track"><b class="completion-fill" style="width:${item.done / item.total * 100}%"></b></i><strong>${item.done} / ${item.total}</strong></div>`).join("");
}
renderCompletion();

function closeTransient(except) {
  $$(".popover").forEach(item => { if (item !== except) item.hidden = true; });
  $$(".select-menu").forEach(item => {
    if (item !== except) {
      item.hidden = true;
      item.classList.remove("is-floating");
      item.removeAttribute("style");
    }
  });
}
function switchPage(page) {
  $$(".page").forEach(item => item.classList.toggle("is-active", item.dataset.page === page));
  $$(".nav-item").forEach(item => item.classList.toggle("is-active", item.dataset.pageLink === page));
  closeTransient();
  location.hash = page;
}
$$("[data-page-link]").forEach(button => button.addEventListener("click", event => {
  event.preventDefault(); switchPage(button.dataset.pageLink);
}));
const initialPage = location.hash.slice(1);
if ($(`[data-page="${initialPage}"]`)) switchPage(initialPage);

function openModal(id) {
  const layer = $(`#${id}`);
  layer.hidden = false;
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => $("input", layer)?.focus());
}
function closeModals() {
  $$(".modal-layer").forEach(layer => layer.hidden = true);
  document.body.style.overflow = "";
}
$$(".open-task").forEach(button => button.addEventListener("click", () => {
  if ($("#app").classList.contains("guest-mode")) {
    openModal("guestTaskModal");
    return;
  }
  $("#taskDialogTitle").textContent = locale === "ko" ? "새 작업" : "New task";
  const submit = $(".task-modal-submit");
  submit.dataset.ko = "작업 추가";
  submit.dataset.en = "Add task";
  submit.textContent = submit.dataset[locale];
  const scheduleTrigger = $(".modal-schedule-trigger");
  delete scheduleTrigger.dataset.scheduledDays;
  const scheduleLabel = $(".schedule-value", scheduleTrigger);
  scheduleLabel.dataset.ko = "일정 없음";
  scheduleLabel.dataset.en = "No date";
  scheduleLabel.textContent = scheduleLabel.dataset[locale];
  taskRepeatMode = "none";
  selectedTaskScheduleDays = [];
  const repeatLabel = $(".repeat-label");
  repeatLabel.dataset.ko = "반복 없음";
  repeatLabel.dataset.en = "No repeat";
  repeatLabel.textContent = repeatLabel.dataset[locale];
  updateRepeatConstraints();
  openModal("taskModal");
}));
$$(".open-area").forEach(button => button.addEventListener("click", () => {
  $("#simpleTitle").textContent = locale === "ko" ? "새 영역" : "New area";
  $("#simpleDescription").textContent = locale === "ko" ? "이름과 색상을 정해 주세요." : "Choose a name and color.";
  openModal("simpleModal");
}));
$$(".open-project").forEach(button => button.addEventListener("click", () => {
  openModal("projectModal");
}));
$$(".open-area-project").forEach(button => button.addEventListener("click", () => openModal("areaProjectModal")));
$(".project-search-trigger").addEventListener("click", () => {
  const options = $(".project-options");
  options.hidden = !options.hidden;
  if (!options.hidden) $(".project-options input").focus();
});
$$(".section-create").forEach(button => button.addEventListener("click", () => {
  $("#simpleTitle").textContent = locale === "ko" ? "새 섹션" : "New section";
  $("#simpleDescription").textContent = locale === "ko" ? "보드에 사용할 섹션 이름을 정해 주세요." : "Name the new board section.";
  openModal("simpleModal");
}));
$$(".modal-close,.modal-backdrop").forEach(button => button.addEventListener("click", closeModals));
function updateTaskSchedulePopover() {
  $$("[data-task-schedule]").forEach(button => button.classList.toggle("is-active", button.dataset.taskSchedule === taskScheduleMode));
  $(".schedule-popover-calendar").hidden = taskScheduleMode !== "date";
  $$("[data-calendar-day]", $("#taskScheduleCalendar")).forEach(button => button.classList.toggle("is-selected", selectedTaskScheduleDays.includes(Number(button.dataset.calendarDay))));
  const summary = $(".schedule-selection-summary");
  const clear = $(".schedule-selection-clear");
  summary.textContent = taskRepeatMode !== "none"
    ? (locale === "ko" ? "반복 시작일은 한 날짜만 선택할 수 있어요." : "A repeating task can have one start date.")
    : selectedTaskScheduleDays.length
      ? (locale === "ko" ? `${selectedTaskScheduleDays.length}개 날짜 선택` : `${selectedTaskScheduleDays.length} ${selectedTaskScheduleDays.length === 1 ? "date" : "dates"} selected`)
      : (locale === "ko" ? "날짜를 여러 개 선택할 수 있어요." : "You can select multiple dates.");
  clear.hidden = taskRepeatMode !== "none" || selectedTaskScheduleDays.length < 2;
  requestAnimationFrame(positionTaskSchedulePopover);
}
function updateRepeatConstraints() {
  const multiple = selectedTaskScheduleDays.length > 1;
  const needsStartDate = taskRepeatMode !== "none" && selectedTaskScheduleDays.length === 0;
  const repeatConflict = taskRepeatMode !== "none" && multiple;
  $$("[data-repeat]").forEach(button => {
    button.disabled = button.dataset.repeat !== "none" && multiple;
  });
  $(".repeat-multiple-guidance").hidden = !multiple;
  $(".repeat-date-required").hidden = !needsStartDate;
  $(".task-modal-submit").disabled = needsStartDate || repeatConflict;
  const label = $(".schedule-field-label");
  label.textContent = taskRepeatMode === "none"
    ? (locale === "ko" ? "일정" : "Schedule")
    : (locale === "ko" ? "반복 시작일" : "Repeat starts");
}
function positionTaskSchedulePopover() {
  const popover = $("#taskSchedulePopover");
  if (popover.hidden || !activeTaskScheduleTrigger) return;
  const rect = activeTaskScheduleTrigger.getBoundingClientRect();
  const height = Math.min(popover.scrollHeight, innerHeight - 16);
  const left = Math.max(8, Math.min(innerWidth - popover.offsetWidth - 8, rect.right - popover.offsetWidth));
  const below = rect.bottom + 7;
  const top = below + height <= innerHeight - 8 ? below : Math.max(8, rect.top - height - 7);
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}
function bindTaskScheduleCalendar() {
  $$("[data-calendar-day]", $("#taskScheduleCalendar")).forEach(button => button.addEventListener("click", () => {
    const day = Number(button.dataset.calendarDay);
    selectedTaskScheduleDays = taskRepeatMode !== "none"
      ? [day]
      : selectedTaskScheduleDays.includes(day)
        ? selectedTaskScheduleDays.filter(item => item !== day)
        : [...selectedTaskScheduleDays, day].sort((a,b) => a - b);
    taskScheduleMode = "date";
    updateRepeatConstraints();
    updateTaskSchedulePopover();
  }));
}
$$(".task-schedule-trigger").forEach(trigger => trigger.addEventListener("click", event => {
  event.stopPropagation();
  const popover = $("#taskSchedulePopover");
  const opening = popover.hidden || activeTaskScheduleTrigger !== trigger;
  closeTransient(popover);
  if (!opening) {
    popover.hidden = true;
    return;
  }
  activeTaskScheduleTrigger = trigger;
  selectedTaskScheduleDays = (trigger.dataset.scheduledDays || "").split(",").filter(Boolean).map(Number).sort((a,b) => a - b);
  taskScheduleMode = selectedTaskScheduleDays.length ? "date" : "none";
  updateRepeatConstraints();
  popover.hidden = false;
  updateTaskSchedulePopover();
}));
$("#taskSchedulePopover").addEventListener("click", event => event.stopPropagation());
$("#taskSchedulePopover").addEventListener("pointerdown", event => event.stopPropagation());
$(".schedule-selection-clear").addEventListener("click", () => {
  selectedTaskScheduleDays = [];
  updateRepeatConstraints();
  updateTaskSchedulePopover();
});
$$("[data-task-schedule]").forEach(button => button.addEventListener("click", () => {
  taskScheduleMode = button.dataset.taskSchedule;
  updateTaskSchedulePopover();
}));
$$(".schedule-popover-close").forEach(button => button.addEventListener("click", () => {
  $("#taskSchedulePopover").hidden = true;
}));
$(".task-schedule-save").addEventListener("click", () => {
  if (!activeTaskScheduleTrigger) return;
  const label = $(".schedule-value", activeTaskScheduleTrigger);
  if (taskScheduleMode === "none" || !selectedTaskScheduleDays.length) {
    delete activeTaskScheduleTrigger.dataset.scheduledDays;
    label.dataset.ko = "일정 없음";
    label.dataset.en = "No date";
  } else {
    activeTaskScheduleTrigger.dataset.scheduledDays = selectedTaskScheduleDays.join(",");
    const upcomingDays = selectedTaskScheduleDays.filter(day => day >= 29);
    if (!upcomingDays.length) {
      label.dataset.ko = "일정 없음";
      label.dataset.en = "No date";
    } else {
      const [firstDay,...rest] = upcomingDays;
      label.dataset.ko = rest.length ? `7월 ${firstDay}일 외 ${rest.length}일` : `7월 ${firstDay}일`;
      label.dataset.en = rest.length ? `Jul ${firstDay} + ${rest.length} more` : `Jul ${firstDay}`;
    }
  }
  label.textContent = label.dataset[locale];
  $("#taskSchedulePopover").hidden = true;
});
function filterSearchResults(query = "") {
  const normalized = query.trim().toLowerCase();
  let matches = 0;
  $$("[data-search-item]").forEach(item => {
    const visible = !normalized || item.dataset.searchText.includes(normalized);
    item.hidden = !visible;
    if (visible) matches += 1;
  });
  $(".search-empty").hidden = matches > 0;
}
function openSearch() {
  filterSearchResults("");
  $("#globalSearchInput").value = "";
  openModal("searchModal");
}
$("#globalSearchTrigger").addEventListener("click", openSearch);
$("#globalSearchInput").addEventListener("input", event => filterSearchResults(event.target.value));
$$("[data-search-item]").forEach(item => item.addEventListener("click", () => {
  closeModals();
  switchPage(item.dataset.resultPage);
}));
$("#logoutButton").addEventListener("click", () => {
  closeModals();
  showAuthForm("login");
  $("#app").classList.remove("guest-mode");
  $$(".guest-only").forEach(item => item.hidden = true);
  $("#app").hidden = true;
  $("#authScreen").hidden = false;
  document.body.style.overflow = "";
});
$(".auth-login").addEventListener("click", () => {
  $("#authScreen").hidden = true;
  $("#app").hidden = false;
  $("#app").classList.remove("guest-mode");
  $$(".guest-only").forEach(item => item.hidden = true);
  restoreMemberScheduleLabels();
  switchPage("schedule");
});
function enterGuestMode() {
  closeModals();
  $("#authScreen").hidden = true;
  $("#app").hidden = false;
  $("#app").classList.add("guest-mode");
  $$(".guest-only").forEach(item => item.hidden = false);
  switchPage("schedule");
  updateGuestScheduleLabels();
}
$$(".auth-guest").forEach(button => button.addEventListener("click", enterGuestMode));
$$(".guest-signin").forEach(button => button.addEventListener("click", () => {
  showAuthForm("login");
  $("#app").hidden = true;
  $("#authScreen").hidden = false;
}));
function showAuthForm(mode) {
  $(".auth-login-form").hidden = mode !== "login";
  $(".auth-signup-form").hidden = mode !== "signup";
  requestAnimationFrame(() => $("input", mode === "signup" ? $(".auth-signup-form") : $(".auth-login-form"))?.focus());
}
$$(".show-signup").forEach(button => button.addEventListener("click", () => showAuthForm("signup")));
$$(".show-login").forEach(button => button.addEventListener("click", () => showAuthForm("login")));
$$(".color-options button").forEach(button => button.addEventListener("click", () => {
  const palette = button.closest(".color-options");
  $$("button", palette).forEach(item => item.classList.toggle("is-active", item === button));
}));
$("#guestEstimateSwitch").addEventListener("change", event => {
  $(".guest-estimate-fields").hidden = !event.target.checked;
  $("b", event.target.closest(".switch")).textContent = event.target.checked
    ? (locale === "ko" ? "시간 설정" : "Set time")
    : (locale === "ko" ? "설정 안 함" : "Not set");
});
$(".guest-task-save").addEventListener("click", () => {
  const title = $(".guest-task-title").value.trim();
  if (!title) {
    $(".guest-task-title").focus();
    return;
  }
  const hasEstimate = $("#guestEstimateSwitch").checked;
  const minutes = Math.max(5, Math.min(480, Number($(".guest-task-minutes").value) || 30));
  const row = document.createElement("article");
  row.className = "task-row";
  row.innerHTML = '<span class="list-drag" role="button" aria-label="작업 순서 변경"><svg><use href="#i-grip"></use></svg></span><form><button class="checkbox" aria-label="완료"></button></form><button class="task-main start-focus"><strong></strong><small><i class="dot sky"></i><span></span></small></button><button class="icon-button menu-trigger" aria-label="작업 메뉴"><svg><use href="#i-more"></use></svg></button>';
  $("strong", row).textContent = title;
  $("small span", row).textContent = hasEstimate ? (locale === "ko" ? `${minutes}분` : `${minutes}m`) : (locale === "ko" ? "목표 시간 없음" : "No goal time");
  const focusButton = $(".start-focus", row);
  focusButton.dataset.goal = hasEstimate ? minutes : "none";
  focusButton.addEventListener("click", startFocus);
  $(".checkbox", row).addEventListener("click", event => {
    event.preventDefault();
    row.classList.toggle("is-complete");
    event.currentTarget.innerHTML = row.classList.contains("is-complete") ? '<svg><use href="#i-check"></use></svg>' : "";
    updateGuestScheduleLabels();
  });
  $(".schedule-tasks").appendChild(row);
  updateGuestScheduleLabels();
  $(".guest-task-title").value = "";
  closeModals();
});

function setLocale(nextLocale) {
  locale = nextLocale;
  document.documentElement.lang = locale;
  $("#languageLabel").textContent = locale === "ko" ? "한국어" : "English";
  $$("[data-ko]").forEach(item => item.textContent = item.dataset[locale]);
  $$("[data-ko-placeholder]").forEach(item => item.placeholder = item.dataset[`${locale}Placeholder`]);
  $$(".list-drag").forEach(item => item.setAttribute("aria-label", locale === "ko" ? "작업 순서 변경" : "Reorder task"));
  $$(".section-drag").forEach(item => item.setAttribute("aria-label", locale === "ko" ? "섹션 순서 변경" : "Reorder section"));
  calendarMarkup($("#scheduleCalendar"));
  calendarMarkup($("#taskScheduleCalendar"));
  bindScheduleCalendar();
  bindTaskScheduleCalendar();
  selectScheduleDay(selectedScheduleDay);
  renderWeeklyChart();
  renderMonthGrid();
  renderCompletion();
  localizeLooseUnits();
  updateGuestFocusSummary();
  updateGuestScheduleLabels();
  const period = $(".report-period .is-active")?.dataset.period || "week";
  updateReportPeriod(period);
}
$("#languageTrigger").addEventListener("click", () => setLocale(locale === "ko" ? "en" : "ko"));
$(".auth-language").addEventListener("click", () => setLocale(locale === "ko" ? "en" : "ko"));

$$(".menu-trigger").forEach(button => button.addEventListener("click", event => {
  event.stopPropagation();
  const menu = $("#rowMenu");
  closeTransient(menu);
  const rect = button.getBoundingClientRect();
  activeMenuTrigger = button;
  const page = button.closest(".page")?.dataset.page;
  menuContext = page === "areas" && button.closest(".detail-head") ? "area" : page === "projects" && button.closest(".detail-head") ? "project" : "task";
  menu.style.top = `${Math.min(innerHeight - 130, rect.bottom + 5)}px`;
  menu.style.left = `${Math.max(8, rect.right - 170)}px`;
  menu.hidden = false;
}));
$(".edit-task").addEventListener("click", () => {
  $("#rowMenu").hidden = true;
  if (menuContext === "area") {
    $("#simpleTitle").textContent = locale === "ko" ? "영역 수정" : "Edit area";
    $("#simpleDescription").textContent = locale === "ko" ? "이름과 색상을 변경해요." : "Change the name and color.";
    $(".small-modal .form-input").value = locale === "ko" ? "건강" : "Health";
    openModal("simpleModal");
    return;
  }
  if (menuContext === "project") {
    $("#projectModal h2").textContent = locale === "ko" ? "프로젝트 수정" : "Edit project";
    $("#projectModal .form-input").value = locale === "ko" ? "워크데이 개선" : "Workday improvements";
    openModal("projectModal");
    return;
  }
  $("#taskDialogTitle").textContent = locale === "ko" ? "작업 수정" : "Edit task";
  const submit = $(".task-modal-submit");
  submit.dataset.ko = "저장";
  submit.dataset.en = "Save";
  submit.textContent = submit.dataset[locale];
  const sourceRow = activeMenuTrigger?.closest("article");
  const sourceTitle = sourceRow?.querySelector("strong");
  $(".title-input").value = sourceTitle?.dataset?.[locale] || sourceTitle?.textContent?.trim() || (locale === "ko" ? "주간 리뷰 정리" : "Organize weekly review");
  const sourceSchedule = sourceRow?.querySelector(".task-schedule-trigger");
  const modalSchedule = $(".modal-schedule-trigger");
  const modalScheduleLabel = $(".schedule-value", modalSchedule);
  if (sourceSchedule?.dataset.scheduledDays) modalSchedule.dataset.scheduledDays = sourceSchedule.dataset.scheduledDays;
  else delete modalSchedule.dataset.scheduledDays;
  const sourceScheduleLabel = sourceSchedule && $(".schedule-value", sourceSchedule);
  modalScheduleLabel.dataset.ko = sourceScheduleLabel?.dataset.ko || "일정 없음";
  modalScheduleLabel.dataset.en = sourceScheduleLabel?.dataset.en || "No date";
  modalScheduleLabel.textContent = modalScheduleLabel.dataset[locale];
  selectedTaskScheduleDays = (modalSchedule.dataset.scheduledDays || "").split(",").filter(Boolean).map(Number).sort((a,b) => a - b);
  taskRepeatMode = sourceRow?.dataset.task === "weekly" ? "weekly" : "none";
  const repeatLabel = $(".repeat-label");
  repeatLabel.dataset.ko = taskRepeatMode === "weekly" ? "매주" : "반복 없음";
  repeatLabel.dataset.en = taskRepeatMode === "weekly" ? "Weekly" : "No repeat";
  repeatLabel.textContent = repeatLabel.dataset[locale];
  updateRepeatConstraints();
  openModal("taskModal");
});

$$("[data-dropdown]").forEach(trigger => trigger.addEventListener("click", event => {
  event.stopPropagation();
  const menu = $(`[data-dropdown-menu="${trigger.dataset.dropdown}"]`);
  closeTransient(menu);
  menu.hidden = !menu.hidden;
  if (!menu.hidden && trigger.closest(".task-modal")) {
    const rect = trigger.getBoundingClientRect();
    menu.classList.add("is-floating");
    menu.style.width = `${rect.width}px`;
    menu.style.left = `${rect.left}px`;
    const height = menu.getBoundingClientRect().height;
    menu.style.top = `${rect.bottom + 6 + height <= innerHeight - 10 ? rect.bottom + 6 : Math.max(10, rect.top - height - 6)}px`;
  } else {
    menu.classList.remove("is-floating");
    menu.removeAttribute("style");
  }
}));
$$("[data-repeat]").forEach(button => button.addEventListener("click", event => {
  event.stopPropagation();
  if (button.disabled) return;
  taskRepeatMode = button.dataset.repeat;
  const label = $(".repeat-label");
  label.dataset.ko = button.dataset.ko;
  label.dataset.en = button.dataset.en;
  label.textContent = button.dataset[locale];
  $(".repeat-menu").hidden = true;
  updateRepeatConstraints();
  updateTaskSchedulePopover();
}));

$("#estimateSwitch").addEventListener("change", event => {
  $(".estimate-fields").hidden = !event.target.checked;
  $(".switch b").textContent = event.target.checked ? (locale === "ko" ? "시간 설정" : "Set time") : (locale === "ko" ? "설정 안 함" : "Not set");
});
$$(".presets button").forEach(button => button.addEventListener("click", () => {
  $$(".presets button").forEach(item => item.classList.toggle("is-active", item === button));
}));
$$(".priority-options label").forEach(label => label.addEventListener("click", () => {
  $$(".priority-options label").forEach(item => item.classList.toggle("is-active", item === label));
}));
$$("[data-schedule]").forEach(button => button.addEventListener("click", () => {
  $$("[data-schedule]").forEach(item => item.classList.toggle("is-active", item === button));
  $(".date-picker").hidden = button.dataset.schedule !== "date";
}));
$$("[data-project-tab]").forEach(button => button.addEventListener("click", () => {
  $$("[data-project-tab]").forEach(item => item.classList.toggle("is-active", item === button));
  $$("[data-project-panel]").forEach(panel => panel.classList.toggle("is-active", panel.dataset.projectPanel === button.dataset.projectTab));
}));

$$(".checkbox").forEach(button => button.addEventListener("click", event => {
  event.preventDefault();
  const row = button.closest(".task-row");
  row.classList.toggle("is-complete");
  button.innerHTML = row.classList.contains("is-complete") ? '<svg><use href="#i-check"></use></svg>' : "";
  selectScheduleDay(selectedScheduleDay);
  updateGuestScheduleLabels();
}));
$$(".collapse-rail").forEach(button => button.addEventListener("click", () => {
  const workspace = button.closest(".workspace");
  const collapsed = workspace.classList.toggle("is-collapsed");
  $("use", button).setAttribute("href", collapsed ? "#i-panel-expand" : "#i-panel-collapse");
  button.setAttribute("aria-label", locale === "ko"
    ? (collapsed ? "목록 펼치기" : "목록 접기")
    : (collapsed ? "Expand list" : "Collapse list"));
}));
$$("[data-view]").forEach(button => button.addEventListener("click", () => {
  $$("[data-view]").forEach(item => item.classList.toggle("is-active", item === button));
  $(".project-list").classList.toggle("is-active", button.dataset.view === "list");
  $(".board").classList.toggle("is-active", button.dataset.view === "board");
  $(".section-create").hidden = button.dataset.view !== "board";
}));
let weeklyGoalMinutes = 600;
const weeklyFocusedMinutes = 525;
function updateWeeklyGoal() {
  const monthly = $(".report-period .is-active")?.dataset.period === "month";
  const panelTitle = $(".goal-panel-title");
  const overview = $(".weekly-goal-progress-text");
  const remainingLabel = $(".weekly-goal-remaining");
  const editButton = $(".weekly-goal-edit");
  if (monthly) {
    panelTitle.dataset.ko = "7월 집중 목표 합계";
    panelTitle.dataset.en = "July focus goal total";
    overview.dataset.ko = "34시간 55분 / 40시간";
    overview.dataset.en = "34h 55m / 40h";
    remainingLabel.dataset.ko = "5시간 5분 남음";
    remainingLabel.dataset.en = "5h 5m remaining";
    [panelTitle,overview,remainingLabel].forEach(item => item.textContent = item.dataset[locale]);
    $(".goal-panel-percent").textContent = "87%";
    $(".weekly-goal-track i").style.width = "87%";
    editButton.hidden = true;
    return;
  }
  panelTitle.dataset.ko = "이번 주 집중 목표";
  panelTitle.dataset.en = "This week's focus goal";
  panelTitle.textContent = panelTitle.dataset[locale];
  editButton.hidden = false;
  const hours = Math.floor(weeklyGoalMinutes / 60);
  const minutes = weeklyGoalMinutes % 60;
  const remaining = Math.max(0, weeklyGoalMinutes - weeklyFocusedMinutes);
  const remainingHours = Math.floor(remaining / 60);
  const remainingMinutes = remaining % 60;
  const goalKo = [hours ? `${hours}시간` : "", minutes ? `${minutes}분` : ""].filter(Boolean).join(" ");
  const goalEn = [hours ? `${hours}h` : "", minutes ? `${minutes}m` : ""].filter(Boolean).join(" ");
  const progress = Math.min(100, Math.round(weeklyFocusedMinutes / weeklyGoalMinutes * 100));
  overview.dataset.ko = `8시간 45분 / ${goalKo}`;
  overview.dataset.en = `8h 45m / ${goalEn}`;
  overview.textContent = overview.dataset[locale];
  const remainingKo = [remainingHours ? `${remainingHours}시간` : "", remainingMinutes ? `${remainingMinutes}분` : ""].filter(Boolean).join(" ");
  const remainingEn = [remainingHours ? `${remainingHours}h` : "", remainingMinutes ? `${remainingMinutes}m` : ""].filter(Boolean).join(" ");
  remainingLabel.dataset.ko = remaining ? `${remainingKo} 남음` : "목표 달성";
  remainingLabel.dataset.en = remaining ? `${remainingEn} remaining` : "Goal reached";
  remainingLabel.textContent = remainingLabel.dataset[locale];
  $(".goal-panel-percent").textContent = `${progress}%`;
  $(".weekly-goal-track i").style.width = `${progress}%`;
  $(".goal-value").dataset.ko = goalKo;
  $(".goal-value").dataset.en = goalEn;
  $(".goal-value").textContent = $(".goal-value").dataset[locale];
  const summary = $(".report-summary article:first-child small");
  summary.dataset.ko = `목표의 ${progress}% 달성`;
  summary.dataset.en = `${progress}% of goal`;
  summary.textContent = summary.dataset[locale];
}
$(".weekly-goal-edit").addEventListener("click", () => {
  $("#weeklyGoalHours").value = weeklyGoalMinutes / 60;
  openModal("weeklyGoalModal");
});
$(".weekly-goal-cancel").addEventListener("click", () => {
  $("#weeklyGoalHours").value = weeklyGoalMinutes / 60;
});
$(".weekly-goal-save").addEventListener("click", () => {
  const hours = Number($("#weeklyGoalHours").value);
  if (!Number.isFinite(hours) || hours < 0.5) {
    $("#weeklyGoalHours").value = 0.5;
    return;
  }
  const normalizedHours = Math.min(168, Math.round(hours * 2) / 2);
  $("#weeklyGoalHours").value = normalizedHours;
  weeklyGoalMinutes = Math.round(normalizedHours * 60);
  updateWeeklyGoal();
  closeModals();
});

let draggedTask = null;
function updateBoardCounts() {
  $$(".board-column").forEach(column => {
    const label = $("header small", column);
    if (label) label.textContent = column.querySelectorAll(":scope > .board-card").length;
  });
}
function dragAfterItem(container, y) {
  const items = [...container.querySelectorAll(":scope > .sortable-item:not(.is-dragging)")];
  return items.reduce((closest, item) => {
    const box = item.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    return offset < 0 && offset > closest.offset ? {offset, item} : closest;
  }, {offset:Number.NEGATIVE_INFINITY, item:null}).item;
}
function makeSortable(container) {
  container.classList.add("sortable-list");
  [...container.children].forEach(item => {
    if (!item.matches("article")) return;
    item.classList.add("sortable-item");
    item.draggable = false;
    let handle = item.classList.contains("board-card") ? item.querySelector(".drag") : null;
    if (!handle) {
      handle = document.createElement("span");
      handle.innerHTML = '<svg><use href="#i-grip"></use></svg>';
      item.prepend(handle);
    }
    handle.classList.add("list-drag");
    handle.draggable = true;
    handle.tabIndex = 0;
    handle.setAttribute("role", "button");
    handle.setAttribute("aria-label", locale === "ko" ? "작업 순서 변경" : "Reorder task");
    handle.addEventListener("dragstart", event => {
      draggedTask = item;
      item.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", "workday-task");
    });
    handle.addEventListener("dragend", () => {
      item.classList.remove("is-dragging");
      $$(".sortable-list").forEach(list => list.classList.remove("is-drag-over"));
      draggedTask = null;
      updateBoardCounts();
    });
  });
  container.addEventListener("dragover", event => {
    if (!draggedTask) return;
    const sourceIsBoard = draggedTask.classList.contains("board-card");
    const targetIsBoard = container.classList.contains("board-column");
    if (sourceIsBoard !== targetIsBoard) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    container.classList.add("is-drag-over");
    const after = dragAfterItem(container, event.clientY);
    if (after) container.insertBefore(draggedTask, after);
    else container.appendChild(draggedTask);
  });
  container.addEventListener("dragleave", event => {
    if (!container.contains(event.relatedTarget)) container.classList.remove("is-drag-over");
  });
  container.addEventListener("drop", event => {
    event.preventDefault();
    container.classList.remove("is-drag-over");
    updateBoardCounts();
  });
}
[
  ...$$(".task-list"),
  ...$$('[data-page="tasks"] .directory-list'),
  ...$$(".area-tasks"),
  ...$$(".project-list .directory-list"),
  ...$$(".board-column")
].forEach(makeSortable);

let draggedColumn = null;
function dragAfterColumn(board, x) {
  const columns = [...board.querySelectorAll(":scope > .board-column:not(.is-dragging)")];
  return columns.reduce((closest, column) => {
    const box = column.getBoundingClientRect();
    const offset = x - box.left - box.width / 2;
    return offset < 0 && offset > closest.offset ? {offset, column} : closest;
  }, {offset:Number.NEGATIVE_INFINITY, column:null}).column;
}
$$(".board").forEach(board => {
  $$(".board-column", board).forEach(column => {
    const handle = $(".board-column>header .drag", column);
    handle.classList.add("section-drag");
    handle.draggable = true;
    handle.tabIndex = 0;
    handle.setAttribute("role", "button");
    handle.setAttribute("aria-label", locale === "ko" ? "섹션 순서 변경" : "Reorder section");
    handle.addEventListener("dragstart", event => {
      draggedColumn = column;
      column.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", "workday-section");
    });
    handle.addEventListener("dragend", () => {
      column.classList.remove("is-dragging");
      board.classList.remove("is-column-dragging");
      draggedColumn = null;
    });
  });
  board.addEventListener("dragover", event => {
    if (!draggedColumn) return;
    event.preventDefault();
    board.classList.add("is-column-dragging");
    const after = dragAfterColumn(board, event.clientX);
    if (after) board.insertBefore(draggedColumn, after);
    else board.appendChild(draggedColumn);
  });
  board.addEventListener("drop", event => {
    if (!draggedColumn) return;
    event.preventDefault();
    board.classList.remove("is-column-dragging");
  });
});

function updateReportPeriod(period) {
  const monthly = period === "month";
  $(".weekly-report").hidden = monthly;
  $(".weekly-rankings").hidden = monthly;
  $(".monthly-report").hidden = !monthly;
  $(".period-label").textContent = monthly ? (locale === "ko" ? "2026년 7월" : "July 2026") : (locale === "ko" ? "7월 27일 – 8월 2일" : "Jul 27 – Aug 2");
  $(".goal-label").textContent = monthly ? (locale === "ko" ? "월간 목표 전체" : "Monthly focus goal") : (locale === "ko" ? "주간 집중 목표" : "Weekly focus goal");
  $(".goal-value").textContent = monthly ? (locale === "ko" ? "40시간" : "40h") : (locale === "ko" ? "10시간" : "10h");
  $(".planned-value").textContent = monthly ? (locale === "ko" ? "38시간 20분" : "38h 20m") : (locale === "ko" ? "9시간 30분" : "9h 30m");
  $(".actual-value").textContent = monthly ? (locale === "ko" ? "34시간 55분" : "34h 55m") : (locale === "ko" ? "8시간 45분" : "8h 45m");
  $(".metric-completed").textContent = monthly ? "61" : "18";
  $(".metric-active").dataset.ko = monthly ? "22일" : "6일";
  $(".metric-active").dataset.en = monthly ? "22 days" : "6 days";
  $(".metric-sessions").dataset.ko = monthly ? "86회" : "24회";
  $(".metric-sessions").dataset.en = monthly ? "86" : "24";
  $(".metric-streak").dataset.ko = monthly ? "9일" : "4일";
  $(".metric-streak").dataset.en = monthly ? "9 days" : "4 days";
  [$(".metric-active"),$(".metric-sessions"),$(".metric-streak")].forEach(item => item.textContent = item.dataset[locale]);
  $(".completion-title").textContent = monthly ? (locale === "ko" ? "주별 계획 · 완료" : "Planned · completed by week") : (locale === "ko" ? "요일별 계획 · 완료" : "Planned · completed by day");
  $(".completion-total").textContent = monthly ? (locale === "ko" ? "계획 76 · 완료 61" : "Planned 76 · completed 61") : (locale === "ko" ? "계획 23 · 완료 18" : "Planned 23 · completed 18");
  updateWeeklyGoal();
  renderCompletion(period);
}
$$("[data-period]").forEach(button => button.addEventListener("click", () => {
  $$("[data-period]").forEach(item => item.classList.toggle("is-active", item === button));
  updateReportPeriod(button.dataset.period);
}));

let differenceSortDescending = true;
$(".sort-button").addEventListener("click", () => {
  differenceSortDescending = !differenceSortDescending;
  const ranking = $(".task-difference-card .ranking");
  [...ranking.children]
    .sort((a,b) => differenceSortDescending
      ? Number(b.dataset.difference) - Number(a.dataset.difference)
      : Number(a.dataset.difference) - Number(b.dataset.difference))
    .forEach(item => ranking.appendChild(item));
  const label = $(".sort-label");
  label.dataset.ko = differenceSortDescending ? "차이 큰 순" : "차이 작은 순";
  label.dataset.en = differenceSortDescending ? "Largest difference" : "Smallest difference";
  label.textContent = label.dataset[locale];
  $("use", $(".sort-button")).setAttribute("href", differenceSortDescending ? "#i-sort-large" : "#i-sort-small");
});

function startFocus(event) {
  const trigger = event.currentTarget;
  if (trigger.closest('[data-page="schedule"]') && selectedScheduleDay !== 29) return;
  const goal = trigger.dataset.goal;
  const title = $("strong", trigger)?.textContent;
  const location = $("small span", trigger)?.textContent;
  $("#focusScreen h1").textContent = title;
  $(".focus-location b").textContent = location;
  $(".focus-goal").textContent = goal === "none" ? (locale === "ko" ? "목표 시간 없음" : "No goal time") : (locale === "ko" ? `목표 ${goal}분` : `Goal ${goal} min`);
  $(".focus-ring").classList.toggle("no-goal", goal === "none");
  $("#focusScreen").hidden = false;
  document.body.style.overflow = "hidden";
  focusSeconds = 0;
  $("#focusTime").textContent = "00:00";
  clearInterval(focusTimer);
  focusTimer = setInterval(() => {
    focusSeconds += 1;
    const minutes = String(Math.floor(focusSeconds / 60)).padStart(2,"0");
    const seconds = String(focusSeconds % 60).padStart(2,"0");
    $("#focusTime").textContent = `${minutes}:${seconds}`;
  },1000);
}
$$(".start-focus").forEach(button => button.addEventListener("click", startFocus));
$$(".focus-arrow").forEach(button => button.addEventListener("click", event => {
  event.stopPropagation();
  $(".start-focus", button.closest(".task-row"))?.click();
}));
$(".calendar-today-button").addEventListener("click", () => selectScheduleDay(29));
$(".focus-end").addEventListener("click", () => {
  clearInterval(focusTimer);
  if ($("#app").classList.contains("guest-mode") && focusSeconds > 0) {
    guestFocusedSeconds += focusSeconds;
    guestSessionCount += 1;
    updateGuestFocusSummary();
  }
  $("#focusScreen").hidden = true;
  document.body.style.overflow = "";
  showFocusToast(focusSeconds);
});

document.addEventListener("click", event => {
  if (!event.target.closest(".popover") && !event.target.closest(".menu-trigger") && !event.target.closest("#languageTrigger")) closeTransient();
  if (!event.target.closest(".project-options") && !event.target.closest(".project-search-trigger")) $(".project-options").hidden = true;
});
document.addEventListener("keydown", event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && !$("#app").hidden) {
    event.preventDefault();
    openSearch();
    return;
  }
  if (event.key === "Escape") {
    closeTransient();
    closeModals();
    if (!$("#focusScreen").hidden) $(".focus-end").click();
  }
});
