import React, { useEffect, useState } from 'react'
import { BarChart3, Eye, FileAudio, FileText, FolderOpen, Upload } from 'lucide-react'
import {
  getGlobalLibraryTree,
  uploadGlobalKnowledgeFile,
} from '../services/realtimeMeetingService'
import {
  getMeetingTranscript,
  uploadAudioForMeetingReport,
} from '../services/meetingReportService'

export default function STTWorkspace({ onOpenMeetingReport }) {
  const [tree, setTree] = useState(null)
  const [knowledgeFile, setKnowledgeFile] = useState(null)
  const [audioFile, setAudioFile] = useState(null)
  const [sttModel, setSttModel] = useState('medium')
  const [language, setLanguage] = useState('ko')
  const [isUploadingKnowledge, setIsUploadingKnowledge] = useState(false)
  const [isUploadingAudio, setIsUploadingAudio] = useState(false)
  const [message, setMessage] = useState('')
  const [recentSessions, setRecentSessions] = useState([])
  const [selectedTranscript, setSelectedTranscript] = useState(null)

  const refreshTree = async () => {
    try {
      const data = await getGlobalLibraryTree()
      setTree(data)
    } catch (error) {
      console.error(error)
      setMessage(error.message || '자료함을 불러오지 못했습니다.')
    }
  }

  useEffect(() => {
    refreshTree()
  }, [])

  const handleKnowledgeUpload = async () => {
    if (!knowledgeFile) {
      setMessage('공통 참고 문서를 선택하세요.')
      return
    }

    setIsUploadingKnowledge(true)
    setMessage('')

    try {
      await uploadGlobalKnowledgeFile(knowledgeFile)
      setKnowledgeFile(null)
      setMessage('공통 참고 문서 업로드 완료')
      await refreshTree()
    } catch (error) {
      console.error(error)
      setMessage(error.message || '공통 참고 문서 업로드 실패')
    } finally {
      setIsUploadingKnowledge(false)
    }
  }

  const handleAudioUpload = async () => {
    if (!audioFile) {
      setMessage('회의 녹음 음성파일을 선택하세요.')
      return
    }

    setIsUploadingAudio(true)
    setSelectedTranscript(null)
    setMessage(`STT 변환 및 SLM 회의 분석 중입니다. 선택 모델: ${sttModel}`)

    try {
      const result = await uploadAudioForMeetingReport(audioFile, { sttModel, language })
      setAudioFile(null)
      setMessage(`완료. sessionId=${result.sessionId}`)

      const newSession = {
        id: result.sessionId,
        title: result.filename,
        sttModel: result.sttModel,
        language: result.language,
        transcriptPreview: result.transcriptPreview,
      }

      setRecentSessions((prev) => [newSession, ...prev])
      await refreshTree()

      if (onOpenMeetingReport) {
        onOpenMeetingReport(result.sessionId)
      }
    } catch (error) {
      console.error(error)
      setMessage(error.message || '음성파일 업로드/STT 변환 실패')
    } finally {
      setIsUploadingAudio(false)
    }
  }

  const handleViewTranscript = async (sessionId) => {
    try {
      const data = await getMeetingTranscript(sessionId)
      setSelectedTranscript(data)
    } catch (error) {
      console.error(error)
      setMessage(error.message || 'STT transcript 로딩 실패')
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#f7f8fb]">
      <div className="max-w-6xl mx-auto px-8 py-10">
        <h1 className="text-3xl font-black text-gray-900">STT / 자료 보관함</h1>
        <p className="text-sm text-gray-500 mt-2">
          회의 중 녹음본, 회의 후 녹음본, 일반 업로드 문서를 분리해서 봅니다.
          음성파일을 업로드하면 STT 후 회의 분석 Progress Bar로 연결됩니다.
        </p>

        {message && (
          <div className="mt-5 rounded-2xl bg-violet-50 text-violet-700 px-5 py-4 text-sm">
            {message}
          </div>
        )}

        <section className="mt-8 grid grid-cols-2 gap-6">
          <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-3">
              <Upload className="w-5 h-5 text-violet-600" />
              <div>
                <h2 className="text-lg font-bold text-gray-900">공통 참고 문서 업로드</h2>
                <p className="text-sm text-gray-500">
                  평소 SLM과 실시간 회의용 SLM이 함께 참고하는 공통 문서 저장소입니다.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <input
                type="file"
                accept=".txt,.json,.pdf,.docx,.hwp"
                onChange={(e) => setKnowledgeFile(e.target.files?.[0] || null)}
                className="block w-full text-sm"
              />
              <div className="text-sm text-gray-700">
                {knowledgeFile ? knowledgeFile.name : '선택된 파일 없음'}
              </div>
              <button
                onClick={handleKnowledgeUpload}
                disabled={isUploadingKnowledge}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                업로드
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-3">
              <FileAudio className="w-5 h-5 text-blue-600" />
              <div>
                <h2 className="text-lg font-bold text-gray-900">회의 후 녹음파일 업로드</h2>
                <p className="text-sm text-gray-500">
                  이미 녹음된 파일을 올려 STT, 회의록, Progress Bar를 생성합니다.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <input
                type="file"
                accept="audio/*,video/*,.wav,.mp3,.m4a,.webm,.mp4,.aac,.ogg,.flac"
                onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                className="block w-full text-sm"
              />

              <div className="text-sm text-gray-700">
                {audioFile ? audioFile.name : '선택된 음성파일 없음'}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <div className="text-xs font-semibold text-gray-500 mb-1">STT 모델</div>
                  <select
                    value={sttModel}
                    onChange={(e) => setSttModel(e.target.value)}
                    className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm"
                  >
                    <option value="base">base 빠름/낮은 정확도</option>
                    <option value="small">small</option>
                    <option value="medium">medium 추천</option>
                    <option value="large-v3">large-v3 고정확도/느림</option>
                    <option value="large-v3-turbo">large-v3-turbo</option>
                  </select>
                </label>

                <label className="block">
                  <div className="text-xs font-semibold text-gray-500 mb-1">언어</div>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm"
                  >
                    <option value="ko">한국어</option>
                    <option value="en">영어</option>
                    <option value="">자동 감지</option>
                  </select>
                </label>
              </div>

              <button
                onClick={handleAudioUpload}
                disabled={isUploadingAudio}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                <BarChart3 className="w-4 h-4" />
                STT 후 회의 분석 생성
              </button>
            </div>
          </div>
        </section>

        {recentSessions.length > 0 && (
          <section className="mt-8 rounded-3xl bg-white border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">방금 변환한 회의 STT</h2>
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <div key={session.id} className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-gray-900">{session.title}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        sessionId={session.id} · STT={session.sttModel} · language={session.language || 'auto'}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewTranscript(session.id)}
                        className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm inline-flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        STT 보기
                      </button>
                      <button
                        onClick={() => onOpenMeetingReport?.(session.id)}
                        className="px-3 py-2 rounded-xl bg-blue-600 text-white text-sm inline-flex items-center gap-2"
                      >
                        <BarChart3 className="w-4 h-4" />
                        분석 보기
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-gray-600 line-clamp-3">
                    {session.transcriptPreview}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {selectedTranscript && (
          <section className="mt-8 rounded-3xl bg-white border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900">STT 변환 결과</h2>
            <p className="text-sm text-orange-600 mt-2">
              {selectedTranscript.diarizationNote}
            </p>
            <div className="mt-4 max-h-[420px] overflow-y-auto rounded-2xl bg-gray-50 border border-gray-200 p-4">
              {selectedTranscript.transcriptLines?.map((line, idx) => (
                <div key={idx} className="py-2 border-b border-gray-100 last:border-0">
                  <span className="text-xs font-bold text-violet-600">
                    [{line.start}~{line.end}]
                  </span>
                  <span className="ml-2 text-xs font-semibold text-gray-500">
                    {line.speaker}
                  </span>
                  <span className="ml-2 text-sm text-gray-800">
                    {line.text}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8 grid grid-cols-3 gap-6">
          <Panel title="회의 중 녹음본" icon={<FolderOpen className="w-5 h-5 text-violet-600" />} items={tree?.realtimeMeetings || []} empty="표시할 회의 중 녹음본이 없습니다." />
          <Panel title="회의 후 녹음본" icon={<FileAudio className="w-5 h-5 text-blue-600" />} items={tree?.postMeetingRecordings || []} empty="표시할 회의 후 녹음본이 없습니다." />
          <Panel title="업로드 문서" icon={<FileText className="w-5 h-5 text-violet-600" />} items={tree?.uploadedKnowledge || []} empty="표시할 업로드 문서가 없습니다." />
        </section>
      </div>
    </div>
  )
}

function Panel({ title, icon, items, empty }) {
  return (
    <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      </div>
      <List items={items} empty={empty} />
    </div>
  )
}

function List({ items, empty }) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-500">
        {empty}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3">
          <div className="text-sm font-semibold text-gray-800">
            {item.title || item.name}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {item.kindLabel || item.createdAt || ''}
          </div>
        </div>
      ))}
    </div>
  )
}
