FROM python:3.11-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends stockfish \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY pyproject.toml README.md ./
COPY backend ./backend
COPY ml/models ./ml/models
RUN pip install --no-cache-dir .

ENV STOCKFISH_PATH=/usr/games/stockfish
EXPOSE 8000
CMD ["sh", "-c", "uvicorn chess_trainer.api:app --host 0.0.0.0 --port ${PORT:-8000}"]
