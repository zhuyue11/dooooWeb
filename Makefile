.PHONY: dev build preview install lint typecheck test test-ui test-headed test-report clean

# Development
dev:
	npm run dev

build:
	npm run build

preview:
	npm run preview

install:
	npm install
	npx playwright install chromium

# Code quality
lint:
	npm run lint

typecheck:
	npm run typecheck

# E2E tests (requires backend running: make compose-dev in dooooBackend)
test:
	npx playwright test

test-ui:
	npx playwright test --ui

test-headed:
	npx playwright test --headed

test-report:
	npx playwright show-report

# Clean
clean:
	rm -rf dist node_modules test-results playwright-report blob-report tests/.auth
