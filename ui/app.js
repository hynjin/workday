const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
let locale = "ko";
let focusTimer;
let focusSeconds = 0;
let menuContext = "task";

function calendarMarkup(target) {
  const weekdays = locale === "ko" ? ["일","월","화","수","목","금","토"] : ["S","M","T","W","T","F","S"];
  target.innerHTML = weekdays.map(day => `<span>${day}</span>`).join("") +
    Array.from({ length: 35 }, (_, index) => {
      const day = index - 2;
      if (day < 1 || day > 31) return "<i></i>";
      const classes = [day === 29 ? "is-today" : "", [3,8,12,18,24,29].includes(day) ? "is-recorded" : ""].filter(Boolean).join(" ");
      return `<button class="${classes}">${day}</button>`;
    }).join("");
}
calendarMarkup($("#scheduleCalendar"));
calendarMarkup($("#modalCalendar"));

const chartData = [
  { minutes:70, height:58, parts:[["sky",28],["mint",18],["gray",12]] },
  { minutes:45, height:38, parts:[["lilac",18],["peach",20]] },
  { minutes:150, height:100, parts:[["sky",55],["mint",27],["peach",18]] },
  { minutes:60, height:50, parts:[["mint",20],["sky",30]] },
  { minutes:95, height:70, parts:[["lilac",30],["sky",25],["gray",15]] },
  { minutes:25, height:24, parts:[["peach",24]] },
  { minutes:80, height:60, parts:[["butter",25],["mint",35]] }
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
  $$(".chart-day").forEach(button => button.addEventListener("click", () => $$(".chart-day").forEach(item => item.classList.toggle("is-selected", item === button))));
}
function renderMonthGrid() {
  const days = locale === "ko" ? ["일","월","화","수","목","금","토"] : ["S","M","T","W","T","F","S"];
  $("#monthGrid").innerHTML = days.map(day => `<span>${day}</span>`).join("") + Array.from({length:35},(_,index) => {
    const day=index-2; if(day<1||day>31) return "<i></i>";
    return `<button class="${[3,8,12,18,24,29].includes(day) ? "is-recorded" : ""} ${day===24 ? "is-selected" : ""}" data-month-day="${day}">${day}</button>`;
  }).join("");
  $$("[data-month-day]").forEach(button => button.addEventListener("click", () => {
    $$("[data-month-day]").forEach(item => item.classList.toggle("is-selected", item === button));
    $(".month-detail-title").textContent = locale === "ko" ? `7월 ${button.dataset.monthDay}일 · 1시간 40분` : `July ${button.dataset.monthDay} · 1h 40m`;
  }));
}
renderWeeklyChart();
renderMonthGrid();
localizeLooseUnits();

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
  $("#taskDialogTitle").textContent = locale === "ko" ? "새 작업" : "New task";
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

$("#languageTrigger").addEventListener("click", event => {
  event.stopPropagation();
  const menu = $("#languageMenu");
  closeTransient(menu);
  menu.hidden = !menu.hidden;
});
$$("[data-language]").forEach(button => button.addEventListener("click", () => {
  locale = button.dataset.language;
  document.documentElement.lang = locale;
  $("#languageLabel").textContent = locale === "ko" ? "한국어" : "English";
  $$("[data-language]").forEach(item => item.classList.toggle("is-selected", item === button));
  $$("[data-ko]").forEach(item => item.textContent = item.dataset[locale]);
  $$("[data-ko-placeholder]").forEach(item => item.placeholder = item.dataset[`${locale}Placeholder`]);
  calendarMarkup($("#scheduleCalendar"));
  calendarMarkup($("#modalCalendar"));
  renderWeeklyChart();
  renderMonthGrid();
  renderCompletion();
  localizeLooseUnits();
  const period = $(".report-period .is-active")?.dataset.period || "week";
  updateReportPeriod(period);
  $("#languageMenu").hidden = true;
}));

$$(".menu-trigger").forEach(button => button.addEventListener("click", event => {
  event.stopPropagation();
  const menu = $("#rowMenu");
  closeTransient(menu);
  const rect = button.getBoundingClientRect();
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
  $(".title-input").value = locale === "ko" ? "주간 리뷰 정리" : "Organize weekly review";
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
  const label = $(".repeat-label");
  label.dataset.ko = button.dataset.ko;
  label.dataset.en = button.dataset.en;
  label.textContent = button.dataset[locale];
  $(".repeat-menu").hidden = true;
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
}));
$$(".collapse-rail").forEach(button => button.addEventListener("click", () => {
  const workspace = button.closest(".workspace");
  const collapsed = workspace.classList.toggle("is-collapsed");
  $("use", button).setAttribute("href", collapsed ? "#i-chevron-right" : "#i-chevron-left");
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
  $(".completion-title").textContent = monthly ? (locale === "ko" ? "주별 계획 · 완료" : "Planned · completed by week") : (locale === "ko" ? "요일별 계획 · 완료" : "Planned · completed by day");
  $(".completion-total").textContent = monthly ? (locale === "ko" ? "계획 76 · 완료 61" : "Planned 76 · completed 61") : (locale === "ko" ? "계획 23 · 완료 18" : "Planned 23 · completed 18");
  renderCompletion(period);
}
$$("[data-period]").forEach(button => button.addEventListener("click", () => {
  $$("[data-period]").forEach(item => item.classList.toggle("is-active", item === button));
  updateReportPeriod(button.dataset.period);
}));

function startFocus(event) {
  const trigger = event.currentTarget;
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
$(".focus-end").addEventListener("click", () => {
  clearInterval(focusTimer);
  $("#focusScreen").hidden = true;
  document.body.style.overflow = "";
});

document.addEventListener("click", event => {
  if (!event.target.closest(".popover") && !event.target.closest(".menu-trigger") && !event.target.closest("#languageTrigger")) closeTransient();
  if (!event.target.closest(".project-options") && !event.target.closest(".project-search-trigger")) $(".project-options").hidden = true;
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeTransient();
    closeModals();
    if (!$("#focusScreen").hidden) $(".focus-end").click();
  }
});
