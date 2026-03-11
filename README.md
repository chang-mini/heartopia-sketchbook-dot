# heartopia-sketchbook-dot static app

이 폴더는 GitHub Pages에 올릴 정적 버전입니다.

- `index.html`을 시작 페이지로 사용합니다.
- `js/config.js`에 캔버스 프리셋과 125색 팔레트가 들어 있습니다.
- `js/app.js`는 업로드, 크롭, 로컬 색상 매핑, 저장 파일 불러오기를 브라우저에서 처리합니다.

이 폴더는 그대로 새 저장소 루트에 올리도록 정리했습니다.

- `main` 브랜치에 push하면 `.github/workflows/pages.yml`이 GitHub Pages를 배포합니다.
- 배포 URL 형식은 `https://<github-username>.github.io/heartopia-sketchbook-dot/` 입니다.
