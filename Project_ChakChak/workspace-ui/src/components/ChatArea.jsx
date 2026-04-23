import React, { useState, useRef, useEffect } from 'react';
import { Send, Hash, PanelRightClose, PanelRightOpen, UserCircle } from 'lucide-react';
import { supabase } from '../services/supabaseUse'; 

export default function ChatArea({ 
  activeChannel, 
  messages, 
  onSendMessage, 
  onToggleInsight, 
  isInsightOpen, 
  // 요약 관련 props 제거 (더 이상 사용하지 않음)
  currentUser,
  setCurrentUser,
  userList
}) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      const message = inputText.trim();
      
      // App.jsx의 handleSendMessage를 실행 (이름도 함께 전달)
      onSendMessage(message, currentUser); 
      setInputText('');

      // Supabase 저장
      try {
        const { error } = await supabase
          .from('meeting_logs')
          .insert([{ speaker: currentUser, content: message }]);

        if (error) {
          console.error("Supabase 저장 실패:", error.message);
        } else {
          console.log(`${currentUser}의 메시지 저장 완료!`);
        }
      } catch (err) {
        console.error("연결 오류:", err);
      }
    }
  };

  // 💡 불필요해진 handleAiSummary 함수 삭제 완료

  const formatTime = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10 shadow-sm">
        <div className="flex items-center">
          <Hash className="h-6 w-6 text-gray-400 mr-2" />
          <h2 className="text-xl font-semibold text-gray-800">{activeChannel?.name || 'Channel'}</h2>
        </div>
        <button onClick={onToggleInsight} className="p-2 rounded-md text-gray-500 hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200">
          {isInsightOpen ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 ? (
           <div className="h-full flex items-center justify-center flex-col text-gray-400">
             <Hash className="h-12 w-12 mb-3 opacity-20" />
             <p className="text-sm">대화를 시작해보세요.</p>
           </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex space-x-3 group">
              <div className="flex-shrink-0 mt-1">
                <img className="h-10 w-10 rounded-full bg-gray-200 object-cover border border-gray-100" src={`https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender)}&background=random`} alt="" />
              </div>
              <div>
                <div className="flex items-baseline mb-1">
                  <span className="text-[15px] font-bold text-gray-900 mr-2">{msg.sender}</span>
                  <span className="text-xs text-gray-500">{formatTime(msg.timestamp)}</span>
                </div>
                <p className="text-[15px] text-gray-800 leading-relaxed bg-gray-50/50 rounded-2xl rounded-tl-none py-2.5 px-4 border border-gray-100 shadow-sm whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-4 bg-white border-t border-gray-100">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2 max-w-5xl mx-auto">
          
          {/* 💡 여기에 있던 AI 요약 버튼 삭제 완료 */}
          
          {/* 사용자 선택 드롭다운 */}
          <div className="flex items-center bg-gray-50 border border-gray-300 rounded-xl px-2">
            <UserCircle className="h-4 w-4 text-gray-400 ml-1" />
            <select 
              value={currentUser} 
              onChange={(e) => setCurrentUser(e.target.value)}
              className="bg-transparent py-3 px-1 text-sm font-medium text-gray-700 outline-none cursor-pointer"
            >
              {userList.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>
          
          {/* 메시지 입력창 */}
          <div className="flex-1 bg-gray-50 border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 transition-all">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="block w-full py-3 px-4 bg-transparent outline-none"
              placeholder={`${currentUser} 이름으로 메시지 보내기...`}
            />
          </div>
          
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}