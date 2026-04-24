import React, { useEffect, useMemo, useState } from 'react'
import { Bot, Clock, FileText, Network, RefreshCw, Sparkles } from 'lucide-react'
import { getMeetingReport } from '../services/meetingReportService'
import Mindmap from './Mindmap'

function formatSec(sec = 0) {
  sec = Math.max(0, Math.floor(sec))
  const hh = Math.floor(sec / 3600)
  const mm = Math.floor((sec % 3600) / 60)
  const ss = sec % 60
  if (hh > 0) return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

const palette = [
  'bg-violet-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-indigo-500',
]

export default function MeetingReportView({ sessionId: externalSessionId }) {
  const [sessionId, setSessionId] = useState(externalSessionId || '')
  const [report, setReport] = useState(null)
  const [activeBlockId, setActiveBlockId] = useState(null)
  const [selectedBlock, setSelectedBlock] = useState(null)
  const [selectedAiEvent, setSelectedAiEvent] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorText, setErrorText] = useState('')

  const totalSec = report?.totalSec || 1

  const activeBlock = useMemo(() => {
    if (!report?.topicBlocks?.length) return null
    return report.topicBlocks.find((block) => block.id === activeBlockId) || selectedBlock
  }, [report, activeBlockId, selectedBlock])

  const fetchReport = async () => {
    if (!sessionId) {
      setErrorText('sessionId가 필요합니다. 회의 종료 후 세션 ID를 입력하세요.')
      return
    }

    setIsLoading(true)
    setErrorText('')

    try {
      const data = await getMeetingReport(sessionId)
      setReport(data)
      setSelectedBlock(data.topicBlocks?.[0] || null)
    } catch (error) {
      console.error(error)
      setErrorText(error.message || '회의 분석 리포트 로딩 실패')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (externalSessionId) {
      setSessionId(externalSessionId)
    }
  }, [externalSessionId])

  useEffect(() => {
    if (sessionId) {
      fetchReport()
    }
  }, [sessionId])

  return (
    <div className="flex-1 overflow-hidden bg-[#f7f8fb]">
      <div className="h-full flex flex-col">
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900">회의 분석 리포트</h1>
            <p className="text-sm text-gray-500 mt-1">
              회의 STT를 주제별 progress bar로 나누고, AI 사용 시점을 함께 표시합니다.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="sessionId 입력"
              className="w-[360px] h-11 rounded-2xl border border-gray-200 px-4 text-sm"
            />
            <button
              onClick={fetchReport}
              disabled={isLoading}
              className="h-11 px-4 rounded-2xl bg-gray-900 text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              분석 불러오기
            </button>
          </div>
        </header>

        {errorText && (
          <div className="mx-8 mt-4 rounded-2xl bg-red-50 text-red-600 px-5 py-4 text-sm">
            {errorText}
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-8 space-y-6">
          {!report ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              회의 세션을 선택하거나 sessionId를 입력하면 분석 리포트가 표시됩니다.
            </div>
          ) : (
            <>
              <section className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm text-violet-600 font-semibold">회의 제목</div>
                    <h2 className="text-2xl font-bold text-gray-900 mt-1">
                      {report.session?.title || '회의'}
                    </h2>
                    <div className="text-sm text-gray-500 mt-2">
                      총 길이 {formatSec(totalSec)} · 주제 블록 {report.topicBlocks?.length || 0}개 · AI 사용 {report.aiEvents?.length || 0}회
                    </div>
                  </div>
                  <div className="rounded-2xl bg-violet-50 text-violet-700 px-4 py-3 text-sm font-medium">
                    {report.session?.meetingType || 'meeting'}
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-700">회의 Progress Bar</span>
                  </div>

                  <div className="relative h-16 rounded-2xl bg-gray-100 overflow-hidden border border-gray-200">
                    {report.topicBlocks.map((block, idx) => {
                      const left = (block.startSec / totalSec) * 100
                      const width = Math.max(2, ((block.endSec - block.startSec) / totalSec) * 100)
                      const active = activeBlockId === block.id || selectedBlock?.id === block.id

                      return (
                        <button
                          key={block.id}
                          onMouseEnter={() => setActiveBlockId(block.id)}
                          onMouseLeave={() => setActiveBlockId(null)}
                          onClick={() => {
                            setSelectedBlock(block)
                            setSelectedAiEvent(null)
                          }}
                          className={`absolute top-0 h-full ${palette[idx % palette.length]} transition-all ${
                            active ? 'brightness-110 scale-y-105 z-10 ring-4 ring-black/10' : 'opacity-90 hover:opacity-100'
                          }`}
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                          }}
                          title={`${block.start}~${block.end} ${block.topic}`}
                        >
                          <div className="h-full flex flex-col items-start justify-center text-left px-3 text-white overflow-hidden">
                            <div className="text-xs font-bold truncate w-full">{block.topic}</div>
                            <div className="text-[11px] opacity-90 truncate w-full">{block.start}~{block.end}</div>
                          </div>
                        </button>
                      )
                    })}

                    {report.aiEvents.map((event) => {
                      const left = (event.askedAtSec / totalSec) * 100
                      return (
                        <button
                          key={event.id}
                          onMouseEnter={() => setSelectedAiEvent(event)}
                          onClick={() => setSelectedAiEvent(event)}
                          className="absolute top-0 bottom-0 w-[3px] bg-black z-20 hover:w-[5px] transition-all"
                          style={{ left: `${left}%` }}
                          title={`AI 질문 [${event.askedAt}] ${event.question}`}
                        >
                          <span className="absolute -top-1 -left-2 w-5 h-5 rounded-full bg-black text-white flex items-center justify-center">
                            <Bot className="w-3 h-3" />
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  <div className="mt-3 text-xs text-gray-500">
                    주제 블록에 마우스를 올리면 해당 주제의 키워드와 요약이 강조됩니다. 검은 세로선은 AI 질문 시점입니다.
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)] gap-6">
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-violet-600" />
                    <h3 className="text-lg font-bold text-gray-900">선택 주제 상세</h3>
                  </div>

                  {activeBlock ? (
                    <div>
                      <div className="text-sm text-violet-600 font-semibold">
                        [{activeBlock.start}~{activeBlock.end}]
                      </div>
                      <h4 className="text-2xl font-black text-gray-900 mt-1">
                        {activeBlock.topic}
                      </h4>
                      <p className="text-sm text-gray-700 leading-7 mt-4">
                        {activeBlock.summary}
                      </p>

                      <div className="mt-5">
                        <div className="text-sm font-semibold text-gray-700 mb-2">키워드</div>
                        <div className="flex flex-wrap gap-2">
                          {(activeBlock.keywords || []).map((kw) => (
                            <span key={kw} className="px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 text-sm">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-6">
                        <div className="text-sm font-semibold text-gray-700 mb-2">해당 구간 원문</div>
                        <div className="max-h-52 overflow-y-auto rounded-2xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-700 leading-7">
                          {activeBlock.text}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-400">선택된 주제 블록이 없습니다.</div>
                  )}
                </div>

                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Bot className="w-5 h-5 text-gray-800" />
                    <h3 className="text-lg font-bold text-gray-900">AI 사용 시점</h3>
                  </div>

                  {selectedAiEvent ? (
                    <div>
                      <div className="text-sm text-gray-500">[{selectedAiEvent.askedAt}]</div>
                      <div className="mt-3 rounded-2xl bg-gray-50 border border-gray-200 p-4">
                        <div className="text-xs font-bold text-gray-400 mb-1">질문</div>
                        <div className="text-sm text-gray-900 leading-6">{selectedAiEvent.question}</div>
                      </div>
                      <div className="mt-3 rounded-2xl bg-violet-50 border border-violet-100 p-4">
                        <div className="text-xs font-bold text-violet-500 mb-1">AI 응답</div>
                        <div className="text-sm text-gray-800 leading-6 whitespace-pre-wrap">{selectedAiEvent.answer || '응답 기록 없음'}</div>
                      </div>
                    </div>
                  ) : report.aiEvents.length === 0 ? (
                    <div className="text-sm text-gray-400">기록된 AI 질문이 없습니다.</div>
                  ) : (
                    <div className="space-y-3">
                      {report.aiEvents.map((event) => (
                        <button
                          key={event.id}
                          onClick={() => setSelectedAiEvent(event)}
                          className="w-full text-left rounded-2xl border border-gray-200 hover:border-violet-300 hover:bg-violet-50 p-4 transition"
                        >
                          <div className="text-xs text-violet-600 font-semibold">[{event.askedAt}]</div>
                          <div className="text-sm text-gray-800 mt-1 line-clamp-2">{event.question}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-gray-900">회의록 자동 정리</h3>
                  </div>
                  <pre className="whitespace-pre-wrap text-sm leading-7 text-gray-700 bg-gray-50 rounded-2xl border border-gray-200 p-4 max-h-[460px] overflow-y-auto">
                    {report.minutesMarkdown}
                  </pre>
                </div>

                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
                    <Network className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-lg font-bold text-gray-900">주제 흐름 마인드맵</h3>
                  </div>
                  <div className="h-[520px]">
                    <Mindmap text={report.mindmapText} />
                  </div>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
