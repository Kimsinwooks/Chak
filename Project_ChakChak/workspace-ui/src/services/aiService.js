const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export async function chatWithAI(
  userText,
  meetingText = '',
  mode = 'general',
  meta = {}
) {
  const response = await fetch(`${API_BASE_URL}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: userText,
      meetingText,
      mode,
      meta,
    }),
  })

  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    throw new Error(data?.detail || 'AI 서버 연결 실패')
  }

  return data?.text || '응답을 생성하지 못했습니다.'
}

export async function summarizeMeeting({
  meetingType,
  meetingTitle,
  meetingTime,
  keywords,
  liveTranscriptText,
  planSummaryText,
  ragContextText,
  sessionId,
  useWeb = false,
}) {
  const prompt = `
회의 종류: ${meetingType || '-'}
회의 제목: ${meetingTitle || '-'}
회의 시간: ${meetingTime || '-'}
회의 키워드: ${keywords || '-'}

계획서 요약:
${planSummaryText || '(없음)'}

RAG 참고 문맥:
${ragContextText || '(없음)'}

실시간 회의 기록:
${liveTranscriptText || '(없음)'}

위 내용을 바탕으로
1) 지금까지 논의 핵심
2) 결정된 것
3) 남은 쟁점
4) 다음 액션
순으로 한국어로 정리해줘.
`.trim()

  return chatWithAI(prompt, liveTranscriptText, 'realtime', {
    purpose: 'meeting_summary',
    sessionId,
    meetingType,
    meetingTitle,
    meetingTime,
    keywords,
    useWeb,
  })
}

export async function generateMeetingFeedback({
  meetingType,
  meetingTitle,
  keywords,
  liveTranscriptText,
  planSummaryText,
  ragContextText,
  sessionId,
  useWeb = false,
}) {
  const prompt = `
회의 종류: ${meetingType || '-'}
회의 제목: ${meetingTitle || '-'}
회의 키워드: ${keywords || '-'}

계획서 요약:
${planSummaryText || '(없음)'}

RAG 참고 문맥:
${ragContextText || '(없음)'}

실시간 회의 기록:
${liveTranscriptText || '(없음)'}

위 내용을 바탕으로
1) 현재 문제
2) 이유
3) 다음 질문/행동 제안
형태로 한국어 피드백을 줘.
`.trim()

  return chatWithAI(prompt, liveTranscriptText, 'realtime', {
    purpose: 'meeting_feedback',
    sessionId,
    meetingType,
    meetingTitle,
    keywords,
    useWeb,
  })
}

export async function fetchQueryTestResult(sessionId) {
  try {
    const response = await fetch(`${API_BASE_URL}/query-test/${sessionId}`)
    if (!response.ok) {
      return {
        sessionId,
        summary: '',
        transcript: '',
        silenceEvents: [],
        nodes: [],
      }
    }
    return await response.json()
  } catch (error) {
    console.error('fetchQueryTestResult fallback:', error)
    return {
      sessionId,
      summary: '',
      transcript: '',
      silenceEvents: [],
      nodes: [],
    }
  }
}

export function buildTextFromAIInput(input) {
  if (!input) return ''

  if (typeof input === 'string') return input

  if (Array.isArray(input)) {
    return input
      .map((item) => buildTextFromAIInput(item))
      .filter(Boolean)
      .join('\n')
  }

  if (typeof input === 'object') {
    const priorityKeys = [
      'summary',
      'transcript',
      'text',
      'content',
      'previewLine',
      'message',
      'feedback',
      'ragContext',
      'webContext',
    ]

    const collected = []

    for (const key of priorityKeys) {
      if (input[key]) {
        collected.push(String(input[key]))
      }
    }

    if (Array.isArray(input.silenceEvents)) {
      input.silenceEvents.forEach((event) => {
        collected.push(
          `[silence] ${event.state || 'pause'} ${event.start_sec ?? ''}~${event.end_sec ?? ''}`
        )
      })
    }

    if (Array.isArray(input.nodes)) {
      input.nodes.forEach((node) => {
        if (node?.label) collected.push(node.label)
      })
    }

    if (collected.length > 0) {
      return collected.join('\n')
    }

    return JSON.stringify(input, null, 2)
  }

  return String(input)
}