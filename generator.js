/****************************************************
 *  CBT-A 문제 생성기 (openai.js 완전 통합 버전)
 *  — 모든 문제 생성은 openai.js generateProblem() 사용
 ****************************************************/

import { generateProblem } from "./openai.js";

/***********************************************
 * CSV 헤더
 ***********************************************/
const CSV_HEADERS = [
    "문항번호","단원","문제유형","문제","선택지1","선택지2","선택지3","선택지4",
    "LeftItems","RightItems","정답","해설","근거파일","근거페이지",
    "핵심요약","문제코드","출제자"
];

/***********************************************
 * GitHub raw CSV 경로
 ***********************************************/
const CSV_URL = "https://raw.githubusercontent.com/sw-J85/interior/main/data/questions.csv";

/***********************************************
 * 기존 CSV 불러오기
 ***********************************************/
async function loadExistingCSV() {
    try {
        const res = await fetch(CSV_URL, { headers: { "Cache-Control": "no-cache" }});
        const text = await res.text();

        if (!text.trim()) return [];

        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true }).data;
        return parsed.filter(r => r["문항번호"]?.trim());
    } catch (err) {
        console.error("CSV 로딩 실패:", err);
        return [];
    }
}

/***********************************************
 * 마지막 문항 번호 찾기
 ***********************************************/
function getLastNumber(rows) {
    if (rows.length === 0) return 1;

    let nums = rows.map(r => parseInt(r["문항번호"])).filter(n => !isNaN(n));
    return Math.max(...nums) + 1;
}

/***********************************************
 * 문제코드 자동 생성
 ***********************************************/
function makeCode(unit, type, num) {
    const U = {
        "자료조사분석":"RA","기획":"BP","시공관리":"SP","기본계획":"CM",
        "세부공간계획":"XX","실무도서작성":"PR","설계도서작성":"DR","프레젠테이션":"PT"
    }[unit] || "UN";

    const T = {
        "4지선다형":"SS","복수선택형":"MM","진위형":"TF","단답형":"SA","연결형":"MT"
    }[type] || "UK";

    return `${U}-${T}-${String(num).padStart(3,"0")}`;
}

/***********************************************
 * GPT 문제 생성 (openai.js 사용)
 ***********************************************/
async function createProblem(unit, type) {

    // ✨ openai.js의 SYSTEM_PROMPT는 이미 엄격한 CBT-A 기준을 포함함
    // 우리는 단지 "단원 + 문제유형"을 user prompt로 넘기면 됨

    const prompt = `
다음 정보를 기반으로 CBT-A 문제 1개 생성:

단원: ${unit}
문제유형: ${type}
`;

    let raw = await generateProblem(prompt);   // openai.js의 공식 SYSTEM_PROMPT 사용

    try {
        return JSON.parse(raw);
    } catch (e) {
        console.error("JSON 파싱 실패:", raw);
        return null;
    }
}

/***********************************************
 * CSV Row 생성
 ***********************************************/
function makeRow(num, unit, type, author, q) {
    return {
        "문항번호": num,
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
        "문제코드": makeCode(unit, type, num),
        "출제자": author
    };
}

/***********************************************
 * MAIN — 자동 merge + CSV 다운로드
 ***********************************************/
document.getElementById("generateBtn").addEventListener("click", async () => {
    const unit = unitSelect.value;
    const type = typeSelect.value;
    const count = parseInt(countInput.value);
    const author = authorInput.value.trim();

    if (!unit || !type) {
        alert("단원과 문제유형을 선택하세요.");
        return;
    }

    const oldRows = await loadExistingCSV();
    let nextNum = getLastNumber(oldRows);

    let newRows = [];
    previewBox.innerHTML = "";

    for (let i = 0; i < count; i++) {
        const q = await createProblem(unit, type);
        if (!q) continue;

        const num = nextNum + i;
        const row = makeRow(num, unit, type, author, q);
        newRows.push(row);

        previewBox.innerHTML += `
            <div class="preview-item">
                <b>${num}. ${row.문제}</b><br>
                <small>${row.문제코드} | ${row.출제자}</small>
            </div>
        `;
    }

    const merged = [...oldRows, ...newRows];

    const csv = Papa.unparse(merged, { header: true });
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csv], { type:"text/csv;charset=utf-8;" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "questions.csv";
    link.click();

    URL.revokeObjectURL(link.href);

    alert("📘 기존 + 신규 문제 모두 포함된 최신 questions.csv가 생성되었습니다!");
});
