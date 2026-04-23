import os
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# =========================
# 모델 설정 경로
# =========================
MODEL_PATH = r"D:\local_models\Qwen2.5-3B-Instruct"

# 메모리 효율을 위해 모델과 토크나이저를 전역 변수에 캐싱
SLM_CACHE = {
    "model": None,
    "tokenizer": None
}

class PromptRequest(BaseModel):
    prompt: str
    max_new_tokens: int = 256
    temperature: float = 0.7
    top_p: float = 0.9

def load_slm():
    """
    최초 1회만 모델을 로드하고, 이후에는 캐시된 모델을 반환합니다.
    """
    if SLM_CACHE["model"] is not None and SLM_CACHE["tokenizer"] is not None:
        return SLM_CACHE["model"], SLM_CACHE["tokenizer"]

    print("[INFO] SLM 모델 및 토크나이저 로드 중...")
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = torch.float16 if device == "cuda" else torch.float32

    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"모델 폴더를 찾을 수 없습니다: {MODEL_PATH}\n(경로를 확인하거나 모델을 먼저 다운로드 하세요)")

    tokenizer = AutoTokenizer.from_pretrained(
        MODEL_PATH,
        local_files_only=True,
        trust_remote_code=True
    )
    
    # pad_token이 없는 모델 대비
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        MODEL_PATH,
        local_files_only=True,
        trust_remote_code=True,
        torch_dtype=dtype,
        device_map="auto" if device == "cuda" else None
    )

    if device == "cpu":
        model = model.to(device)

    model.eval()

    SLM_CACHE["model"] = model
    SLM_CACHE["tokenizer"] = tokenizer
    
    print(f"[INFO] SLM 모델 로드 완료! (device: {device})")
    return model, tokenizer

###여기 프롬프트
###
###
###
def build_prompt(user_text: str) -> str:
    prompt = (
        "당신은 한국어로 답변하는 로컬 SLM이다.\n"
        "사용자의 질문에 간결하고 정확하게 답변하라.\n\n"
        f"사용자: {user_text}\n"
        "어시스턴트:"
    )
    return prompt


###여기 프롬프트
###
###
###
def generate_slm_response(user_text: str, max_new_tokens=256, temperature=0.7, top_p=0.9) -> str:
    """
    백엔드 내부의 다른 모듈(예: 회의 요약, 마인드맵 분석 등)에서 
    이 함수를 import 하여 직접 프롬프트를 던질 수 있습니다.
    """
    model, tokenizer = load_slm()
    prompt = build_prompt(user_text)
    
    device = model.device if hasattr(model, 'device') else ("cuda" if torch.cuda.is_available() else "cpu")

    inputs = tokenizer(
        prompt,
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=2048
    )
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        output_ids = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=True,
            temperature=temperature,
            top_p=top_p,
            pad_token_id=tokenizer.pad_token_id,
            eos_token_id=tokenizer.eos_token_id,
            repetition_penalty=1.1
        )

    decoded = tokenizer.decode(output_ids[0], skip_special_tokens=True)

    # 프롬프트 부분은 제외하고 생성된 답변만 추출
    if "어시스턴트:" in decoded:
        answer = decoded.split("어시스턴트:", 1)[-1].strip()
    else:
        answer = decoded.strip()

    return answer

# =========================
# 외부 (프론트엔드 등) 통신용
# =========================
@router.post("/slm/generate")
def api_generate_text(req: PromptRequest):
    """
    프론트엔드에서 axios/fetch로 프롬프트를 보낼 때 사용하는 엔드포인트입니다.
    """
    try:
        response = generate_slm_response(
            user_text=req.prompt, 
            max_new_tokens=req.max_new_tokens,
            temperature=req.temperature,
            top_p=req.top_p
        )
        return {"prompt": req.prompt, "response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SLM 생성 실패: {str(e)}")