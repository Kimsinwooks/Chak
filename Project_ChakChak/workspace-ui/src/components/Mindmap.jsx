import React, { useEffect, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { generateMindmap } from '../services/mindmapService'
import { fetchQueryTestResult, buildTextFromAIInput } from '../services/aiService'

export default function Mindmap({ text = '' }) {
  const [data, setData] = useState({ nodes: [], links: [] })
  const [inputText, setInputText] = useState(text)
  const [isLoading, setIsLoading] = useState(false)
  const [errorText, setErrorText] = useState('')

  const buildGraph = async (sourceText) => {
    setIsLoading(true)
    setErrorText('')

    try {
      let finalText = sourceText

      if (!finalText || finalText.trim() === '') {
        const queryResult = await fetchQueryTestResult(1)
        finalText = buildTextFromAIInput(queryResult?.ai_input || queryResult)
      }

      if (!finalText || finalText.trim() === '') {
        setData({ nodes: [], links: [] })
        setErrorText('마인드맵을 만들 텍스트가 없습니다.')
        return
      }

      const graph = await generateMindmap(finalText)

      if (!graph || !Array.isArray(graph.nodes)) {
        setData({ nodes: [], links: [] })
        setErrorText('마인드맵 결과 형식이 올바르지 않습니다.')
        return
      }

      const nodes = graph.nodes.map((node) => ({
        id: node.id || node.label || String(Math.random()),
        label: node.label || node.id || '',
        summary: node.summary || '',
        group: node.group || 'default',
      }))

      const links = (graph.edges || graph.links || []).map((edge) => ({
        source: edge.source,
        target: edge.target,
        value: edge.weight || edge.value || 1,
      }))

      setData({ nodes, links })
    } catch (err) {
      console.error('Mindmap generation error:', err)
      setErrorText(err.message || '마인드맵 생성 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (text && text.trim()) {
      setInputText(text)
      buildGraph(text)
    }
  }, [text])

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="text-lg font-bold text-gray-900">마인드맵 생성</div>
        <div className="text-sm text-gray-500 mt-1">
          회의록, STT, 메모 텍스트를 기반으로 핵심 주제 관계를 시각화합니다.
        </div>

        <div className="mt-4 flex gap-3">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="마인드맵으로 만들 텍스트를 입력하세요. 비워두면 백엔드 query-test 데이터 사용을 시도합니다."
            className="flex-1 min-h-[86px] rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            onClick={() => buildGraph(inputText)}
            disabled={isLoading}
            className="w-32 rounded-2xl bg-violet-600 text-white font-semibold disabled:opacity-50"
          >
            {isLoading ? '생성 중' : '생성'}
          </button>
        </div>

        {errorText && (
          <div className="mt-3 rounded-xl bg-red-50 text-red-600 px-4 py-3 text-sm">
            {errorText}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0">
        {data.nodes.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            충분한 텍스트가 없거나 마인드맵을 생성할 수 없습니다.
          </div>
        ) : (
          <ForceGraph2D
            graphData={data}
            nodeLabel={(node) => `${node.label || node.id}\n${node.summary || ''}`}
            nodeAutoColorBy="group"
            linkWidth={(link) => link.value || 1}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const label = node.label || node.id
              const fontSize = 12 / globalScale
              ctx.font = `${fontSize}px Sans-Serif`
              ctx.fillText(label, node.x + 6, node.y + 3)
            }}
          />
        )}
      </div>
    </div>
  )
}
