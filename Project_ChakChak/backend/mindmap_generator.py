import json
import re
from collections import Counter, defaultdict
from itertools import combinations

from sklearn.feature_extraction.text import TfidfVectorizer


# ---------------------------
# 1. 전처리
# ---------------------------
def preprocess(text):
    text = re.sub(r"[^가-힣a-zA-Z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


# ---------------------------
# 2. 키워드 추출 (TF-IDF)
# ---------------------------
def extract_keywords(text, top_k=10):
    vectorizer = TfidfVectorizer()
    X = vectorizer.fit_transform([text])
    scores = X.toarray()[0]
    terms = vectorizer.get_feature_names_out()

    term_scores = list(zip(terms, scores))
    term_scores.sort(key=lambda x: x[1], reverse=True)

    keywords = [t[0] for t in term_scores[:top_k]]
    return keywords


# ---------------------------
# 3. 문장 분리
# ---------------------------
def split_sentences(text):
    return re.split(r"[.!?\n]", text)


# ---------------------------
# 4. 관계 추출 (co-occurrence)
# ---------------------------
def build_edges(sentences, keywords):
    edge_weights = defaultdict(int)

    for sent in sentences:
        present = [k for k in keywords if k in sent]

        for k1, k2 in combinations(present, 2):
            edge_weights[(k1, k2)] += 1
            edge_weights[(k2, k1)] += 1

    edges = []
    for (k1, k2), w in edge_weights.items():
        if w > 0:
            edges.append({
                "source": k1,
                "target": k2,
                "weight": w
            })

    return edges


# ---------------------------
# 5. 중심 키워드 선택
# ---------------------------
def find_central_keyword(edges):
    degree = Counter()

    for e in edges:
        degree[e["source"]] += e["weight"]
        degree[e["target"]] += e["weight"]

    if not degree:
        return None

    return degree.most_common(1)[0][0]


# ---------------------------
# 6. 간단 요약 생성 (LLM 없이)
# ---------------------------
def generate_summary(keyword, sentences):
    related = [s for s in sentences if keyword in s]

    if not related:
        return ""

    return related[0][:60]


# ---------------------------
# 7. 전체 파이프라인
# ---------------------------
def generate_mindmap(text):
    text = preprocess(text)
    sentences = split_sentences(text)

    keywords = extract_keywords(text)
    edges = build_edges(sentences, keywords)
    central = find_central_keyword(edges)

    nodes = []
    for k in keywords:
        nodes.append({
            "id": k,
            "summary": generate_summary(k, sentences),
            "group": 1 if k == central else 2
        })

    return {
        "nodes": nodes,
        "edges": edges,
        "central": central
    }


# ---------------------------
# 실행 예시
# ---------------------------
if __name__ == "__main__":
    with open("input.txt", "r", encoding="utf-8") as f:
        text = f.read()

    graph = generate_mindmap(text)

    with open("output.json", "w", encoding="utf-8") as f:
        json.dump(graph, f, ensure_ascii=False, indent=2)

    print("✅ output.json 생성 완료")