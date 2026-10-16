<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Safety-Consulting 앱 구독 인증 및 시작</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .card-modal {
      background: #ffffff;
      width: 92%;
      max-width: 480px;
      padding: 36px 30px;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
    }
    .title {
      margin: 0 0 8px 0;
      color: #0f172a;
      font-size: 22px;
      font-weight: 800;
      text-align: center;
    }
    .subtitle {
      margin: 0 0 24px 0;
      color: #475569;
      font-size: 14px;
      line-height: 1.6;
      text-align: center;
    }
    .form-group {
      margin-bottom: 16px;
      text-align: left;
    }
    .form-label {
      display: block;
      font-weight: 700;
      margin-bottom: 6px;
      color: #334155;
      font-size: 14px;
    }
    .form-input, .form-select {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 15px;
      color: #1e293b;
      background: #ffffff;
    }
    .form-input:focus, .form-select:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
    }
    .status-msg {
      color: #dc2626;
      font-size: 14px;
      font-weight: 700;
      text-align: center;
      min-height: 22px;
      margin: 16px 0;
      line-height: 1.4;
    }
    .btn-primary {
      width: 100%;
      padding: 15px;
      background-color: #2563eb;
      color: #ffffff;
      font-weight: 700;
      font-size: 16px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-primary:hover { background-color: #1d4ed8; }
    .btn-primary:disabled { background-color: #94a3b8; cursor: not-allowed; }
    .btn-green {
      width: 100%;
      padding: 15px;
      background-color: #10b981;
      color: #ffffff;
      font-weight: 700;
      font-size: 15px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      margin-bottom: 10px;
    }
    .btn-gray {
      width: 100%;
      padding: 15px;
      background-color: #94a3b8;
      color: #ffffff;
      font-weight: 700;
      font-size: 15px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
    }
    .badge-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      padding: 12px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      margin: 16px 0;
      text-align: center;
    }
  </style>
</head>
<body>

  <!-- =========================================================
       [순서 3] 이메일 인증 및 구독 신청 화면 (무조건 첫 화면으로 뜸)
       ========================================================= -->
  <div id="step3-gate" class="card-modal" style="display: block;">
    <h2 class="title">🔒 Safety Consulting 앱 구독신청 (3단계)</h2>
    <p class="subtitle">
      구글 폼(1단계)에서 입력하신 <strong>이메일 주소</strong>를 확인합니다.<br>
      신규 이메일은 <strong>30일 무료 체험</strong>이 즉시 시작됩니다.
    </p>

    <div class="form-group">
      <label class="form-label">성명 *</label>
      <input type="text" id="userName" class="form-input" placeholder="성명을 입력하세요" />
    </div>

    <div class="form-group">
      <label class="form-label">이메일 주소 (인증 기준) *</label>
      <input type="email" id="userEmail" class="form-input" placeholder="example@naver.com" />
    </div>

    <div class="form-group">
      <label class="form-label">구독 및 이용 플랜 선택</label>
      <select id="userPlan" class="form-select">
        <option value="무료체험_30일">신규 30일 무료 체험 (또는 기존 회원 로그인)</option>
        <option value="1개월_구독">1개월 유료 구독 신청</option>
        <option value="6개월_구독">6개월 유료 구독 신청</option>
        <option value="12개월_구독">12개월 유료 구독 신청</option>
      </select>
    </div>

    <div id="statusMsg" class="status-msg"></div>

    <button type="button" id="verifyBtn" class="btn-primary" onclick="handleStep3Verify()">
      이메일 인증 및 다음 단계(4단계)로 이동
    </button>
  </div>

  <!-- =========================================================
       [순서 4] 크롬/웨일 브라우저 택일 화면 (3단계 통과 전까지 절대 안 보임)
       ========================================================= -->
  <div id="step4-browser" class="card-modal" style="display: none; text-align: center;">
    <h2 class="title">🛡️ Safety Consulting 앱</h2>
    <p class="subtitle" style="margin-bottom: 12px;">안전관리 AI 에이전트 구동을 시작합니다.</p>

    <div id="verifiedNotice" class="badge-box">✅ 이메일 인증이 완료되었습니다.</div>

    <p style="color: #1e293b; font-size: 15px; font-weight: 700; line-height: 1.5; margin: 20px 0;">
      마이크를 활용한 음성인식 기능 등을 위해<br>이 앱이 실행되는 곳을 선택하여 주세요.
    </p>
    <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-bottom: 24px;">
      현재 사용 중인 브라우저가<br><strong>크롬(Chrome)</strong> 또는 <strong>웨일(Whale)</strong>입니까?
    </p>

    <button type="button" class="btn-green" onclick="proceedToMainApp('chrome_whale')">
      네, 맞아요! (크롬/웨일 사용 중)
    </button>
    <button type="button" class="btn-gray" onclick="proceedToMainApp('other')">
      아니요 (사파리/엣지 등 사용 중)
    </button>
  </div>

  <script>
    // =========================================================================
    // ★ 딱 한 곳 수정할 부분: 아래 큰따옴표 안에 구글 Apps Script 웹앱 URL을 넣으세요.
    // =========================================================================
    const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwUuQ3A_fLI387i6t1Ys2CPm2ESttbl7QRaRRtZNss26PQFvpLVJGbXrOsBYJw6jFXN/exec";

    // ★ 메인 앱(순서 5)으로 넘어갈 주소 (기본값: 메인 화면인 "/" 경로)
    const MAIN_APP_URL = "/";

    // 1. 페이지가 열릴 때 과거 기록 때문에 3단계를 건너뛰는 현상을 100% 강제 차단
    window.onload = function() {
      sessionStorage.removeItem("verifiedEmail");
      sessionStorage.removeItem("licenseKey");
      localStorage.removeItem("verifiedEmail");
      localStorage.removeItem("licenseKey");

      document.getElementById("step3-gate").style.display = "block";
      document.getElementById("step4-browser").style.display = "none";
    };

    // 2. 3단계에서 이메일 확인 버튼 클릭 시 실행
    async function handleStep3Verify() {
      const nameVal = document.getElementById("userName").value.trim();
      const emailVal = document.getElementById("userEmail").value.trim().toLowerCase();
      const planVal = document.getElementById("userPlan").value;
      const statusEl = document.getElementById("statusMsg");
      const btnEl = document.getElementById("verifyBtn");

      if (!nameVal) {
        statusEl.style.color = "#dc2626";
        statusEl.innerText = "⚠️ 성명을 입력하여 주십시오.";
        return;
      }
      if (!emailVal || !emailVal.includes("@")) {
        statusEl.style.color = "#dc2626";
        statusEl.innerText = "⚠️ 정확한 이메일 주소를 입력하여 주십시오.";
        return;
      }

      statusEl.style.color = "#2563eb";
      statusEl.innerText = "⏳ 이메일 기준 구독 권한을 확인하고 있습니다...";
      btnEl.disabled = true;

      try {
        // 만약 APPS_SCRIPT_URL을 아직 안 넣었어도 3단계 -> 4단계 화면 전환이 즉시 작동하도록 처리
        if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes("여기에_")) {
          setTimeout(function() {
            openStep4Screen(emailVal, "FREE-30-DAYS", "신규 30일 무료체험 인증 완료");
          }, 600);
          return;
        }

        const response = await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            mode: "VERIFY_EMAIL_MAIN",
            name: nameVal,
            email: emailVal,
            plan: planVal
          })
        });

        const data = await response.json();

        if (data.result === "ALLOW") {
          openStep4Screen(emailVal, data.licenseKey || "PASS", data.message || "인증 완료");
        } else {
          statusEl.style.color = "#dc2626";
          statusEl.innerText = "❌ " + (data.message || "이용 기간이 만료되었거나 권한이 없습니다.");
          btnEl.disabled = false;
        }
      } catch (err) {
        statusEl.style.color = "#dc2626";
        statusEl.innerText = "⚠️ 통신 오류가 발생했습니다. URL 주소를 확인하거나 다시 시도해 주세요.";
        btnEl.disabled = false;
      }
    }

    // 3. 3단계 통과 후 4단계(브라우저 선택 화면) 열기
    function openStep4Screen(email, key, msg) {
      sessionStorage.setItem("verifiedEmail", email);
      sessionStorage.setItem("licenseKey", key);
      localStorage.setItem("verifiedEmail", email);
      localStorage.setItem("licenseKey", key);

      document.getElementById("verifiedNotice").innerText = "✅ [" + email + "] " + msg;
      document.getElementById("step3-gate").style.display = "none";
      document.getElementById("step4-browser").style.display = "block";
    }

    // 4. 4단계에서 브라우저 선택 후 5단계(메인 앱)로 이동
    function proceedToMainApp(browserChoice) {
      sessionStorage.setItem("browserType", browserChoice);
      localStorage.setItem("browserType", browserChoice);
      window.location.href = MAIN_APP_URL;
    }
  </script>
</body>
</html>