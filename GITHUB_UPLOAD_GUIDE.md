# 📦 GitHub 업로드 가이드

## 파일 다운로드 방법

### GenSpark에서 파일 복사하기

각 파일을 **Read 도구로 읽고** → **복사** → **로컬에 저장**

---

## 업로드할 파일 목록 (23개)

### 1️⃣ 루트 디렉토리 (5개)
```
index.html
auth.html
landing.html
README.md
ADMIN_GUIDE.md
```

### 2️⃣ js/ 폴더 (18개)
```
js/app.js
js/auth.js
js/api.js
js/admin.js
js/bulk-import.js
js/home.js
js/safety-rating.js
js/auto-safety-analyzer.js
js/recommend.js
js/recommendation.js
js/shorts-score.js
js/youtube-api.js
js/kmdb-api.js
js/advanced-search.js
js/review-analyzer.js
js/auto-loader.js
js/weather-recommend.js
js/landing.js
```

---

## GitHub 업로드 방법

### 방법 1: 웹 인터페이스 (추천)

1. **루트 파일 5개 먼저 업로드:**
   - GitHub 저장소 페이지
   - "Add file" → "Upload files"
   - 파일 5개 드래그 앤 드롭
   - "Commit changes" 클릭

2. **js/ 폴더 생성 및 업로드:**
   - "Add file" → "Create new file"
   - 파일 이름: `js/app.js`
   - 내용 붙여넣기
   - "Commit changes"
   - 나머지 17개도 반복

### 방법 2: GitHub Desktop (더 쉬움)

1. GitHub Desktop 다운로드
2. 저장소 Clone
3. 파일들 복사-붙여넣기
4. Commit & Push

### 방법 3: Git CLI (고급 사용자)

```bash
git clone https://github.com/[username]/samovie.git
cd samovie
# 파일들 복사
git add .
git commit -m "Initial commit"
git push
```

---

## GitHub Pages 활성화

1. 저장소 Settings
2. 왼쪽 메뉴 "Pages"
3. Source: "Deploy from a branch"
4. Branch: "main" (또는 "master")
5. Folder: "/ (root)"
6. Save

**5분 후 접속:**
```
https://[username].github.io/samovie/
```

---

## 🎯 다음 단계

1. 파일 업로드 완료
2. GitHub Pages 활성화
3. 사이트 확인
4. 데이터베이스 연결 테스트 (RESTful Table API)
