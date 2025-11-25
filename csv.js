// =====================================
// csv.js — CSV 변환 + 파일 다운로드 엔진
// =====================================

// CSV 컬럼 헤더 (마스터님 CSV와 100% 동일)
const CSV_HEADERS = [
    "문항번호",
    "단원",
    "문제유형",
    "문제",
    "선택지1",
    "선택지2",
    "선택지3",
    "선택지4",
    "LeftItems",
    "RightItems",
    "정답",
    "해설",
    "근거파일",
    "근거페이지",
    "핵심요약",
    "문제코드",
    "출제자"
];

// 1) 문제 객체 → CSV 한 줄 변환
function problemToCSVRow(problemObj) {
    const row = CSV_HEADERS.map(h => {
        let val = problemObj[h] ?? "";
        val = String(val).replace(/"/g, '""');   // CSV 표준 따옴표 escape
        return `"${val}"`;
    });
    return row.join(",");
}

// 2) 여러 문제 → CSV 전체 문자열
function problemsToCSV(problems) {
    const headerRow = CSV_HEADERS.join(",");
    const dataRows = problems.map(p => problemToCSVRow(p));
    return [headerRow, ...dataRows].join("\n");
}

// 3) CSV 파일 다운로드
function downloadCSV(csvString, filename = "generated_questions.csv") {
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
}

export { CSV_HEADERS, problemToCSVRow, problemsToCSV, downloadCSV };
