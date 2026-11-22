# PrintFit | 로컬 라벨 배치 / Local label layout

## 한국어
압축을 푼 폴더에서 이미 설치된 Node.js 22 이상으로 아래 명령을 실행합니다. 패키지 설치나 인터넷 연결은 필요하지 않습니다.

    node server.mjs 47836

같은 컴퓨터에서만 열 수 있습니다.
http://127.0.0.1:47836/ko/
http://127.0.0.1:47836/en/

용지(A4 또는 Letter)를 선택한 뒤 라벨 가로·세로, 간격, 행·열, 수량, 여백과 필요한 표시를 설정하세요. 화면에서 배치를 확인한 뒤 필요한 경우에만 PDF를 저장합니다. 예시는 기본 입력값으로 시험해 보세요.
실제로 인쇄하려면 선택 사항으로 인쇄창의 100% / 실제 크기를 고르고 페이지 맞춤을 끄고, 시험지 한 장을 출력해 치수를 자로 확인하세요. 프린터, 드라이버 여백, 종이와 재단에 따라 달라지며 이 도구는 실제 프린터나 출력 크기를 보정·인증하지 않습니다. Ctrl+C로 로컬 서버를 중지합니다.

## English
Extract the ZIP and run below from that folder using an already installed Node.js 22 or newer. No npm package installation or network access is needed.

    node server.mjs 47836

Open on the same computer only:
http://127.0.0.1:47836/en/
http://127.0.0.1:47836/ko/

Select A4 or Letter and specify label dimensions, pitch, rows and columns, total, margins and any requested marks. Review the layout and optionally download a PDF. Use the built-in initial values for a synthetic example.
Physical printing is optional. If printing, select 100% / Actual Size and disable Fit to Page. Print one test sheet and measure it with a ruler. The utility does not calibrate or certify a printer, paper, driver margins, cut placement, or actual print dimensions. Press Ctrl+C to stop the local server.

Private local distribution candidate; no hosted service, printer calibration, account, or publication is included.

