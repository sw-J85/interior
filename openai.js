// ============================================
// openai.js — GitHub Pages ES Module 안정 버전
// ============================================

// 💾 API KEY 저장



// This file is a module
export function setApiKey(key) {
    localStorage.setItem("openai_api_key", key);  // 통일된 KEY 이름
}

// 💾 API KEY 불러오기
export function getApiKey() {
    return localStorage.getItem("openai_api_key");
}

// 🔥 GPT에게 문제 생성 요청 보내기
export async function generateProblem(promptText) {
    const apiKey = getApiKey();

    if (!apiKey) {
        alert("❗ OpenAI API KEY가 없습니다. 먼저 API KEY를 등록하세요.");
        throw new Error("API key missing");
    }

    const requestBody = {
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: "당신은 실내건축기사 CBT 문제 생성 엔진입니다. CSV로 쓰기 좋은 포맷만 출력하세요." },
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
    return data.choices[0].message.content.trim();
}
