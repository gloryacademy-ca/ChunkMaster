# ChunkMaster 배포 가이드 (Ellie용)

## 필요한 것
- GitHub 계정 (없으면 github.com에서 무료 가입)
- Firebase 계정 (없으면 firebase.google.com에서 무료 가입)
- Vercel 계정 (없으면 vercel.com에서 무료 가입)

---

## 1단계: Firebase 설정 (5분)

1. https://console.firebase.google.com 접속
2. "프로젝트 추가" 클릭
3. 이름: `chunkmaster-glory` 입력 → 계속
4. Google 애널리틱스: 비활성화 → 프로젝트 만들기

### Firestore 데이터베이스 만들기
1. 왼쪽 메뉴: "Firestore Database" 클릭
2. "데이터베이스 만들기" 클릭
3. **테스트 모드에서 시작** 선택 (나중에 보안 규칙 설정)
4. 위치: nam5 (미국) 또는 asia-northeast3 (서울) 선택

### 보안 규칙 설정
Firestore Database → 규칙 탭에서 아래 내용으로 교체:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if true;
      allow write: if true;
    }
    match /classes/{classId} {
      allow read, write: if true;
    }
    match /progress/{progressId} {
      allow read, write: if true;
    }
  }
}
```

### 앱 설정 복사
1. Firebase 프로젝트 설정 (톱니바퀴 아이콘) → 일반
2. "내 앱" 섹션 → </> 아이콘 (웹 앱 추가)
3. 앱 닉네임: `chunkmaster-web`
4. **SDK 설정 및 구성** 섹션의 `firebaseConfig` 객체 복사

---

## 2단계: Firebase 설정 코드 넣기

`src/firebase.js` 파일을 열고 YOUR_... 부분을 Firebase에서 복사한 값으로 교체:

```javascript
const firebaseConfig = {
  apiKey: "실제 API 키",
  authDomain: "실제 프로젝트.firebaseapp.com",
  projectId: "실제 프로젝트 ID",
  storageBucket: "실제 프로젝트.appspot.com",
  messagingSenderId: "실제 발신자 ID",
  appId: "실제 앱 ID"
}
```

---

## 3단계: GitHub에 올리기 (3분)

1. github.com → "New repository" 클릭
2. 이름: `chunkmaster` → Create repository
3. GitHub Desktop 앱 또는 아래 명령어:

```bash
cd chunkmaster
git init
git add .
git commit -m "Initial ChunkMaster"
git remote add origin https://github.com/YOUR_USERNAME/chunkmaster.git
git push -u origin main
```

---

## 4단계: Vercel 배포 (2분)

1. https://vercel.com → GitHub로 로그인
2. "New Project" → GitHub 저장소 `chunkmaster` 선택
3. Framework Preset: **Vite** 자동 감지됨
4. "Deploy" 클릭
5. 완료! URL 생성됨 (예: `chunkmaster-glory.vercel.app`)

---

## 5단계: 첫 계정 만들기

배포된 앱에 접속 → 먼저 선생님 계정을 직접 Firebase에 넣어야 합니다.

Firebase Console → Firestore Database → 컬렉션 추가:
- 컬렉션 ID: `users`
- 문서 ID: 자동 생성
- 필드:
  - name: `Glory` (string)
  - pin: `1234` (원하는 PIN으로 변경)
  - role: `teacher` (string)

이후에는 앱 내 선생님 설정 탭에서 학생 계정을 만들 수 있습니다.

---

## iOS 홈 화면에 추가 (학생용)

1. Safari에서 앱 URL 접속
2. 하단 공유 버튼 탭
3. "홈 화면에 추가" 선택
4. 이름 그대로 두고 "추가"

→ 앱 아이콘이 생기고 앱처럼 실행됩니다!

---

## 문제 해결

- **"Firebase 연결 오류"**: firebase.js의 설정값 확인
- **"로그인 안 됨"**: Firebase에 users 컬렉션과 계정 생성 확인  
- **빌드 오류**: `npm install` 다시 실행

---

## 수업 워크플로우

1. 선생님: 반 만들기 → 레슨 배정
2. 선생님: 학생 계정 만들기 (설정 탭)
3. 학생: 앱 URL 접속 → 이름 + PIN 로그인
4. 학생: 배정된 레슨 선택 → 6단계 학습
5. 선생님: 모니터 탭에서 실시간 진도/점수 확인
