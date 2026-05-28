# AI Job-Resume Matching Service (FastAPI + sentence-transformers)
FROM python:3.12-slim-bookworm

WORKDIR /app

# Build tools for torch / numpy wheels when needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Pre-download model at image build time (avoids download on every cold start)
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

COPY main.py matcher.py ./

ENV PYTHONUNBUFFERED=1
ENV PORT=10000

EXPOSE 10000

# Render injects $PORT at runtime
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
