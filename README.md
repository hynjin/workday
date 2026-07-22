# 작업일

전체 목록에서 이번 작업일에 할 일을 직접 고르고, 실제 집중 세션과 완료 여부를 기록하는 개인용 웹앱입니다. 작업일은 `America/Toronto` 시간대의 오전 5시에 바뀝니다.

## 로컬 실행

Node.js 20.9 이상과 PostgreSQL이 필요합니다.

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

`DATABASE_URL`은 PostgreSQL 연결 문자열로 바꿔 주세요. `npm test`, `npm run test:flow`, `npm run lint`, `npm run build`로 검증할 수 있습니다. `test:flow`는 임시 레코드를 만든 뒤 자동으로 정리합니다.

Docker가 있다면 별도의 PostgreSQL 설치 없이 다음 순서로 시작할 수 있습니다.

```bash
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

로컬 컨테이너는 `127.0.0.1:54329`만 사용하며, 데이터는 `workday_postgres` 볼륨에 보존됩니다.

## Supabase 설정

1. Supabase 프로젝트를 만들고 **Project Settings → Database**에서 연결 문자열을 복사합니다.
2. 애플리케이션의 `DATABASE_URL`에는 Transaction pooler 연결 문자열을 사용합니다.
3. 마이그레이션 실행 시에는 직접 연결 문자열을 임시 `DATABASE_URL`로 지정하고 `npm run db:deploy`를 실행합니다.
4. SSL이 필요한 연결 문자열에는 `sslmode=require`를 추가합니다.

마이그레이션에는 동시에 하나의 활성 작업일과 하나의 활성 집중 세션만 허용하는 PostgreSQL 부분 고유 인덱스가 포함되어 있습니다.

## Vercel 배포

1. 저장소를 Vercel 프로젝트로 가져옵니다.
2. Production, Preview, Development 환경에 `DATABASE_URL`을 등록합니다.
3. Build Command는 기본값인 `npm run build`를 사용합니다.
4. Supabase 마이그레이션은 배포 전에 로컬 또는 CI에서 `npm run db:deploy`로 적용합니다.

로그인 기능이 없는 개인용 앱이므로 공개 URL을 공유하지 않는 것을 권장합니다.
