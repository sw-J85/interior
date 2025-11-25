// GitHub에서 Raw CSV 불러오는 URL (나중에 본인 repo 주소로 수정)
const csvUrl = "https://raw.githubusercontent.com/sw-J85/interior/main/data/questions.csv";


// CSV 파싱
async function loadCSV() {
    const res = await fetch(csvUrl);
    const text = await res.text();
    const lines = text.split("\n").map(l => l.split(","));
    return lines;
}

// 랜덤 문제 한 개 골라서 보여주기
let currentQuestion = null;

document.getElementById("startBtn").addEventListener("click", async () => {
    const data = await loadCSV();

    // 헤더 제거
    data.shift();

    // 랜덤 문제 선택
    currentQuestion = data[Math.floor(Math.random() * data.length)];
    
    showQuestion(currentQuestion);
});

function showQuestion(q) {
    document.getElementById("quizBox").classList.remove("hidden");

    const text = q[3].replace(/^"|"$/g,"");  // 문제칸
    document.getElementById("questionText").innerText = text;

    let choicesHTML = "";
    for (let i = 4; i <= 7; i++) {
        if (q[i] && q[i].trim() !== "") {
            const opt = q[i].replace(/^"|"$/g,"");
            choicesHTML += `
                <label>
                    <input type="radio" name="choice" value="${i-3}" />
                    ${opt}
                </label>
            `;
        }
    }

    document.getElementById("choices").innerHTML = choicesHTML;
    document.getElementById("result").innerHTML = "";
    document.getElementById("nextBtn").classList.add("hidden");
}

document.getElementById("submitBtn").addEventListener("click", () => {
    const selected = document.querySelector('input[name="choice"]:checked');
    if (!selected) return;

    const answer = currentQuestion[10];  // 정답 칼럼
    const userAns = selected.value;

    if (answer.trim() === userAns.trim()) {
        document.getElementById("result").innerHTML = "✔ 정답입니다!";
    } else {
        document.getElementById("result").innerHTML =
            `❌ 오답입니다. 정답: ${answer}`;
    }

    document.getElementById("nextBtn").classList.remove("hidden");
});

document.getElementById("nextBtn").addEventListener("click", () => {
    location.reload();
});
