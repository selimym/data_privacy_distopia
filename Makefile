.PHONY: dev dev-backend dev-frontend test generate-data install install-backend install-frontend clean

dev:
	@echo "Starting backend and frontend in parallel..."
	@make -j2 dev-backend dev-frontend

dev-backend:
	@echo "Starting backend server..."
	cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	@echo "Starting frontend development server..."
	cd frontend && pnpm dev

install: install-backend install-frontend
	@echo "All dependencies installed successfully"

install-backend:
	@echo "Installing backend dependencies with uv..."
	cd backend && uv sync

install-frontend:
	@echo "Installing frontend dependencies with pnpm..."
	cd frontend && pnpm install

test:
	@echo "Running backend tests..."
	cd backend && uv run pytest

generate-data:
	@echo "Generating test data..."
	cd backend && uv run python -m app.scripts.generate_data

clean:
	@echo "Cleaning up..."
	rm -rf backend/.venv
	rm -rf backend/__pycache__
	rm -rf backend/.pytest_cache
	rm -rf frontend/node_modules
	rm -rf frontend/dist
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
