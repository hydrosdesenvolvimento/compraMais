"""
Serviço de reconhecimento facial (UC007 — prova de vida do credenciamento).

Fronteira de ML isolada do backend TypeScript (padrão Ports & Adapters): recebe uma imagem,
devolve o EMBEDDING facial (ArcFace, 512-D, L2-normalizado) já tipado. NÃO persiste nada e não
conhece o domínio — todo dado sensível vive cifrado no backend (AD-19).

Contrato (espelha src/shared/acl/facial/reconhecimento-facial-gateway.ts):
  POST /extract  { "imagem": "<base64 | data-url>" }
    200 { "ok": true,  "template": { "vetor": [...512], "dim": 512, "modelo": "arcface-buffalo_l" }, "qualidade": 0.87 }
    200 { "ok": false, "motivo": "rosto_nao_detectado" | "multiplos_rostos" | "qualidade_baixa" }
    4xx/5xx apenas para ERRO real (payload inválido / falha interna) — o adapter TS trata como indisponível.
  GET  /health  { "status": "ok", "modelo": ... }

Decisão consciente (D2, ver spec/docs/plano-prova-de-vida-credenciamento.md §2.1): o MVP faz
FACE MATCH, sem anti-spoofing/liveness. Este serviço já devolve `qualidade` (det_score) para
habilitar uma camada de liveness numa release seguinte sem quebrar o contrato.
"""
import base64
import binascii
import os

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel

MODELO = os.environ.get("FACE_MODEL_PACK", "buffalo_l")
MODELO_ID = f"arcface-{MODELO}"
# det_score mínimo do SCRFD para aceitar a face (abaixo disso a captura está ruim demais p/ comparar).
QUALIDADE_MINIMA = float(os.environ.get("FACE_MIN_QUALITY", "0.5"))

app = FastAPI(title="compraMais face-service", version="1.0.0")

# Carrega o pack (SCRFD detecção + ArcFace reconhecimento) uma única vez, na subida.
# Os modelos são baixados na BUILD da imagem (Dockerfile) → runtime 100% offline.
_analyzer = None


def _get_analyzer():
    global _analyzer
    if _analyzer is None:
        from insightface.app import FaceAnalysis

        a = FaceAnalysis(name=MODELO, providers=["CPUExecutionProvider"])
        a.prepare(ctx_id=-1, det_size=(640, 640))  # ctx_id=-1 → CPU
        _analyzer = a
    return _analyzer


class ExtractRequest(BaseModel):
    imagem: str


def _decode(imagem_b64: str) -> bytes | None:
    dados = imagem_b64.split(",", 1)[1] if imagem_b64.startswith("data:") else imagem_b64
    try:
        return base64.b64decode(dados, validate=True)
    except (binascii.Error, ValueError):
        return None


def _to_bgr(raw: bytes):
    from io import BytesIO

    from PIL import Image

    img = Image.open(BytesIO(raw)).convert("RGB")
    return np.asarray(img)[:, :, ::-1]  # RGB → BGR (convenção do insightface/opencv)


@app.get("/health")
def health():
    return {"status": "ok", "modelo": MODELO_ID}


@app.post("/extract")
def extract(req: ExtractRequest):
    raw = _decode(req.imagem)
    if not raw:
        return {"ok": False, "motivo": "rosto_nao_detectado"}

    try:
        bgr = _to_bgr(raw)
    except Exception:
        return {"ok": False, "motivo": "rosto_nao_detectado"}

    faces = _get_analyzer().get(bgr)
    if len(faces) == 0:
        return {"ok": False, "motivo": "rosto_nao_detectado"}
    if len(faces) > 1:
        return {"ok": False, "motivo": "multiplos_rostos"}

    face = faces[0]
    qualidade = float(face.det_score)
    if qualidade < QUALIDADE_MINIMA:
        return {"ok": False, "motivo": "qualidade_baixa"}

    vetor = np.asarray(face.normed_embedding, dtype=np.float32)  # ArcFace 512-D, já L2-normalizado
    return {
        "ok": True,
        "template": {"vetor": vetor.tolist(), "dim": int(vetor.shape[0]), "modelo": MODELO_ID},
        "qualidade": qualidade,
    }
