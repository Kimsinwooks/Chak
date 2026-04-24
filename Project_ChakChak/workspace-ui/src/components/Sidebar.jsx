import React, { useState } from 'react'
import {
  Hash,
  Settings,
  Sparkles,
  CheckSquare,
  FileText,
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ClipboardList,
  Mic,
  Network,
} from 'lucide-react'
import clsx from 'clsx'

export default function Sidebar({
  channels,
  activeChannelId,
  activeView,
  onSelectChannel,
  onSelectNote,
  onSelectMeetingPrep,
  onSelectMeetingArchive,
  onSelectCalendar,
  onSelectMindmap,
}) {
  const [isOpen, setIsOpen] = useState(true)

  const navButtonClass = (isActive) =>
    clsx(
      'w-full flex items-center py-2 text-[14px] font-medium transition-all rounded-lg group',
      isOpen ? 'px-3' : 'justify-center',
      isActive
        ? 'bg-white text-blue-700 shadow-sm border border-gray-200/80'
        : 'text-gray-600 hover:bg-white hover:text-blue-700 hover:shadow-sm hover:border-gray-200/80 border border-transparent'
    )

  return (
    <aside
      className={clsx(
        'h-full bg-[#f6f7fb] border-r border-gray-200 flex flex-col relative transition-all duration-300',
        isOpen ? 'w-[280px]' : 'w-[76px]'
      )}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -right-3 top-8 bg-white border border-gray-200 rounded-full p-1.5 shadow-md hover:bg-gray-50 hover:shadow-lg z-50 text-gray-500 transition-all hover:scale-110"
        title={isOpen ? '사이드바 숨기기' : '사이드바 열기'}
      >
        {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      <div className="px-5 py-5 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow">
            <Hash className="w-5 h-5" />
          </div>
          {isOpen && (
            <div className="text-[28px] font-black tracking-tight text-gray-900">
              Workspace.
            </div>
          )}
        </div>
      </div>

      <div className={clsx('px-4 py-4 space-y-3', !isOpen && 'px-3')}>
        <button
          onClick={() => onSelectMeetingPrep?.()}
          className={clsx(
            'w-full rounded-xl bg-blue-600 text-white font-semibold py-3 flex items-center justify-center shadow hover:bg-blue-700 transition',
            !isOpen && 'px-0'
          )}
          title="실시간 회의 준비"
        >
          <Mic className="w-4 h-4" />
          {isOpen && <span className="ml-2">실시간 회의 준비</span>}
        </button>

        <button
          onClick={() => onSelectMeetingArchive?.()}
          className={clsx(
            'w-full rounded-xl bg-violet-600 text-white font-semibold py-3 flex items-center justify-center shadow hover:bg-violet-700 transition',
            !isOpen && 'px-0'
          )}
          title="회의 기록 / STT 보관함"
        >
          <ClipboardList className="w-4 h-4" />
          {isOpen && <span className="ml-2">회의 기록 / STT 보관함</span>}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="mt-2">
          {isOpen && (
            <div className="text-[12px] font-bold tracking-wide text-gray-400 mb-2 px-2">
              CHANNELS
            </div>
          )}

          <div className="space-y-1">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => onSelectChannel?.(channel.id)}
                title={channel.name}
                className={navButtonClass(activeView === 'channel' && activeChannelId === channel.id)}
              >
                {channel.icon === 'Sparkles' ? (
                  <Sparkles className="w-4 h-4 shrink-0" />
                ) : (
                  <Hash className="w-4 h-4 shrink-0" />
                )}
                {isOpen && <span className="ml-2 truncate">{channel.name}</span>}
              </button>
            ))}

            <button
              onClick={() => onSelectCalendar?.()}
              title="캘린더"
              className={navButtonClass(activeView === 'calendar')}
            >
              <CalendarDays className="w-4 h-4 shrink-0" />
              {isOpen && <span className="ml-2">캘린더</span>}
            </button>

            <button
              onClick={() => onSelectMeetingArchive?.()}
              title="회의록"
              className={navButtonClass(activeView === 'meeting_archive')}
            >
              <FileText className="w-4 h-4 shrink-0" />
              {isOpen && <span className="ml-2">회의록</span>}
            </button>

            <button
              onClick={() => onSelectMindmap?.()}
              title="마인드맵"
              className={navButtonClass(activeView === 'mindmap')}
            >
              <Network className="w-4 h-4 shrink-0" />
              {isOpen && <span className="ml-2">마인드맵</span>}
            </button>
          </div>
        </div>

        <div className="mt-8">
          {isOpen ? (
            <div className="flex items-center justify-between px-2 mb-2">
              <div className="text-[12px] font-bold tracking-wide text-gray-400">
                MY TASKS (AI)
              </div>
              <span className="text-xs rounded-full px-2 py-0.5 bg-red-50 text-red-500 border border-red-100">
                2
              </span>
            </div>
          ) : (
            <div className="flex justify-center mb-2">
              <span className="text-xs rounded-full px-2 py-0.5 bg-red-50 text-red-500 border border-red-100">
                2
              </span>
            </div>
          )}

          <div className="space-y-2">
            <div
              className={clsx(
                'rounded-xl border border-gray-200 bg-white shadow-sm',
                isOpen ? 'px-3 py-3' : 'p-3 flex justify-center'
              )}
            >
              <div className="flex items-start gap-2">
                <CheckSquare className="w-4 h-4 mt-0.5 text-violet-500 shrink-0" />
                {isOpen && <div className="text-sm text-gray-700 leading-6">논문 리뷰</div>}
              </div>
            </div>

            <div
              className={clsx(
                'rounded-xl border border-gray-200 bg-white shadow-sm',
                isOpen ? 'px-3 py-3' : 'p-3 flex justify-center'
              )}
            >
              <div className="flex items-start gap-2">
                <CheckSquare className="w-4 h-4 mt-0.5 text-violet-500 shrink-0" />
                {isOpen && <div className="text-sm text-gray-700 leading-6">DB 스키마 설계</div>}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          {isOpen && (
            <div className="flex items-center justify-between px-2 mb-2">
              <div className="text-[12px] font-bold tracking-wide text-gray-400">
                PRIVATE NOTES
              </div>
              <button
                onClick={() => onSelectNote?.('new')}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-200"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="space-y-1">
            <button
              onClick={() => onSelectNote?.('note_1')}
              className={clsx(
                'w-full flex items-center py-2 text-[13px] font-medium text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm hover:border-gray-200/80 border border-transparent rounded-lg transition-all group',
                isOpen ? 'px-3' : 'justify-center'
              )}
            >
              <FileText className="w-4 h-4 shrink-0" />
              {isOpen && <span className="ml-2 truncate">3/28 회의 요약본</span>}
            </button>

            <button
              onClick={() => onSelectNote?.('note_2')}
              className={clsx(
                'w-full flex items-center py-2 text-[13px] font-medium text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm hover:border-gray-200/80 border border-transparent rounded-lg transition-all group',
                isOpen ? 'px-3' : 'justify-center'
              )}
            >
              <FileText className="w-4 h-4 shrink-0" />
              {isOpen && <span className="ml-2 truncate">캡스톤 아이디어 스케치</span>}
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 px-4 py-4">
        <div
          className={clsx(
            'flex items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm',
            isOpen ? 'px-3 py-3' : 'p-3 justify-center'
          )}
        >
          <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold shrink-0">
            나
          </div>
          {isOpen && (
            <>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900">나 (User)</div>
                <div className="text-xs text-green-600">Online</div>
              </div>
              <Settings className="w-4 h-4 ml-auto text-gray-400" />
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
