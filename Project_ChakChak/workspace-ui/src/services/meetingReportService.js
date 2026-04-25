const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

async function parseJsonSafe(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function uploadAudioForMeetingReport(file, options = {}) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('stt_model', options.sttModel || 'medium')
  formData.append('language', options.language || 'ko')

  const response = await fetch(`${API_BASE_URL}/meeting-report/upload-audio`, {
    method: 'POST',
    body: formData,
  })

  const data = await parseJsonSafe(response)

  if (!response.ok) {
    throw new Error(data?.detail || '음성파일 업로드/STT 변환에 실패했습니다.')
  }

  return data
}

export async function getMeetingReport(sessionId) {
  const response = await fetch(`${API_BASE_URL}/meeting-report/${sessionId}`)
  const data = await parseJsonSafe(response)

  if (!response.ok) {
    throw new Error(data?.detail || '회의 분석 리포트를 불러오지 못했습니다.')
  }

  return data
}

export async function regenerateMeetingReport(sessionId) {
  const response = await fetch(`${API_BASE_URL}/meeting-report/${sessionId}/regenerate`, {
    method: 'POST',
  })

  const data = await parseJsonSafe(response)

  if (!response.ok) {
    throw new Error(data?.detail || '회의 분석 리포트 재생성에 실패했습니다.')
  }

  return data
}

export async function getMeetingTranscript(sessionId) {
  const response = await fetch(`${API_BASE_URL}/meeting-report/${sessionId}/transcript`)
  const data = await parseJsonSafe(response)

  if (!response.ok) {
    throw new Error(data?.detail || 'STT transcript를 불러오지 못했습니다.')
  }

  return data
}

export async function getMeetingReportItems(sessionId) {
  const response = await fetch(`${API_BASE_URL}/meeting-report/${sessionId}/items`)
  const data = await parseJsonSafe(response)

  if (!response.ok) {
    throw new Error(data?.detail || '회의 저장 항목을 불러오지 못했습니다.')
  }

  return data
}

export async function logMeetingAIEvent({
  sessionId,
  question,
  answer,
  askedAtSec,
  beforeContext = '',
  afterContext = '',
}) {
  if (!sessionId || !question) return null

  const response = await fetch(`${API_BASE_URL}/meeting-report/${sessionId}/ai-event`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question,
      answer,
      askedAtSec,
      beforeContext,
      afterContext,
    }),
  })

  const data = await parseJsonSafe(response)

  if (!response.ok) {
    throw new Error(data?.detail || 'AI 사용 기록 저장에 실패했습니다.')
  }

  return data
}
