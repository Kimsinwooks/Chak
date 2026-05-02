const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

async function parseJsonSafe(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function request(url, options = {}, fallback = '요청 실패') {
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
  })

  const data = await parseJsonSafe(res)

  if (!res.ok) {
    throw new Error(data?.detail || data?.message || fallback)
  }

  return data
}

function normalizeBool(value) {
  return value === true || value === '1' || value === 1 || value === 'true'
}

export async function uploadAudioForMeetingReport(file, options = {}) {
  if (!file) {
    throw new Error('업로드할 음성/영상 파일이 없습니다.')
  }

  const roomName = String(options.roomName || '').trim()

  if (!roomName || roomName === 'default_room') {
    throw new Error('룸을 먼저 선택한 뒤 STT 파일을 업로드하세요.')
  }

  const formData = new FormData()

  formData.append('file', file)
  formData.append('stt_model', options.sttModel || 'medium')
  formData.append('language', options.language || 'ko')
  formData.append('room_name', roomName)

  // 기본값 0: 업로드 request에서는 STT만 하고,
  // 분석 화면 진입 시 /meeting-report/{sessionId} 또는 regenerate에서 qwen/gemma 분석 생성
  formData.append('analyze_after', options.analyzeAfter ? '1' : '0')

  // pyannote/Hugging Face diarization 옵션. 기본 OFF.
  formData.append('diarization_enabled', normalizeBool(options.diarizationEnabled) ? '1' : '0')
  formData.append('speaker_count', options.speakerCount ? String(options.speakerCount) : '')

  return request(
    `${API_BASE_URL}/meeting-report/upload-audio`,
    {
      method: 'POST',
      body: formData,
    },
    '음성파일 업로드/STT 변환 실패',
  )
}

export async function getMeetingReport(sessionId) {
  if (!sessionId) throw new Error('sessionId가 없습니다.')
  return request(
    `${API_BASE_URL}/meeting-report/${encodeURIComponent(sessionId)}`,
    {},
    '회의 분석 결과를 불러오지 못했습니다.',
  )
}

export async function regenerateMeetingReport(sessionId) {
  if (!sessionId) throw new Error('sessionId가 없습니다.')
  return request(
    `${API_BASE_URL}/meeting-report/${encodeURIComponent(sessionId)}/regenerate`,
    {
      method: 'POST',
    },
    '회의 분석 재생성 실패',
  )
}

export async function getMeetingTranscript(sessionId) {
  if (!sessionId) throw new Error('sessionId가 없습니다.')
  return request(
    `${API_BASE_URL}/meeting-report/${encodeURIComponent(sessionId)}/transcript`,
    {},
    '회의 STT transcript를 불러오지 못했습니다.',
  )
}

export async function getMeetingReportItems(sessionId) {
  if (!sessionId) throw new Error('sessionId가 없습니다.')
  return request(
    `${API_BASE_URL}/meeting-report/${encodeURIComponent(sessionId)}/items`,
    {},
    '회의 자료 목록을 불러오지 못했습니다.',
  )
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

  return request(
    `${API_BASE_URL}/meeting-report/${encodeURIComponent(sessionId)}/ai-event`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        answer: answer || '',
        askedAtSec: Number(askedAtSec || 0),
        beforeContext,
        afterContext,
      }),
    },
    'AI 사용 기록 저장 실패',
  )
}
