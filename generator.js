// ============================
// 1) CSV 헤더 정의
// ============================
const CSV_HEADERS = [
    "문항번호","단원","문제유형","문제","선택지1","선택지2","선택지3","선택지4",
    "LeftItems","RightItems","정답","해설","근거파일","근거페이지",
    "핵심요약","문제코드","출제자"
];

// GitHub raw CSV URL — 본인 repo 기준
const CSV_URL = "https://raw.githubusercontent.com/sw-J85/interior/main/data/questions.csv";


// ============================
// 2) CSV 불러오기
// ============================
async function loadExistingCSV() {
    try {
        const res = await fetch(CSV_URL);
        const text = await res.text();
        const parsed = Papa.parse(text, { header: true });

        return parsed.data.filter(row => row["문항번호"] && row["문항번호"].trim() !== "");
    } catch (err) {
        console.error("CSV 불러오기 실패:", err);
        return [];
    }
}


// ============================
// 3) 마지막 문항번호 찾기
// ============================
function getLastQuestionNumber(rows) {
    if (rows.length === 0) return 1;

    let nums = rows.map(r => parseInt(r["문항번호"])).filter(n => !isNaN(n));
    let maxNum = Math.max(...nums);

    return maxNum + 1;
}


// ============================
// 4) 문제코드 자동 생성
// ============================
function generateQuestionCode(unit, type, number) {
    const unitCode = {
        "자료조사분석": "RA",
        "기획": "BP",
        "시공관리": "SP",
        "기본계획": "CM",
        "세부공간계획": "XX",
        "실무도서작성": "PR",
        "설계도서작성": "DR",
        "프레젠테이션": "PT"
    }[unit] || "UN";

    const typeCode = {
        "4지선다형": "SS",
        "복수선택형": "MM",
        "진위형": "TF",
        "단답형": "SA",
        "연결형": "MT"
    }[type] || "UK";

    let n = String(number).padStart(3, "0");
    return `${unitCode}-${typeCode}-${n}`;
}


// ============================
// 5) GPT 문제 생성 요청 (JSON 정리 포함)
// ============================
async function requestQuestion(unit, qtype) {
    const apiKey = localStorage.getItem("openai_api_key");
    if (!apiKey) {
        alert("API KEY가 저장되어 있지 않습니다.");
        return null;
    }

    const prompt = `
당신은 '실내건축기사 CBT 문제 생성기'입니다.
출력은 반드시 아래 JSON 구조만 반환하세요.
절대 \`\`\`json, \`\`\` 같은 코드블록을 추가하지 마세요.
문자열만 포함된 순수 JSON만 출력하세요.

JSON 형식:
{
"문제": "",
"선택지1": "",
"선택지2": "",
"선택지3": "",
"선택지4": "",
"LeftItems": "",
"RightItems": "",
"정답": "",
"해설": "",
"근거파일": "",
"근거페이지": "",
"핵심요약": ""
}

단원: ${unit}
문제유형: ${qtype}
`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "순수 JSON만 출력하라." },
                { role: "user", content: prompt }
            ],
            temperature: 0.3
        })
    });

    const data = await res.json();
    let rawText = data.choices?.[0]?.message?.content?.trim() || "";

    // ========== JSON 정리 추가 ==========
    let cleaned = rawText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

    try {
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("JSON 파싱 실패:", cleaned);
        alert("GPT가 올바른 JSON을 반환하지 않았습니다.");
        return null;
    }
}


// ============================
// 6) CSV 한 줄 만들기
// ============================
function buildCSVRow(number, unit, type, author, q) {
    return {
        "문항번호": number,
        "단원": unit,
        "문제유형": type,
        "문제": q.문제 || "",
        "선택지1": q.선택지1 || "",
        "선택지2": q.선택지2 || "",
        "선택지3": q.선택지3 || "",
        "선택지4": q.선택지4 || "",
        "LeftItems": q.LeftItems || "",
        "RightItems": q.RightItems || "",
        "정답": q.정답 || "",
        "해설": q.해설 || "",
        "근거파일": q.근거파일 || "",
        "근거페이지": q.근거페이지 || "",
        "핵심요약": q.핵심요약 || "",
        "문제코드": generateQuestionCode(unit, type, number),
        "출제자": author
    };
}


// ============================
// 7) CSV 다운로드
// ============================
function downloadCSV(rows) {
    const csv = Papa.unparse(rows, { header: true });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "generated_questions.csv";
    link.click();
}


// ============================
// 8) 메인 로직
// ============================
document.getElementById("generateBtn").addEventListener("click", async () => {
    const unit = document.getElementById("unitSelect").value;
    const type = document.getElementById("typeSelect").value;
    const count = parseInt(document.getElementById("countInput").value);
    const author = document.getElementById("authorInput").value.trim();

    if (!unit || !type) {
        alert("단원과 문제유형을 선택해주세요.");
        return;
    }

    const oldRows = await loadExistingCSV();
    let startNumber = getLastQuestionNumber(oldRows);

    let newRows = [];
    document.getElementById("previewBox").innerHTML = "";

    for (let i = 0; i < count; i++) {
        const q = await requestQuestion(unit, type);
        if (!q) continue;

        const number = startNumber + i;
        const row = buildCSVRow(number, unit, type, author, q);
        newRows.push(row);

        document.getElementById("previewBox").innerHTML += `
            <div class="preview-item">
                <b>${number}. ${row.문제}</b><br>
                <small>${row.문제코드} | ${row.출제자}</small>
            </div>
        `;
    }

    downloadCSV(newRows);
});
