import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  FileText,
  Mic,
  Pause,
  Square,
  Sparkles,
  Volume2,
  Globe,
} from 'lucide-react'
import {
  getMeetingDetail,
  getMeetingLibraryTree,
  getMeetingFeedback,
  getMeetingMidSummary,
  stopRealtimeMeeting,
  uploadRealtimeChunk,
} from '../services/realtimeMeetingService'
import { chatWithAI } from '../services/aiService'
import { logMeetingAIEvent } from '../services/meetingReportService'

function MeetingTypeLabel({ meetingType }) {
  const labels = {
    brainstorming: '브레인스토밍',
    status_update: '진행상황 공유',
    decision_making: '의사결정',
    research_discussion: '연구/아이디어 검토',
    retrospective: '회고/피드백',
  }

  return (
    <span className="inline-flex px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-medium">
      {labels[meetingType] || '일반 회의'}
    </span>
  )
}

function formatSeconds(seconds = 0) {
  const safe = Math.max(0, Math.floor(seconds))
  const mm = String(Math.floor(safe / 60)).padStart(2, '0')
  const ss = String(safe % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

function humanMicError(err) {
  const name = err?.name || ''
  if (name === 'NotAllowedError') return '브라우저 또는 운영체제에서 마이크 접근이 거부되었습니다.'
  if (name === 'NotFoundError') return '사용 가능한 마이크 장치를 찾지 못했습니다.'
  if (name === 'NotReadableError') return '다른 앱이 마이크를 사용 중이거나 장치를 열 수 없습니다.'
  if (name === 'SecurityError') return 'HTTPS/보안 컨텍스트 문제로 마이크 접근이 차단되었습니다.'
  return err?.message || '마이크 접근 또는 회의 시작에 실패했습니다.'
}

async function ensureMicrophoneReady() {
  if (!window.isSecureContext) {
    throw new Error('HTTPS 또는 localhost 환경이 아니어서 마이크를 사용할 수 없습니다.')
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('이 브라우저는 마이크 입력을 지원하지 않습니다.')
  }

  const devices = await navigator.mediaDevices.enumerateDevices()
  const audioInputs = devices.filter((d) => d.kind === 'audioinput')
  if (audioInputs.length === 0) {
    throw new Error('인식된 마이크가 없습니다.')
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
    },
  })

  return stream
}

