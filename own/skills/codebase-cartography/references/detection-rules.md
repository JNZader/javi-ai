# Codebase Cartography — Framework Detection Rules

## React / Next.js

**Markers**: `next.config.ts`, `next.config.js`, `next.config.mjs`

**Directories**: `app/` (App Router), `pages/` (Pages Router), `components/`, `hooks/`, `lib/`/`utils/`, `public/`, `middleware.ts`

**Rules**:
- `app/layout.tsx` exists → App Router
- `pages/_app.tsx` exists → Pages Router
- Both → Hybrid (note in codemap)
- Check `next.config` for `experimental`, `serverActions`, `turbopack`

## Angular

**Markers**: `angular.json`, `nx.json`

**Directories**: `src/app/`, `src/app/core/`, `src/app/shared/`, `src/app/features/`, `src/environments/`

**Rules**:
- Parse `angular.json` for project names
- Detect standalone components vs NgModule-based
- Check for `provideRouter()` (standalone) vs `RouterModule` (NgModule)
- Identify state management: NgRx, Akita, or signal-based

## Spring Boot (Java/Kotlin)

**Markers**: `pom.xml`, `build.gradle`, `build.gradle.kts`

**Directories**: `controller/`, `service/`, `repository/`, `entity/`/`model/`, `dto/`, `config/`, `security/`, `exception/`

**Rules**:
- `@SpringBootApplication` annotation location → main entry point
- Detect: layered, hexagonal, or DDD
- Parse `application.yml`/`application.properties` for profiles
- Identify Spring modules: Web, Security, Data JPA, Cloud

## Go

**Markers**: `go.mod`, `go.sum`

**Directories**: `cmd/`, `internal/`, `pkg/`, `api/`, `configs/`, `deployments/`

**Rules**:
- Parse `go.mod` for module path and Go version
- Find `func main()` → entry points
- Detect web framework: Chi, Gin, Echo, Fiber, stdlib
- Check for `internal/` (standard Go project layout)

## Python / Django / FastAPI

**Markers**: `pyproject.toml`, `setup.py`, `requirements.txt`, `Pipfile`, `manage.py`

**Django dirs**: `manage.py`, `settings.py`, `urls.py`, `apps/{name}/models.py,views.py,serializers.py`

**FastAPI dirs**: `app/main.py`, `routers/`, `models/`, `schemas/`, `services/`, `dependencies.py`

**Rules**:
- `manage.py` → Django
- `uvicorn`/`fastapi` in deps → FastAPI
- `flask` in deps → Flask
- `alembic/` → database migrations
- Detect: pytest vs unittest

## Rust

**Markers**: `Cargo.toml`, `Cargo.lock`

**Directories**: `src/main.rs`, `src/lib.rs`, `src/bin/`

**Rules**:
- `[workspace]` in Cargo.toml → workspace/monorepo
- `[lib]` vs `[[bin]]` → library or binary
- Detect: Actix, Axum, Rocket, Warp
- `build.rs` → custom build steps

---

## Smart Filtering

### Always Exclude

```
node_modules/, vendor/, .venv/, __pycache__, .mypy_cache/, .pytest_cache/
build/, dist/, out/, .next/, .nuxt/, target/, *.class, *.pyc
.git/, .hg/, .svn/, .idea/, .vscode/, *.swp, .DS_Store
Lock files (mention existence, don't list)
```

### Always Include

```
*.config.ts/js/mjs, tsconfig.json, angular.json, Cargo.toml, go.mod, pyproject.toml
Dockerfile, docker-compose.yml, Makefile, .env.example
main.ts/go/rs/py, index.ts/js, App.tsx/vue/svelte, manage.py
README.md, CLAUDE.md, AGENTS.md, ARCHITECTURE.md
.github/workflows/, .gitlab-ci.yml, Jenkinsfile
```

### Depth Limits

| Project Size | Max Depth | Max Files |
|-------------|-----------|-----------|
| Small (<100) | 5 | All |
| Medium (<1000) | 3 | 80-120 |
| Large (<10000) | 2 | 50-80 |
| Monorepo | Per-package | 30-50/pkg |

---

## Dependency Analysis Commands

### Node.js
```bash
jq -r '.dependencies | to_entries[] | "- **\(.key)** \(.value)"' package.json
```

### Go
```bash
grep -E '^\t[a-zA-Z]' go.mod | awk '{print "- **" $1 "** " $2}'
```

### Rust
```bash
awk '/^\[dependencies\]/,/^\[/' Cargo.toml | grep -v '^\[' | grep -v '^$' | sed 's/\(.*\) = .*/- **\1**/'
```

### Python
```bash
awk '/^dependencies/,/^\]/' pyproject.toml | grep -E '^\s+"' | tr -d ' ",'
```

### Import Graph Analysis
```bash
# TypeScript: rg "^import .* from '[.@]" --type ts -l | head -20
# Python: rg "^from \." --type py -l | head -20
# Go: rg '"[^"]*internal/' --type go -l | head -20
```
