// This file is a module

// ================================
// openai.js — GPT 문제 생성 엔진 (과정평가형 전용)
// ================================


// 🔑 1. API KEY 저장
export function setApiKey(key) {
    localStorage.setItem("openai_api_key", key);
}

// 🔍 2. API KEY 불러오기
export function getApiKey() {
    return localStorage.getItem("openai_api_key");
}


// =====================================
// 🔥 3. GPT 문제 생성 — 과정평가형 전용 프롬프트 적용
// =====================================
export async function generateProblem(promptText) {
    const apiKey = getApiKey();

    if (!apiKey) {
        alert("❗ OpenAI API KEY가 없습니다. 먼저 API KEY를 등록하세요.");
        throw new Error("API key missing");
    }

    // ===============================
    // 📌 과정평가형 필기 SYSTEM PROMPT
    // ===============================
    const SYSTEM_PROMPT = `
당신은 ‘실내건축기사 과정평가형 필기시험’의 공식 CBT 문제 출제 엔진입니다.
문제는 반드시 아래 8개 NCS 모듈교재 내용만을 기반으로 생성해야 합니다.
그 외의 외부지식, 기출문제, 일반 필기 수준의 확장 개념은 절대로 포함하지 마십시오.

[출제 가능 범위 — 반드시 이 8개 모듈 내부에서만 생성]
1) 실내디자인 자료조사분석 (LM0802010702)
2) 실내디자인 기획 (LM0802010704)
3) 실내디자인 시공관리 (LM0802010708)
4) 실내디자인 기본계획 (LM0802010717)
5) 실내디자인 세부공간계획 (LM0802010718)
6) 실내디자인 실무도서작성 (LM0802010719)
7) 실내디자인 설계도서작성 (LM0802010720)
8) 실내건축설계 프레젠테이션 (LM1403010407)

[출제 원칙 — 과정평가형 기준 준수]
- 반드시 교재 문장, 표, 정의, 특징, 단계, 절차에서 출제할 것
- 교재 범위를 벗어나거나, 실무/법규/외부지식 확장 금지
- 단원의 핵심 용어·개념·절차를 변형하여 문제 구성
- "시험에서 실제로 나올 법한 형태"로 생성
- 문제 난이도는 교재 이해도 측정 중심(너무 쉬움/너무 어려움 금지)

[문제유형별 규칙]
① 4지선다형: 선택지 4개, 1개 정답, 오답은 교재 유사 개념 기반
② 복수선택형: 교재에서 2~3개의 근거 추출
③ 진위형: 교재 문장 변형하여 명확히 O/X 가능하도록
④ 단답형: 용어, 정의명, 구성요소명 등 1~3단어로 명확히 답 가능
⑤ 연결형: A~D ↔ 1~4 구조, 표·도식·내용 기반 1:1 정확 매칭

[출력 형식 — 반드시 아래 JSON만]
코드블록(\`\`\`) 사용 금지, 설명 금지, JSON만 출력:

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
`;

    const requestBody = {
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: promptText }
        ],
        temperature: 0.3
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        throw new Error("GPT 요청 실패: " + response.status);
    }

    const data = await response.json();
    let raw = data.choices[0].message.content.trim();

    // 🔧 백틱 제거 (```json 방지)
    let cleaned = raw
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

    return cleaned;
}