export default function MeetingLiveView({ planData }) {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: '회의가 시작되었습니다. 중간 요약과 피드백은 회의 종류·계획서·누적 기록을 함께 참고합니다.',
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [useWebSearch, setUseWebSearch] = useState(false)

  const [meetingDetail, setMeetingDetail] = useState(null)
  const [meetingTree, setMeetingTree] = useState(null)

  const [isRecording, setIsRecording] = useState(false)
  const [recorderError, setRecorderError] = useState('')
  const [isProcessingAction, setIsProcessingAction] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [liveNotice, setLiveNotice] = useState('')

  const mediaRecorderRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const timerRef = useRef(null)
  const pollRef = useRef(null)
  const startedAtRef = useRef(Date.now())
  const chunkOffsetRef = useRef(0)
  const messagesEndRef = useRef(null)

  const sessionId = planData?.sessionId
  const realtimeEnabled = !!planData?.realtimeRecordingEnabled

  const liveTranscriptItems = useMemo(
    () => meetingDetail?.liveTranscriptItems || [],
    [meetingDetail]
  )

  const afterMeetingItems = useMemo(
    () => meetingTree?.afterMeetingRecordings || [],
    [meetingTree]
  )

  const meetingPlanItems = useMemo(
    () => meetingTree?.meetingPlanItems || [],
    [meetingTree]
  )

  const knowledgeItems = useMemo(
    () => meetingTree?.knowledgeItems || [],
    [meetingTree]
  )

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const refreshMeetingState = async () => {
    if (!sessionId) return
    try {
      const [detail, tree] = await Promise.all([
        getMeetingDetail(sessionId),
        getMeetingLibraryTree(sessionId),
      ])
      setMeetingDetail(detail)
      setMeetingTree(tree)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    refreshMeetingState()
  }, [sessionId])

  useEffect(() => {
    if (!realtimeEnabled || !sessionId) return

    const startAutomatically = async () => {
      try {
        const stream = await ensureMicrophoneReady()
        mediaStreamRef.current = stream

        const mimeType =
          MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : 'audio/webm'

        const recorder = new MediaRecorder(stream, { mimeType })
        mediaRecorderRef.current = recorder
        startedAtRef.current = Date.now()
        chunkOffsetRef.current = 0

        recorder.ondataavailable = async (event) => {
          if (!event.data || event.data.size === 0) return
          try {
            await uploadRealtimeChunk(sessionId, event.data, chunkOffsetRef.current)
            chunkOffsetRef.current += 5
            await refreshMeetingState()
          } catch (error) {
            console.error(error)
            setRecorderError(error.message || '실시간 chunk 업로드 중 오류가 발생했습니다.')
          }
        }

        recorder.start(5000)
        setIsRecording(true)
        setLiveNotice('실시간 녹음이 시작되었습니다.')

        timerRef.current = setInterval(() => {
          setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000))
        }, 1000)

        pollRef.current = setInterval(() => {
          refreshMeetingState()
        }, 10000)
      } catch (error) {
        console.error(error)
        setRecorderError(humanMicError(error))
      }
    }

    startAutomatically()

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (pollRef.current) clearInterval(pollRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [realtimeEnabled, sessionId])

  const handleStopMeeting = async () => {
    if (!sessionId) return
    try {
      setIsProcessingAction(true)

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (timerRef.current) clearInterval(timerRef.current)
      if (pollRef.current) clearInterval(pollRef.current)

      setIsRecording(false)
      await stopRealtimeMeeting(sessionId)
      await refreshMeetingState()
      setLiveNotice('회의가 종료되어 회의 후 기록 폴더로 정리되었습니다.')
    } catch (error) {
      console.error(error)
      setRecorderError(error.message || '회의 종료 처리 중 오류가 발생했습니다.')
    } finally {
      setIsProcessingAction(false)
    }
  }

  const handleAskAI = async (text) => {
    if (!text.trim()) return

    const askedAtSec = elapsedSeconds
    const questionText = text.trim()

    setMessages((prev) => [...prev, { sender: 'user', text: questionText }])
    setInputValue('')
    setIsChatLoading(true)

    try {
      const historyText = liveTranscriptItems
        .map((item) => item.previewLine)
        .join('\n')

      const response = await chatWithAI(
        questionText,
        historyText,
        'realtime',
        {
          sessionId,
          meetingType: data.meetingType,
          meetingTitle: data.title,
          meetingTime: data.time,
          keywords: data.keywords,
          purpose: 'live_meeting_chat',
          useWeb: useWebSearch,
        }
      )

      setMessages((prev) => [...prev, { sender: 'ai', text: response }])

      try {
        await logMeetingAIEvent({
          sessionId,
          question: questionText,
          answer: response,
          askedAtSec,
          beforeContext: historyText,
          afterContext: '',
        })
      } catch (logError) {
        console.warn('AI event log failed:', logError)
      }
    } catch (error) {
      console.error(error)
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: `AI 응답 오류: ${error.message}` },
      ])
    } finally {
      setIsChatLoading(false)
    }
  }

  const handleMidSummary = async () => {
    if (!sessionId) return
    try {
      setIsProcessingAction(true)
      const result = await getMeetingMidSummary(sessionId)
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `중간 요약\n\n${result.summary}`,
        },
      ])
      await refreshMeetingState()
    } catch (error) {
      console.error(error)
      setRecorderError(error.message || '중간 요약 생성 중 오류가 발생했습니다.')
    } finally {
      setIsProcessingAction(false)
    }
  }

  const handleFeedback = async () => {
    if (!sessionId) return
    try {
      setIsProcessingAction(true)
      const result = await getMeetingFeedback(sessionId)
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `회의 피드백\n\n${result.feedback}`,
        },
      ])
      await refreshMeetingState()
    } catch (error) {
      console.error(error)
      setRecorderError(error.message || '회의 피드백 생성 중 오류가 발생했습니다.')
    } finally {
      setIsProcessingAction(false)
    }
  }

  const handleQuickPrompt = (text) => {
    handleAskAI(text)
  }

  const data = planData || {
    title: '새로운 즉석 회의',
    time: '진행 중',
    keywords: '자유주제',
    meetingType: 'brainstorming',
  }

  const agendas = [
    '실시간 회의 기록 및 정리 흐름 확인',
    '중간 요약과 피드백 기능 점검',
    '회의 후 자료 정리 방식 확인',
  ]

  return (
    <div className="flex-1 overflow-hidden bg-[#f7f8fa]">
      <div className="h-full grid grid-cols-[300px_minmax(0,1fr)_360px] gap-6 p-6">
        <aside className="bg-[#16171d] text-white rounded-3xl px-6 py-6 overflow-y-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium mb-4">
            <Mic className="w-4 h-4" />
            실시간 분석 중
          </div>

          <h1 className="text-2xl font-bold leading-tight">{data.title}</h1>
          <div className="mt-3 text-sm text-white/70">{data.time}</div>
          <div className="mt-3">
            <MeetingTypeLabel meetingType={data.meetingType} />
          </div>

          <div className="mt-6 rounded-2xl bg-white/5 p-4">
            <div className="text-sm font-semibold">실시간 상태</div>
            <div className="mt-3 space-y-2 text-sm text-white/80">
              <div>녹음: {realtimeEnabled ? (isRecording ? '진행 중' : '준비/오류') : '사용 안 함'}</div>
              <div>경과 시간: {formatSeconds(elapsedSeconds)}</div>
              <div>세션 ID: {sessionId || '-'}</div>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-semibold mb-3">진행 안건</h2>
            <div className="space-y-3">
              {agendas.map((agenda, idx) => (
                <div key={idx} className="flex items-start gap-3 rounded-2xl bg-white/5 p-4">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 text-violet-300" />
                  <span className="text-sm text-white/85">{agenda}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="bg-white rounded-3xl border border-gray-200 shadow-sm flex flex-col min-w-0">
          <div className="border-b border-gray-100 px-6 py-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-semibold">실시간 회의 보조</div>
              <div className="text-sm text-gray-500">
                회의 종류, 계획서, 업로드 자료, 실시간 STT를 함께 참고해서 응답합니다.
              </div>
            </div>

            <div className="flex items-center gap-2">
              {realtimeEnabled && isRecording && (
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-red-50 text-red-600 text-sm font-medium">
                  <Volume2 className="w-4 h-4" />
                  녹음 중
                </span>
              )}
              <button
                onClick={handleStopMeeting}
                disabled={!realtimeEnabled || isProcessingAction}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-900 text-white text-sm font-medium disabled:opacity-50"
              >
                <Square className="w-4 h-4" />
                회의 종료
              </button>
            </div>
          </div>

          {(recorderError || liveNotice) && (
            <div className="px-6 pt-4">
              {recorderError && (
                <div className="rounded-2xl bg-red-50 text-red-600 px-4 py-3 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5" />
                  <span>{recorderError}</span>
                </div>
              )}
              {!recorderError && liveNotice && (
                <div className="rounded-2xl bg-violet-50 text-violet-700 px-4 py-3 text-sm">
                  {liveNotice}
                </div>
              )}
            </div>
          )}

          <div className="px-6 pt-5 flex flex-wrap gap-3">
            <button
              onClick={handleMidSummary}
              disabled={isProcessingAction}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-violet-600 text-white text-sm font-medium disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              회의 중간 요약
            </button>
            <button
              onClick={handleFeedback}
              disabled={isProcessingAction}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-gray-200 bg-white text-sm font-medium disabled:opacity-50"
            >
              <Bot className="w-4 h-4" />
              회의 피드백
            </button>
            <button
              onClick={() => handleQuickPrompt('지금 회의가 어디서 막히고 있는지 진단해줘.')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-gray-200 bg-white text-sm font-medium"
            >
              <Pause className="w-4 h-4" />
              정체 진단
            </button>
          </div>

          <div className="px-6 pt-3">
            <button
              onClick={() => setUseWebSearch((prev) => !prev)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium border transition ${
                useWebSearch
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              <Globe className="w-4 h-4" />
              웹검색 {useWebSearch ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="px-6 pt-4 flex flex-wrap gap-2">
            <button
              onClick={() => handleQuickPrompt('현재까지 결정된 내용과 남은 쟁점을 정리해줘.')}
              className="px-3 py-2 rounded-full bg-gray-100 text-sm text-gray-700"
            >
              결정/쟁점 정리
            </button>
            <button
              onClick={() => handleQuickPrompt('다음에 누가 무엇을 말하면 회의가 잘 풀릴지 제안해줘.')}
              className="px-3 py-2 rounded-full bg-gray-100 text-sm text-gray-700"
            >
              다음 스텝 제안
            </button>
            <button
              onClick={() => handleQuickPrompt('회의 목표에서 벗어난 부분이 있으면 알려줘.')}
              className="px-3 py-2 rounded-full bg-gray-100 text-sm text-gray-700"
            >
              목표 이탈 점검
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            {messages.map((message, idx) => {
              const isAI = message.sender === 'ai'
              return (
                <div key={idx} className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[80%] rounded-3xl px-5 py-4 text-sm leading-7 shadow-sm whitespace-pre-wrap ${
                      isAI
                        ? 'bg-gray-50 border border-gray-200 text-gray-800'
                        : 'bg-violet-600 text-white'
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              )
            })}

            {isChatLoading && (
              <div className="inline-flex rounded-3xl px-5 py-4 bg-gray-50 border border-gray-200 text-sm text-gray-500">
                AI가 답변을 생성하는 중입니다...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-100 px-6 py-4">
            <div className="flex gap-3">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    handleAskAI(inputValue)
                  }
                }}
                placeholder="회의 관련 질문, 중간 피드백 요청, 다음 액션 제안 등을 입력하세요."
                className="flex-1 h-12 rounded-2xl border border-gray-200 px-4 text-sm"
              />
              <button
                onClick={() => handleAskAI(inputValue)}
                disabled={isChatLoading}
                className="px-5 rounded-2xl bg-gray-900 text-white text-sm font-medium disabled:opacity-50"
              >
                전송
              </button>
            </div>
          </div>
        </main>

        <aside className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-w-0">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold">회의 자료함</h2>
            <p className="text-sm text-gray-500 mt-1">
              회의 중 녹음본과 회의 후 기록을 분리해서 보여줍니다.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Mic className="w-4 h-4 text-violet-600" />
                <h3 className="font-semibold">회의 중 녹음본</h3>
              </div>

              <div className="space-y-3">
                {liveTranscriptItems.length === 0 ? (
                  <div className="rounded-2xl bg-gray-50 border border-gray-200 px-4 py-4 text-sm text-gray-500">
                    아직 실시간 기록이 없습니다.
                  </div>
                ) : (
                  liveTranscriptItems.map((item) => (
                    <div key={item.id} className="rounded-2xl bg-gray-50 border border-gray-200 px-4 py-4">
                      <div className="text-xs text-violet-700 font-medium mb-1">{item.kindLabel}</div>
                      <div className="text-sm text-gray-800 whitespace-pre-wrap leading-6">{item.previewLine}</div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-violet-600" />
                <h3 className="font-semibold">회의 계획서</h3>
              </div>

              <div className="space-y-3">
                {meetingPlanItems.length === 0 ? (
                  <div className="rounded-2xl bg-gray-50 border border-gray-200 px-4 py-4 text-sm text-gray-500">
                    저장된 계획서가 없습니다.
                  </div>
                ) : (
                  meetingPlanItems.map((item) => (
                    <div key={item.id} className="rounded-2xl bg-gray-50 border border-gray-200 px-4 py-4">
                      <div className="text-xs text-violet-700 font-medium mb-1">{item.kindLabel}</div>
                      <div className="text-sm text-gray-800">{item.name}</div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-violet-600" />
                <h3 className="font-semibold">관련 자료</h3>
              </div>

              <div className="space-y-3">
                {knowledgeItems.length === 0 ? (
                  <div className="rounded-2xl bg-gray-50 border border-gray-200 px-4 py-4 text-sm text-gray-500">
                    저장된 관련 자료가 없습니다.
                  </div>
                ) : (
                  knowledgeItems.map((item) => (
                    <div key={item.id} className="rounded-2xl bg-gray-50 border border-gray-200 px-4 py-4">
                      <div className="text-xs text-violet-700 font-medium mb-1">{item.kindLabel}</div>
                      <div className="text-sm text-gray-800">{item.name}</div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-violet-600" />
                <h3 className="font-semibold">회의 후 녹음본</h3>
              </div>

              <div className="space-y-3">
                {afterMeetingItems.length === 0 ? (
                  <div className="rounded-2xl bg-gray-50 border border-gray-200 px-4 py-4 text-sm text-gray-500">
                    회의가 종료되면 여기에 최종 기록이 정리됩니다.
                  </div>
                ) : (
                  afterMeetingItems.map((item) => (
                    <div key={item.id} className="rounded-2xl bg-gray-50 border border-gray-200 px-4 py-4">
                      <div className="text-xs text-violet-700 font-medium mb-1">{item.kindLabel}</div>
                      <div className="text-sm text-gray-800 whitespace-pre-wrap leading-6">{item.previewLine}</div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  )
}