/***************************************************
 *  CBT 문제 엔진 (드래그 매칭형 포함 완전판)
 *  by 마스터 × ChatGPT
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

  // 문제 유형 자동감지
  if (type === "4지선다형") showSingleChoice(q);
  else if (type === "복수선택형") showMultiChoice(q);
  else if (type === "진위형") showTrueFalse(q);
  else if (type === "연결형") showMatching(q); // ★ 드래그 매칭형
  else if (type === "단답형") showEssay(q);
  else {
    document.getElementById("choices").innerHTML =
      `<p style="color:red">⚠ 알 수 없는 문제유형: ${type}</p>`;
  }
}

/***************************************************
 * ① 단일선택형 (4지선다)
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

  document.getElementById("submitBtn").onclick = () => checkSingleChoice(q);
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

  document.getElementById("submitBtn").onclick = () => checkMultiChoice(q);
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
 * ④ 연결형 (드래그 & 드롭 카드 방식)
 ***************************************************/
function showMatching(q) {
  const leftItems = q["LeftItems"].split(",");
  const rightItems = q["RightItems"].split(",");

  // 왼쪽 카드: A,B,C,D 자동 라벨링
  const leftLabels = ["A", "B", "C", "D"];
  let leftHTML = "<div id='leftCol'>";
  leftItems.forEach((item, idx) => {
    leftHTML += `
      <div class="leftCard"
           draggable="true"
           data-left="${leftLabels[idx]}"
           id="card_${leftLabels[idx]}">
        <b>${leftLabels[idx]}.</b> ${item.trim()}
      </div>
    `;
  });
  leftHTML += "</div>";

  // 오른쪽 슬롯: 1,2,3,4 자동 라벨링
  let rightHTML = "<div id='rightCol'>";
  rightItems.forEach((item, idx) => {
    const rNum = idx + 1;
    rightHTML += `
      <div class="rightSlot"
           data-right="${rNum}"
           id="slot_${rNum}">
        <b>${rNum}.</b> ${item.trim()}
      </div>
    `;
  });
  rightHTML += "</div>";

  document.getElementById("choices").innerHTML =
    `<div id="matchWrap">${leftHTML}${rightHTML}</div>`;

  setupDragDrop();
}

let matchState = {}; // 예: { A:3, B:1, C:4, D:2 }

function setupDragDrop() {
  const cards = document.querySelectorAll(".leftCard");
  const slots = document.querySelectorAll(".rightSlot");

  cards.forEach((card) => {
    card.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", e.target.dataset.left);
    });
  });

  slots.forEach((slot) => {
    slot.addEventListener("dragover", (e) => e.preventDefault());

    slot.addEventListener("drop", (e) => {
      e.preventDefault();
      const leftLabel = e.dataTransfer.getData("text/plain");

      // 해당 카드 DOM 얻기
      const card = document.querySelector(`#card_${leftLabel}`);

      // 슬롯에 카드가 이미 있으면 기존 카드 원위치
      if (slot.firstElementChild && slot.firstElementChild.classList.contains("leftCard")) {
        const oldCard = slot.firstElementChild;
        document.getElementById("leftCol").appendChild(oldCard);
      }

      slot.appendChild(card);

      // 매칭 상태 업데이트
      matchState[leftLabel] = slot.dataset.right;
    });
  });

  // 제출 버튼 연결
  document.getElementById("submitBtn").onclick = () => checkMatchingAnswer();
}

function checkMatchingAnswer() {
  const q = currentQuestion;
  const correctStr = q["정답"].trim(); // 예: "A3 B1 C4 D2"
  const correctPairs = correctStr.split(" ");

  // correctPairs → ["A3","B1","C4","D2"]
  let ok = true;

  correctPairs.forEach((pair) => {
    const L = pair[0];
    const R = pair.substring(1);

    if (matchState[L] !== R) ok = false;
  });

  showResult(ok, q);
}

/***************************************************
 * ⑤ 단답형 (주관식)
 ***************************************************/
function showEssay(q) {
  document.getElementById("choices").innerHTML = `
    <textarea id="essayInput" placeholder="답안을 입력하세요"></textarea>
  `;

  document.getElementById("submitBtn").onclick = () => checkEssay(q);
}

function checkEssay(q) {
  const user = document.getElementById("essayInput").value.trim();
  const correct = q["정답"].trim();

  const ok = user === correct;

  showResult(ok, q);
}

/***************************************************
 * 결과 & 해설 표시
 ***************************************************/
function showResult(isCorrect, q) {
  const box = document.getElementById("result");

  if (isCorrect) box.innerHTML = "✔ 정답입니다!";
  else box.innerHTML = `❌ 오답입니다.<br>정답: ${q["정답"]}`;

  box.innerHTML += `
    <hr>
    <p><b>해설:</b> ${q["해설"] ?? ""}</p>
    <p><b>근거:</b> ${q["근거파일"] ?? ""} / ${q["근거페이지"] ?? ""}</p>
    <p><b>핵심요약:</b> ${q["핵심요약"] ?? ""}</p>
  `;

  document.getElementById("nextBtn").classList.remove("hidden");
  document.getElementById("nextBtn").onclick = () => location.reload();
}
