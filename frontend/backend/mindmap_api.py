from fastapi import APIRouter
from pydantic import BaseModel
from mindmap_generator import generate_mindmap

router = APIRouter()

class InputText(BaseModel):
    text: str

@router.post("/mindmap")
def create_mindmap(data: InputText):
    return generate_mindmap(data.text)