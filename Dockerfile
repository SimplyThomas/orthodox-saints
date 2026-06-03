# Build environment for the Orthodox Saints Database.
# Mirrors CI (Python 3.11). Source is mounted at runtime via docker-compose so
# edits are live and generated output (public/, dist/) lands back on the host.
FROM python:3.11-slim

WORKDIR /app

# Install dependencies in their own layer so they cache across source edits.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Default action: validate + emit all artifacts. Override per docker-compose.
CMD ["python", "build.py"]
