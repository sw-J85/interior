/***************************************************
 * CBT 문제 엔진 (문제유형 자동 감지 버전)
 * by 마스터 × ChatGPT
 ***************************************************/

// ★ GitHub RAW CSV URL
const csvUrl =
  "https://raw.githubusercontent.com/sw-J85/interior/main/data/questions.csv";

// ★ PapaParse로 CSV 불러오기
async function loadCSV() {
  const res = await fetch(csvUrl);
  const text = await res.text();

  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
  }).data;

  return parsed;
}

let currentQuestion = null;

// =============================================
//  시작 버튼
// =============================================
document.getElementById("startBtn").addEventListener("click", async () => {
  const data = await loadCSV();

  // 랜덤 문제 선택
  currentQuestion = data[Math.floor(Math.random() * data.length)];

  renderQuestion(currentQuestion);
});

// =============================================
// 문제 출력 (문제유형 자동 감지)
// =============================================
function renderQuestion(q) {
  document.getElementById("quizBox").classList.remove("hidden");

  const type = q["문제유형"]?.trim();
  const questionText = q["문제"];

  document.getElementById("questionText").innerText = questionText;
  document.getElementById("result").innerHTML = "";
  document.getElementById("choices").innerHTML = "";
  document.getElementById("nextBtn").classList.add("hidden");

  // 문제 유형에 따라 UI 렌더링
  if (type === "단일선택형") showSingleChoice(q);
  else if (type === "복수선택형") showMultiChoice(q);
  else if (type === "진위형") showTrueFalse(q);
  else if (type === "연결형") showMatching(q);
  else if (type === "약술형") showEssay(q);
  else {
    document.getElementById("choices").innerHTML =
      `<p style="color:red">⚠ 알 수 없는 문제유형: ${type}</p>`;
  }
}

/***************************************************
 * ① 단일선택형 (4지선다 radio)
 ***************************************************/
function showSingleChoice(q) {
  let html = "";
  for (let i = 1; i <= 4; i++) {
    const opt = q[`선택지${i}`];
    if (opt?.trim()) {
      html += `
        <label>
          <input type="radio" name="choice" value="${i}">
          ${opt}
        </label><br>
      `;
    }
  }
  document.getElementById("choices").innerHTML = html;

  document.getElementById("submitBtn").onclick = () =>
    checkSingleChoice(q);
}

function checkSingleChoice(q) {
  const selected = document.querySelector('input[name="choice"]:checked');
  if (!selected) return;

  const correct = q["정답"].trim();
  const user = selected.value;

  showResult(user === correct, q);
}

/***************************************************
 * ② 복수선택형 (체크박스)
 * 정답 예: "1,3"
 ***************************************************/
function showMultiChoice(q) {
  let html = "";
  for (let i = 1; i <= 4; i++) {
    const opt = q[`선택지${i}`];
    if (opt?.trim()) {
      html += `
        <label>
          <input type="checkbox" name="choice" value="${i}">
          ${opt}
        </label><br>
      `;
    }
  }
  document.getElementById("choices").innerHTML = html;

  document.getElementById("submitBtn").onclick = () =>
    checkMultiChoice(q);
}

function checkMultiChoice(q) {
  const correct = q["정답"].split(",").map((x) => x.trim());
  const selected = [...document.querySelectorAll('input[name="choice"]:checked')].map(
    (x) => x.value
  );

  const ok =
    correct.length === selected.length &&
    correct.every((v) => selected.includes(v));

  showResult(ok, q);
}

/***************************************************
 * ③ 진위형 (O/X)
 ***************************************************/
function showTrueFalse(q) {
  document.getElementById("choices").innerHTML = `
      <button class="oxBtn" data-value="O">O</button>
      <button class="oxBtn" data-value="X">X</button>
  `;

  document.querySelectorAll(".oxBtn").forEach((btn) => {
    btn.onclick = () => {
      const user = btn.dataset.value;
      const correct = q["정답"].trim();
      showResult(user === correct, q);
    };
  });
}

/***************************************************
 * ④ 연결형 (matching)
 * 좌: LeftItems → "A,B,C,D"
 * 우: RightItems → "1,3,4,2"
 * 정답 → "A3 B1 C4 D2"
 ***************************************************/
function showMatching(q) {
  const left = q["LeftItems"]?.split(",") ?? [];
  const right = q["RightItems"]?.split(",") ?? [];

  let html = "<table>";

  left.forEach((item) => {
    html += `
      <tr>
        <td>${item}</td>
        <td>
          <select class="matchSelect" data-left="${item}">
            <option value="">선택</option>
            ${right.map((r) => `<option value="${r}">${r}</option>`).join("")}
          </select>
        </td>
      </tr>
    `;
  });

  html += "</table>";

  document.getElementById("choices").innerHTML = html;

  // 제출 로직
  document.getElementById("submitBtn").onclick = () =>
    checkMatching(q);
}

function checkMatching(q) {
  const answer = q["정답"].trim(); // 예: A3 B1 C4 D2
  const answerPairs = answer.split(" "); // ["A3","B1","C4","D2"]

  const selects = document.querySelectorAll(".matchSelect");
  let userPairs = [];

  selects.forEach((sel) => {
    const L = sel.dataset.left;
    const R = sel.value;
    if (R) userPairs.push(L + R);
  });

  let ok =
    userPairs.length === answerPairs.length &&
    userPairs.every((x) => answerPairs.includes(x));

  showResult(ok, q);
}

/***************************************************
 * ⑤ 약술형 (주관식)
 ***************************************************/
function showEssay(q) {
  document.getElementById("choices").innerHTML = `
    <textarea id="essayInput" placeholder="답안을 입력하세요"></textarea>
  `;

  document.getElementById("submitBtn").onclick = () =>
    checkEssay(q);
}

function checkEssay(q) {
  const user = document.getElementById("essayInput").value.trim();
  const correct = q["정답"].trim();

  // 완전 일치 기준
  const ok = user === correct;

  showResult(ok, q);
}

/***************************************************
 * 공통: 결과 및 해설 출력
 ***************************************************/
function showResult(isCorrect, q) {
  const box = document.getElementById("result");

  if (isCorrect) box.innerHTML = "✔ 정답입니다!";
  else
    box.innerHTML = `❌ 오답입니다. <br>정답: ${q["정답"]}`;

  // 해설 표시
  const extra = `
    <hr>
    <p><b>해설:</b> ${q["해설"] ?? ""}</p>
    <p><b>근거:</b> ${q["근거파일"] ?? ""} / ${q["근거페이지"] ?? ""}</p>
    <p><b>핵심요약:</b> ${q["핵심요약"] ?? ""}</p>
  `;
  box.innerHTML += extra;

  document.getElementById("nextBtn").classList.remove("hidden");

  document.getElementById("nextBtn").onclick = () => location.reload();
}
