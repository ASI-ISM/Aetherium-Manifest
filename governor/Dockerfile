FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Governor also needs access to the schema and runtime_governor module from parent
# In a real setup we'd package these or use a mono-repo build context
# For now we assume they are copied into the governor dir during build
EXPOSE 8090
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8090", "--workers", "6"]
