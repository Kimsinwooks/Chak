// supabase import 제거
// import { supabase } from './supabaseUse';

const API_URL = "http://localhost:8000";
const OLLAMA_URL = "http://localhost:11434/api/generate";

// query_test.py 결과를 백엔드에서 받아오는 함수
export const fetchQueryTestResult = async (sessionId = 1) => {
  const res = await fetch(`${API_URL}/query-test?session_id=${sessionId}`);

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "query_test 결과 조회 실패");
  }

  return await res.json();
};
// query_test.py 결과를 문자열로 변환
export const buildTextFromAIInput = (aiInput) => {
  if (!aiInput) return "";

  const speechText = (aiInput.speeches || [])
    .map(s => `[${s.start}~${s.end}] ${s.speaker}: ${s.text}`)
    .join("\n");

  const silenceText = (aiInput.silences || [])
    .map(s => `[${s.start}~${s.end}] (${s.duration.toFixed(1)}s) ${s.state}`)
    .join("\n");

  return `
[발화]
${speechText}

[침묵]
${silenceText}
`.trim();
};
// 기존 AI 채팅 함수
export const chatWithAI = async (userMessage, meetingText = "") => {
  try {
    const systemPrompt = `너는 팀워크를 돕는 친절한 AI 비서야.
다음에 제공되는 [회의록 내용]을 참고하여 사용자의 질문에 친절하게 답변해줘.
꼭 회의록에 있는 내용만 답할 필요는 없고 사용자의 질문에 맞는 답을 너 방식대로 찾아줘.
단, 너는 회의록을 항상 기억하고 있어야 돼.

[회의록 내용]
${meetingText ? meetingText : '회의록 내용이 없습니다.'}`;

    const fullPrompt = `${systemPrompt}\n\n[사용자 질문]: ${userMessage}`;

    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma3:27b',    //모델 버전
        prompt: fullPrompt,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  } catch (err) {
    console.error('AI 연결 중 오류 발생:', err);
    return 'AI 연결에 실패했습니다';
  }
};


// query_test.py 결과를 입력으로 받아 요약
export const summarizeMeeting = async (sessionId = 1) => {
  try {
    // 1) 백엔드에서 query_test 결과 가져오기
    const queryResult = await fetchQueryTestResult(sessionId);

    // query_test.py 실행 텍스트
    const meetingText = buildTextFromAIInput(queryResult.ai_input);

    if (!meetingText.trim()) {
      return {
        overall: "회의 기록이 비어있습니다.",
        todos: [],
        analysis: []
      };
    }

    // Ollama 프롬프트
    const prompt = `
[회의 내용]
${meetingText}

[지시 사항]
위 대화 내용을 바탕으로 핵심 안건과 결정 사항을 요약해.

반드시 아래의 JSON 형식을 지켜서 답변해줘. 설명이나 다른 말은 절대로 추가하지 마.
{
  "overall": "전체 회의의 핵심 내용을 1~2줄로 요약",
  "todos": [
    { "who": "이름", "task": "할 일", "deadline": "마감기한(없으면 '미정')" }
  ],
  "analysis": [
    { "who": "이름", "key_point": "이 사람이 한 말 중 가장 중요한 내용" }
  ]
}
`;

    // Ollama 호출
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5:3b',    //모델
        prompt,
        stream: false,
        format: "json"
      })
    });

    if (!response.ok) {
      throw new Error(`AI 서버 통신 오류 (${response.status}): Ollama 서버가 켜져 있는지 확인해주세요.`);
    }

    const data = await response.json();

    if (!data || !data.response || data.response.trim() === '') {
      throw new Error("AI가 빈 응답을 반환했습니다.");
    }

    return JSON.parse(data.response);

  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
};
