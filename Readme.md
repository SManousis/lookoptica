In the backend. First start venv: source .venv/Scripts/activate
Then: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

In the fronted: npm run dev