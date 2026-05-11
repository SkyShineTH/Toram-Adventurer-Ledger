FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY backend/requirements.txt /tmp/backend-requirements.txt
COPY scripts/requirements.txt /tmp/scripts-requirements.txt
RUN python -m pip install --no-cache-dir --upgrade pip \
    && python -m pip install --no-cache-dir -r /tmp/backend-requirements.txt -r /tmp/scripts-requirements.txt

COPY backend ./backend
RUN mkdir -p data/processed reports/validation

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
