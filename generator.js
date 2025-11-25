// ============================
// 1) CSV 헤더 정의
// ============================
const CSV_HEADERS = [
    "문항번호","단원","문제유형","문제","선택지1","선택지2","선택지3","선택지4",
    "LeftItems","RightItems","정답","해설","근거파일","근거페이지",
    "핵심요약","문제코드","출제자"
];

// GitHub raw CSV URL — 본인 repo 기준
const CSV_URL = "data/questions.csv";



// ============================
// 2) CSV 불러오기 (자동 merge 위해 기존 문제 로드)
// ============================
async function loadExistingCSV() {
    try {
        const res = await fetch(CSV_URL, {
            headers: { "Cache-Control": "no-cache" }
        });

        const text = await res.text();
        const parsed = Papa.parse(text, { header: true });

        return parsed.data.filter(row =>
            row["문항번호"] && row["문항번호"].trim() !== ""
        );
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
    return Math.max(...nums) + 1;
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
// 5) GPT 문제 생성 (이 버전이 “정확하게 생성되던 버전”)
// ============================
async function requestQuestion(unit, qtype) {
    const apiKey = localStorage.getItem("openai_api_key");
    if (!apiKey) {
        alert("API KEY가 저장되어 있지 않습니다.");
        return null;
    }

    const prompt = `
당신은 ‘실내건축기사 과정평가형 CBT 문제 생성기’입니다.
모든 문제는 아래 규칙을 반드시 지켜서 생성합니다.

[출제 범위]
반드시 아래 8개 NCS 모듈 내에서 출제:
1) 실내디자인 자료조사분석 (LM0802010702)
2) 실내디자인 기획 (LM0802010704)
3) 실내디자인 시공관리 (LM0802010708)
4) 실내디자인 기본계획 (LM0802010717)
5) 실내디자인 세부공간계획 (LM0802010718)
6) 실내디자인 실무도서작성 (LM0802010719)
7) 실내디자인 설계도서작성 (LM0802010720)
8) 실내건축설계 프레젠테이션 (LM1403010407)

[정답 규칙]
- 4지선다형: 정답은 반드시 1~4 숫자
- 복수선택형: "1,3"처럼 콤마 구분 숫자
- 진위형: O 또는 X
- 연결형: "A1 B2 C3 D4"
- 단답형: 1~3단어

[근거 규칙]
- 근거파일은 반드시 위 NCS 8개 모듈 중 하나
- 근거페이지는 반드시 "p.xx" 형식

[출력]
순수 JSON만 출력하며, 아래 형식을 지킬 것:

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
                { role: "system", content: "반드시 순수 JSON만 출력하라." },
                { role: "user", content: prompt }
            ],
            temperature: 0.3
        })
    });

    const data = await res.json();
    let raw = data.choices?.[0]?.message?.content?.trim() || "";

    let cleaned = raw
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

    try {
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("JSON 파싱 실패:", cleaned);
        alert("JSON 파싱 실패");
        return null;
    }
}


// ============================
// 6) CSV Row
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
// 7) 메인 로직 — “정확 버전 + 자동 merge”
// ============================
document.getElementById("generateBtn").addEventListener("click", async () => {
    const unit = unitSelect.value;
    const type = typeSelect.value;
    const count = parseInt(countInput.value);
    const author = authorInput.value.trim();

    if (!unit || !type) {
        alert("단원과 문제유형을 선택해주세요.");
        return;
    }

    // 기존 CSV 불러오기
    const oldRows = await loadExistingCSV();
    const startNumber = getLastQuestionNumber(oldRows);

    let newRows = [];
    previewBox.innerHTML = "";

    // 신규 문제 생성
    for (let i = 0; i < count; i++) {
        const q = await requestQuestion(unit, type);
        if (!q) continue;

        const number = startNumber + i;
        const row = buildCSVRow(number, unit, type, author, q);
        newRows.push(row);

        previewBox.innerHTML += `
            <div class="preview-item">
                <b>${number}. ${row.문제}</b><br>
                <small>${row.문제코드} | ${row.출제자}</small>
            </div>
        `;
    }

    // 자동 merge
    const merged = [...oldRows, ...newRows];

    // CSV 다운로드
    const csv = Papa.unparse(merged, { header: true });
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csv], { type:"text/csv;charset=utf-8;" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "questions.csv";
    link.click();

    alert("📘 기존 + 신규 문제 자동 병합된 최신 questions.csv가 완성되었습니다!");
});
