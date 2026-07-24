# Serviço de reconhecimento facial (UC007). Python isolado do backend TS (Ports & Adapters).
# Os modelos (SCRFD + ArcFace, pack buffalo_l) são BAIXADOS NA BUILD → runtime 100% offline,
# coerente com a política de testes offline no container (DEC-STR-34).
FROM python:3.11-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    INSIGHTFACE_HOME=/opt/insightface

# Dependências de sistema:
#  - build-essential/cmake: insightface compila extensões nativas na instalação
#  - libgl1/libglib2.0-0: runtime do OpenCV (dependência transitiva do insightface)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY main.py .

# Baixa o pack de modelos na build (não em runtime). Falha a build se o download falhar,
# em vez de subir um serviço que quebra na primeira requisição.
RUN python -c "from insightface.app import FaceAnalysis; \
FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider']).prepare(ctx_id=-1, det_size=(640,640))"

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
