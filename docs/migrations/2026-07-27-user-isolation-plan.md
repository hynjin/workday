# 사용자 데이터 격리 및 일정 구조 마이그레이션 계획

작성일: 2026-07-27

## 1. 현재 조사 결과

- Supabase Auth 사용자: 0명
- 공개 스키마 업무 테이블에 `userId` 없음
- 공개 스키마 업무 테이블의 RLS는 활성화되어 있으나 정책은 없음
- `anon`, `authenticated` 역할에 업무 테이블 직접 권한 없음
- Next.js 서버는 소유권 필터가 없는 Prisma 연결로 모든 레코드를 조회
- 배포 앱에 로그인 장벽이 없어 URL 접근자는 기존 데이터를 볼 수 있음

즉 정책이 없는 RLS와 역할 권한으로 Data API 직접 노출은 막혀 있지만, 애플리케이션 서버 경로에서 사용자 데이터가
분리되지 않는다.

## 2. 변경 전 백업

DDL 적용 전에 다음을 수행한다.

1. `migration_backup_20260727` 비공개 스키마 생성
2. Project, Section, Task, RecurrenceRule, Workday, WorkdayItem, FocusSession,
   ProductivityGoal, ProductivityEvent를 원본 구조와 데이터 그대로 복제
3. 스키마의 `PUBLIC`, `anon`, `authenticated` 접근 권한 제거
4. 테이블별 행 수와 정렬된 JSON 기반 SHA-256 해시를 manifest에 기록
5. 마이그레이션 전후 행 수·해시를 비교

이 백업은 마이그레이션 롤백용 DB 내부 스냅샷이다. Supabase 프로젝트 장애 복구는
플랫폼 백업 정책을 별도로 사용한다.

## 3. 사용자 격리 마이그레이션

### Phase A — 무손실 격리

- 업무 루트 테이블에 nullable `userId uuid` 추가
  - Project
  - Task
  - Workday
  - ProductivityGoal
  - ProductivityEvent
- 파생 테이블은 부모 소유권으로 검증하되 조회 성능과 단순한 RLS를 위해 `userId`를
  함께 둔다.
  - Section, RecurrenceRule, WorkdayItem, FocusSession
- 모든 기존 레코드는 `userId = NULL`로 유지한다.
- `auth.users`에 임의 사용자를 만들거나 기존 데이터를 임의 UUID에 배정하지 않는다.
- `userId` 인덱스와 `(userId, ...)` 범위의 고유 제약을 추가한다.
- 모든 업무 테이블에 RLS를 활성화하고 `auth.uid() = userId` 정책을 적용한다.
- `anon`에는 권한을 주지 않고 `authenticated`에 필요한 CRUD만 부여한다.
- Prisma의 DB 소유자 연결은 RLS를 우회할 수 있으므로 모든 서버 쿼리와 Server Action
  에서 검증된 Auth 사용자 ID를 필수로 전달하고 `userId` 조건을 강제한다.

### Phase B — 소유권 확정

- 사용자가 Supabase Auth로 가입·이메일 확인을 완료한다.
- 관리자가 사용자 UUID와 기존 데이터 소유자를 별도로 확인한다.
- 확인된 UUID를 입력으로 받는 단일 트랜잭션 소유권 이전 SQL을 실행한다.
- 루트와 모든 파생 레코드의 관계가 일치하는지 검증한다.
- 이전 전후 행 수와 콘텐츠 해시를 비교한다.
- `NULL userId` 레코드가 0인지 확인한 뒤에만 NOT NULL 전환을 검토한다.

Phase B 전까지 기존 레코드는 삭제되지 않고 일반 사용자에게 노출되지 않는
quarantine 상태로 남는다.

## 4. 기능 마이그레이션 순서

1. WorkdayItem 일정 변경·해제 Server Action 추가
2. 동일 사용자·동일 Task·동일 날짜 중복 제약 유지
3. Today와 Upcoming을 `/schedule`의 날짜별 일정 화면으로 통합하고 기존 경로는
   호환 리다이렉트로 유지
4. 오늘 Workday를 열면 planning 상태에서도 집중·완료 가능하도록 전환
5. Project 상태를 active/completed/archived로 확장하고 `completedAt` 추가
6. 주별 목표 스냅샷 테이블을 추가해 과거 목표와 달성 결과 보존
7. 자주 쓰는 동작만 작업 행에 노출하고 나머지는 `…` 메뉴로 이동

## 5. 롤백 원칙

- 기존 레코드 삭제 금지
- 기존 제목 스냅샷과 집중 기록 수정 금지
- 실패한 단계는 신규 컬럼·정책만 되돌리고 원본 데이터는 backup schema로 비교
- Auth 전환 오류 시 앱은 fail-closed 방식으로 로그인 화면을 표시
- `userId = NULL` 레코드는 소유자 확인 없이는 어떤 사용자에게도 반환하지 않음

## 6. 필수 검증

- 사용자 A 토큰으로 사용자 B 데이터 SELECT/UPDATE/DELETE가 0건 또는 거부
- anon 접근 0건
- Prisma Server Action이 다른 사용자의 ID를 전달받아도 거부
- 일정 해제 후 Task는 유지되고 WorkdayItem만 제거
- Project Task와 Subtask 모두 일정 생성·변경·해제 가능
- 기존 Task, Workday, WorkdayItem, FocusSession 수량과 콘텐츠 해시 보존
