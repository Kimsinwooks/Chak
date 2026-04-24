import React, { useMemo, useRef, useState } from 'react'
import {
  Mic,
  FileText,
  Clock,
  Key,
  Upload,
  ToggleLeft,
  ToggleRight,
  FolderOpen,
} from 'lucide-react'
import {
  createMeetingSession,
  uploadMeetingPlanFile,
  uploadKnowledgeFile,
} from '../services/realtimeMeetingService'

function KeywordTags({ keywordsString }) {
  const keywordArray = useMemo(() => {
    if (!keywordsString) return []
    return keywordsString
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
  }, [keywordsString])

  if (keywordArray.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {keywordArray.map((keyword, index) => (
        <span
          key={`${keyword}-${index}`}
          className="px-3 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700"
        >
          #{keyword}
        </span>
      ))}
    </div>
  )
}

const MEETING_TYPE_OPTIONS = [
  { value: 'brainstorming', label: '브레인스토밍 회의' },
  { value: 'status_update', label: '진행상황 공유 회의' },
  { value: 'decision_making', label: '의사결정 회의' },
  { value: 'research_discussion', label: '연구/아이디어 검토 회의' },
  { value: 'retrospective', label: '회고/피드백 회의' },
]

export default function MeetingRoomPrep({ onStartMeeting }) {
  const [selectedPlanFile, setSelectedPlanFile] = useState(null)
  const [selectedKnowledgeFiles, setSelectedKnowledgeFiles] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [planData, setPlanData] = useState({
    title: '',
    time: '',
    keywords: '',
    meetingType: 'brainstorming',
    realtimeRecordingEnabled: true,
  })

  const planInputRef = useRef(null)
  const knowledgeInputRef = useRef(null)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setPlanData((prev) => ({ ...prev, [name]: value }))
  }

  const handleToggleRealtime = () => {
    setPlanData((prev) => ({
      ...prev,
      realtimeRecordingEnabled: !prev.realtimeRecordingEnabled,
    }))
  }

  const handlePlanFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedPlanFile(file)
  }

  const handleKnowledgeFilesChange = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setSelectedKnowledgeFiles(files)
  }

  const validate = () => {
    if (!planData.title.trim()) {
      setErrorMessage('회의 제목을 입력해 주세요.')
      return false
    }
    if (!planData.time.trim()) {
      setErrorMessage('회의 시간 또는 일정을 입력해 주세요.')
      return false
    }
    setErrorMessage('')
    return true
  }

  const handleStart = async () => {
    if (!validate()) return

    try {
      setIsSubmitting(true)

      const created = await createMeetingSession({
        title: planData.title,
        meetingTime: planData.time,
        keywords: planData.keywords,
        meetingType: planData.meetingType,
        realtimeRecordingEnabled: planData.realtimeRecordingEnabled,
      })

      if (selectedPlanFile) {
        await uploadMeetingPlanFile(created.sessionId, selectedPlanFile)
      }

      if (selectedKnowledgeFiles.length > 0) {
        for (const file of selectedKnowledgeFiles) {
          await uploadKnowledgeFile(created.sessionId, file)
        }
      }

      onStartMeeting({
        ...planData,
        sessionId: created.sessionId,
        planFileName: selectedPlanFile?.name || null,
        knowledgeFiles: selectedKnowledgeFiles.map((f) => f.name),
      })
    } catch (error) {
      console.error(error)
      setErrorMessage(error.message || '회의 준비 정보를 저장하는 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#f7f8fa]">
      <div className="max-w-6xl mx-auto px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">실시간 회의 준비</h1>
          <p className="mt-2 text-gray-500">
            회의 종류, 계획서, 참고 문서를 먼저 넣고 시작하면 실시간 녹음·중간 요약·피드백이 같은 세션 안에서 관리됩니다.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <Mic className="w-6 h-6 text-violet-600" />
              <div>
                <h2 className="text-xl font-semibold">회의 기본 정보</h2>
                <p className="text-sm text-gray-500">
                  여기서 설정한 값은 실시간 회의용 SLM과 종료 후 기록 정리에 함께 사용됩니다.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">회의 종류</label>
                <select
                  name="meetingType"
                  value={planData.meetingType}
                  onChange={handleInputChange}
                  className="w-full h-12 rounded-2xl border border-gray-200 px-4 bg-white text-sm"
                >
                  {MEETING_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">회의 제목</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    name="title"
                    value={planData.title}
                    onChange={handleInputChange}
                    placeholder="예: 캡스톤 UI 개편 회의"
                    className="w-full h-12 rounded-2xl border border-gray-200 pl-11 pr-4 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">회의 시간 / 일정</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    name="time"
                    value={planData.time}
                    onChange={handleInputChange}
                    placeholder="예: 15:00 ~ 16:00"
                    className="w-full h-12 rounded-2xl border border-gray-200 pl-11 pr-4 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">키워드</label>
                <div className="relative">
                  <Key className="absolute left-4 top-4 w-4 h-4 text-gray-400" />
                  <textarea
                    name="keywords"
                    value={planData.keywords}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="예: 실시간회의, VAD, Whisper, RAG"
                    className="w-full rounded-2xl border border-gray-200 pl-11 pr-4 py-3 text-sm resize-none"
                  />
                </div>
                <KeywordTags keywordsString={planData.keywords} />
              </div>

              <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-violet-800">실시간 녹음 사용</p>
                    <p className="text-sm text-violet-700 mt-1">
                      켜면 회의 시작 후 브라우저 마이크를 받아 Whisper-fast + VAD 기반 실시간 기록을 만듭니다.
                    </p>
                  </div>
                  <button type="button" onClick={handleToggleRealtime} className="shrink-0">
                    {planData.realtimeRecordingEnabled ? (
                      <ToggleRight className="w-10 h-10 text-violet-600" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <Upload className="w-5 h-5 text-violet-600" />
                <div>
                  <h2 className="text-lg font-semibold">회의 계획서</h2>
                  <p className="text-sm text-gray-500">
                    실시간 회의를 쓰면 계획서는 일단 STT 세션 자료함에 같이 저장됩니다.
                  </p>
                </div>
              </div>

              <input
                ref={planInputRef}
                type="file"
                accept=".pdf,.txt,.docx,.hwp"
                className="hidden"
                onChange={handlePlanFileChange}
              />

              <button
                type="button"
                onClick={() => planInputRef.current?.click()}
                className="w-full h-12 rounded-2xl border border-dashed border-gray-300 bg-gray-50 text-sm font-medium hover:bg-gray-100"
              >
                계획서 파일 선택
              </button>

              {selectedPlanFile && (
                <div className="mt-3 rounded-2xl bg-violet-50 px-4 py-3 text-sm text-violet-700">
                  선택됨: {selectedPlanFile.name}
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <FolderOpen className="w-5 h-5 text-violet-600" />
                <div>
                  <h2 className="text-lg font-semibold">추가 참고 자료</h2>
                  <p className="text-sm text-gray-500">
                    PDF, TXT, HWP, DOCX, 기존 STT 파일 등은 평소 SLM과 실시간 회의용 SLM이 함께 참고합니다.
                  </p>
                </div>
              </div>

              <input
                ref={knowledgeInputRef}
                type="file"
                accept=".pdf,.txt,.docx,.hwp,.json"
                multiple
                className="hidden"
                onChange={handleKnowledgeFilesChange}
              />

              <button
                type="button"
                onClick={() => knowledgeInputRef.current?.click()}
                className="w-full h-12 rounded-2xl border border-dashed border-gray-300 bg-gray-50 text-sm font-medium hover:bg-gray-100"
              >
                참고 문서 추가
              </button>

              {selectedKnowledgeFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {selectedKnowledgeFiles.map((file) => (
                    <div
                      key={`${file.name}-${file.size}`}
                      className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700"
                    >
                      {file.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
              {errorMessage && (
                <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {errorMessage}
                </div>
              )}

              <button
                type="button"
                onClick={handleStart}
                disabled={isSubmitting}
                className="w-full h-12 rounded-2xl bg-violet-600 text-white font-semibold hover:bg-violet-700 transition disabled:opacity-50"
              >
                {isSubmitting ? '회의 세션 준비 중...' : '회의 시작'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}