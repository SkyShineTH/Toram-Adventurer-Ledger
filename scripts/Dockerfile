FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY backend/requirements.txt /tmp/backend-requirements.txt
COPY scripts/requirements.txt /tmp/scripts-requirements.txt
RUN python -m pip install --no-cache-dir --upgrade pip \
    && python -m pip install --no-cache-dir -r /tmp/backend-requirements.txt -r /tmp/scripts-requirements.txt

COPY backend ./backend
COPY scripts ./scripts
RUN mkdir -p data/raw data/processed reports/validation

ENTRYPOINT ["python", "scripts/03_load_postgres.py"]
