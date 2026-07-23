import { cookies } from "next/headers";

export type Locale = "ko" | "en";

export async function getLocale(): Promise<Locale> {
  return (await cookies()).get("workday-locale")?.value === "en" ? "en" : "ko";
}

export const copy = {
  ko: {
    nav: ["작업일", "전체 목록 · 계획"],
    library: {
      eyebrow: "반복 작업과 날짜별 계획", title: "전체 목록 · 작업 준비", intro: "카테고리를 먼저 선택한 뒤, 그 안의 반복 작업을 관리하세요.", count: "개",
      planDate: "계획할 날짜", planHelp: "날짜를 바꾸면 선택한 작업일 목록도 함께 바뀝니다.", viewDate: "날짜 보기", today: "오늘", tomorrow: "내일",
      categories: "목록", categoryHelp: "받은편지함은 분류하지 않은 작업을 모읍니다.", newCategory: "새 카테고리 이름", addCategory: "카테고리 만들기", noCategory: "카테고리를 먼저 만들어 주세요.",
      tasks: "반복 작업", taskHelp: "이 카테고리에서 반복해서 꺼내 쓸 실제 할 일입니다.", addTask: "이 카테고리에 작업 추가", taskPlaceholder: "새 작업 이름", add: "추가", edit: "이름 수정", archive: "보관", remove: "삭제", addToday: "오늘 추가", addDate: "이 날짜에 추가",
      selectedWork: "작업", oneOff: "이 날짜에만 할 작업", planned: "미완료", completed: "완료", takeOut: "빼기", emptyDay: "가운데 목록에서 작업을 선택하거나 위에서 날짜 전용 작업을 추가하세요.",
      archiveBox: "보관함", archivedCategories: "보관된 카테고리", archivedTasks: "보관된 작업", restore: "복원", emptyArchive: "보관된 항목이 없습니다.", direct: "직접 추가",
    },
  },
  en: {
    nav: ["Workday", "Library · Plan"],
    library: {
      eyebrow: "REUSABLE TASKS AND DAILY PLANS", title: "Task library · Plan", intro: "Choose a category first, then manage the reusable tasks inside it.", count: "tasks",
      planDate: "Plan for", planHelp: "Changing the date updates the selected workday list.", viewDate: "View date", today: "Today", tomorrow: "Tomorrow",
      categories: "Lists", categoryHelp: "Inbox holds reusable tasks that need no category.", newCategory: "New category name", addCategory: "Create category", noCategory: "Create a category first.",
      tasks: "Reusable tasks", taskHelp: "Actual tasks you can reuse from this category.", addTask: "Add a task to this category", taskPlaceholder: "New task name", add: "Add", edit: "Rename", archive: "Archive", remove: "Delete", addToday: "Add today", addDate: "Add to date",
      selectedWork: "tasks", oneOff: "One-off task for this date", planned: "Open", completed: "Done", takeOut: "Remove", emptyDay: "Choose a task from the middle list or add a one-off task above.",
      archiveBox: "Archive", archivedCategories: "Archived categories", archivedTasks: "Archived tasks", restore: "Restore", emptyArchive: "The archive is empty.", direct: "One-off",
    },
  },
} as const;
