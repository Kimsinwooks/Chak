import React from 'react'
import {
  BarChart3,
  Calendar,
  CheckSquare,
  FileAudio,
  MessageCircle,
  Radio,
} from 'lucide-react'

export default function Sidebar({ activeView, setActiveView }) {
  const items = [
    { key: 'prep', label: '실시간 회의 준비', icon: Radio },
    { key: 'chat', label: '팀 / 개인 채팅', icon: MessageCircle },
    { key: 'stt', label: '회의 기록 / STT 보관함', icon: FileAudio },
    { key: 'analysis', label: '회의 분석', icon: BarChart3 },
    { key: 'todo', label: 'To-Do / 일정 추천', icon: CheckSquare },
    { key: 'calendar', label: '캘린더', icon: Calendar },
  ]

  return (
    <aside className="w-[332px] bg-white border-r border-gray-200 flex flex-col">
      <div className="h-[100px] px-4 flex items-center border-b border-gray-200">
        <div className="text-4xl font-black tracking-tight">
          Workspace<span className="text-blue-600">.</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-2">
        {items.map((item) => {
          const Icon = item.icon
          const active = activeView === item.key

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveView(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition ${
                active
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}