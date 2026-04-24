import React, { useEffect, useState } from 'react'
import {
  getGlobalLibraryTree,
  uploadGlobalKnowledgeFile,
} from '../services/realtimeMeetingService'
import { FileAudio, FolderTree, Upload } from 'lucide-react'

export default function STTWorkspace() {
  const [tree, setTree] = useState({
    realtimeMeetings: [],
    postMeetingRecordings: [],
    uploadedKnowledge: [],
  })
  const [selectedFiles, setSelectedFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)

  const loadTree = async () => {
    try {
      const data = await getGlobalLibraryTree()
      setTree(data)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    loadTree()
  }, [])

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return
    try {
      setIsUploading(true)
      for (const file of selectedFiles) {
        await uploadGlobalKnowledgeFile(file)
      }
      setSelectedFiles([])
      await loadTree()
    } catch (error) {
      console.error(error)
      alert('파일 업로드 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#f7f8fa]">
      <div className="max-w-6xl mx-auto px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">STT / 자료 보관함</h1>
          <p className="mt-2 text-gray-500">
            회의 중 녹음본, 회의 후 녹음본, 일반 업로드 문서를 분리해서 봅니다.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Upload className="w-5 h-5 text-violet-600" />
            <div>
              <h2 className="text-lg font-semibold">공통 참고 문서 업로드</h2>
              <p className="text-sm text-gray-500">
                평소 SLM과 실시간 회의용 SLM이 함께 참고하는 공통 문서 저장소입니다.
              </p>
            </div>
          </div>

          <input
            type="file"
            accept=".pdf,.txt,.docx,.hwp,.json"
            multiple
            onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
            className="block w-full text-sm"
          />

          {selectedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              {selectedFiles.map((file) => (
                <div key={`${file.name}-${file.size}`} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm">
                  {file.name}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={isUploading || selectedFiles.length === 0}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-violet-600 text-white text-sm font-medium disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {isUploading ? '업로드 중...' : '업로드'}
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <section className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <FolderTree className="w-5 h-5 text-violet-600" />
              <h2 className="text-lg font-semibold">회의 중 녹음본</h2>
            </div>
            <div className="space-y-3">
              {tree.realtimeMeetings?.length ? (
                tree.realtimeMeetings.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-gray-50 px-4 py-4 text-sm">
                    <div className="font-medium text-gray-900">{item.title}</div>
                    <div className="text-gray-500 mt-1">{item.createdAt}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-500">
                  표시할 회의 중 녹음본이 없습니다.
                </div>
              )}
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileAudio className="w-5 h-5 text-violet-600" />
              <h2 className="text-lg font-semibold">회의 후 녹음본</h2>
            </div>
            <div className="space-y-3">
              {tree.postMeetingRecordings?.length ? (
                tree.postMeetingRecordings.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-gray-50 px-4 py-4 text-sm">
                    <div className="font-medium text-gray-900">{item.title}</div>
                    <div className="text-gray-500 mt-1">{item.createdAt}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-500">
                  표시할 회의 후 녹음본이 없습니다.
                </div>
              )}
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Upload className="w-5 h-5 text-violet-600" />
              <h2 className="text-lg font-semibold">업로드 문서</h2>
            </div>
            <div className="space-y-3">
              {tree.uploadedKnowledge?.length ? (
                tree.uploadedKnowledge.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-gray-50 px-4 py-4 text-sm">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-gray-500 mt-1">{item.kindLabel}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-500">
                  표시할 업로드 문서가 없습니다.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}