import React, { useEffect, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { generateMindmap } from "../services/mindmapService";
import { fetchQueryTestResult, buildTextFromAIInput } from "../services/aiService";

export default function Mindmap({ text }) {
  const [data, setData] = useState({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        let sourceText = text;

        // 전달된 텍스트가 비어 있으면, 백엔드의 query_test 데이터를 불러와 사용
        if (!sourceText || sourceText.trim() === '') {
          const queryResult = await fetchQueryTestResult(1); 
          sourceText = buildTextFromAIInput(queryResult.ai_input);
        }

        // 그래도 텍스트가 비어 있으면(데이터가 없으면) 중단
        if (!sourceText || sourceText.trim() === '') {
          setIsLoading(false);
          return;
        }

        const graph = await generateMindmap(sourceText);
        if (graph && graph.nodes) {
          setData({
            nodes: graph.nodes,
            links: graph.edges.map(e => ({
              source: e.source,
              target: e.target,
              value: e.weight
            }))
          });
        }
      } catch (err) {
        console.error("Mindmap generation error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [text]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-white text-gray-500 rounded-xl">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-medium animate-pulse">마인드맵 구조를 분석하고 있습니다...</p>
      </div>
    );
  }

  if (data.nodes.length === 0) {
     return (
       <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-sm rounded-xl">
         충분한 텍스트가 없거나 마인드맵을 생성할 수 없습니다.
       </div>
     );
  }

  return (
    <ForceGraph2D
      graphData={data}
      nodeLabel={node => `${node.id}\n${node.summary}`}
      nodeAutoColorBy="group"
      linkWidth={link => link.value}
    />
  );
}