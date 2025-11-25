/***************************************************
 *  CBT 문제 엔진 (드래그 매칭형 + 문제유형 정규화 버전)
 *  by 마스터 × ChatGPT
 ***************************************************/

const csvUrl =
  "https://raw.githubusercontent.com/sw-J85/interior/main/data/questions.csv";

/***************************************************
 * CSV 로딩
 ***************************************************/
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

/***************************************************
 * 시작 버튼
 ***************************************************/
document.getElementById("startBtn").addEventListener("click", async () => {
  const data = await loadCSV();
  currentQuestion = data[Math.floor(Math.random() * data.length)];
  renderQuestion(currentQuestion);
});

/***************************************************
 * 문제 출력
 ***************************************************/
function renderQuestion(q) {
  document.getElementById("quizBox").classList.remove("hidden");

  const type = q["문제유형"]?.trim();
  document.getElementById("questionText").innerText = q["문제"];
  document.getElementById("result").innerHTML = "";
  document.getElementById("choices").innerHTML = "";
  document.getElementById("nextBtn").classList.add("hidden");

  // 문제유형 라우팅
  switch (type) {
    case "4지선다형":
      showSingleChoice(q);
      break;
    case "복수선택형":
      showMultiChoice(q);
      break;
    case "진위형":
      showTrueFalse(q);
      break;
    case "연결형":
      showMatching(q);
      break;
    case "단답형":
      showEssay(q);
      break;
    default:
      document.getElementById("choices").innerHTML =
        `<p style="color:red">⚠ 알 수 없는 문제유형: ${type}</p>`;
  }
}

/***************************************************
 * ① 4지선다형
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
 * ② 복수선택형
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
 * ④ 연결형 (드래그 매칭)
 ***************************************************/

// 세미콜론/콤마/A: 등 정규화 함수
function normalizeItems(str) {
  return str
    .replace(/A:|B:|C:|D:/g, "")
    .replace(/1:|2:|3:|4:/g, "")
    .replace(/,/g, ";") // 콤마도 세미콜론으로 통합
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s !== "");
}

function showMatching(q) {
  const leftItems = normalizeItems(q["LeftItems"]);
  const rightItems = normalizeItems(q["RightItems"]);

  const leftLabels = ["A", "B", "C", "D"];

  let leftHTML = "<div id='leftCol'>";
  leftItems.forEach((item, idx) => {
    leftHTML += `
      <div class="leftCard"
           draggable="true"
           data-left="${leftLabels[idx]}"
           id="card_${leftLabels[idx]}">
        <b>${leftLabels[idx]}.</b> ${item}
      </div>`;
  });
  leftHTML += "</div>";

  let rightHTML = "<div id='rightCol'>";
  rightItems.forEach((item, idx) => {
    const rNum = idx + 1;
    rightHTML += `
      <div class="rightSlot"
           data-right="${rNum}"
           id="slot_${rNum}">
        <b>${rNum}.</b> ${item}
      </div>`;
  });
  rightHTML += "</div>";

  document.getElementById("choices").innerHTML =
    `<div id="matchWrap">${leftHTML}${rightHTML}</div>`;

  setupDragDrop();
}

let matchState = {};

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
      const card = document.querySelector(`#card_${leftLabel}`);

      if (slot.firstElementChild && slot.firstElementChild.classList.contains("leftCard")) {
        const oldCard = slot.firstElementChild;
        document.getElementById("leftCol").appendChild(oldCard);
      }

      slot.appendChild(card);
      matchState[leftLabel] = slot.dataset.right;
    });
  });

  document.getElementById("submitBtn").onclick = () => checkMatchingAnswer();
}

function checkMatchingAnswer() {
  const correctStr = currentQuestion["정답"].trim(); // "A3 B1 C4 D2"
  const correctPairs = correctStr.split(" ");

  let ok = true;

  correctPairs.forEach((pair) => {
    const L = pair[0];
    const R = pair.substring(1);
    if (matchState[L] !== R) ok = false;
  });

  showResult(ok, currentQuestion);
}

/***************************************************
 * ⑤ 단답형
 ***************************************************/
function showEssay(q) {
  document.getElementById("choices").innerHTML = `
    <textarea id="essayInput" placeholder="답안을 입력하세요"></textarea>
  `;

  document.getElementById("submitBtn").onclick = () => {
    const user = document.getElementById("essayInput").value.trim();
    const ok = user === q["정답"].trim();
    showResult(ok, q);
  };
}

/***************************************************
 * 해설 + 출제자 표시
 ***************************************************/
function showResult(isCorrect, q) {
  const box = document.getElementById("result");

  box.innerHTML = isCorrect
    ? "✔ 정답입니다!"
    : `❌ 오답입니다.<br>정답: ${q["정답"]}`;

  box.innerHTML += `
    <hr>
    <p><b>해설:</b> ${q["해설"] ?? ""}</p>
    <p><b>근거:</b> ${q["근거파일"] ?? ""} / ${q["근거페이지"] ?? ""}</p>
    <p><b>핵심요약:</b> ${q["핵심요약"] ?? ""}</p>
    <p><b>출제자:</b> ${q["출제자"] ?? "미기재"}</p>
  `;

  document.getElementById("nextBtn").classList.remove("hidden");
  document.getElementById("nextBtn").onclick = () => location.reload();
}
