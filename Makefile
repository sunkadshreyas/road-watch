SHELL := /bin/zsh

.PHONY: help env install setup reset-demo dev demo lint build verify verify-mobile

help:
	@echo "RoadWatch demo commands"
	@echo "  make setup       Prepare the local demo database and install dependencies"
	@echo "  make demo        Full setup and start the local demo server"
	@echo "  make reset-demo  Reset and reseed the local SQLite demo database"
	@echo "  make dev         Start the local Next.js dev server"
	@echo "  make lint        Run ESLint"
	@echo "  make build       Run the production build"
	@echo "  make verify      Run lint, tests, build, and mobile persona verification"
	@echo "  make verify-mobile  Verify mobile anonymous/resident/admin flows and start dev server if needed"

env:
	@if [ ! -f .env ]; then cp .env.example .env; echo "Created .env from .env.example"; fi

install: env
	npm install

setup: install
	npm run db:reset

reset-demo: env
	npm run db:reset

dev:
	npm run dev

demo: setup
	npm run dev

lint:
	npm run lint

build:
	npm run build

verify:
	npm run verify

verify-mobile:
	npm run verify:mobile
