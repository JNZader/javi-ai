# Unified AI Instructions - Master Orchestrator

> **Unified orchestrator for GitHub Copilot, Gemini CLI, and OpenAI Codex**
> 
> This file provides context-aware pattern selection across all development domains.
> 
> **How to use**: The AI automatically detects the task domain and applies appropriate patterns.
> **No need to select agents** - just describe what you need.
> 
> **Source**: `unified-instructions/orchestrator.md` in Javi.Dots
> **Regenerate**: Run `./skills/setup.sh --install-all-orchestrators`

## Core Identity

You are an AI assistant with multi-domain expertise. Rather than switching between personas, you dynamically apply the appropriate patterns based on task context.

## Context Detection Matrix

Analyze the user's request and identify the primary domain:

| Keywords | Domain | Apply Patterns From |
|----------|--------|---------------------|
| React, Vue, Angular, component, UI, CSS, Tailwind | **Frontend** | Section 2 |
| API, backend, server, database, Python, Go, Java, Node | **Backend** | Section 3 |
| Docker, Kubernetes, CI/CD, deploy, infrastructure | **DevOps** | Section 4 |
| Test, testing, Jest, Pytest, security, audit | **Quality** | Section 5 |
| ML, AI, data, model, training, analytics | **Data/AI** | Section 6 |
| Design, architecture, API design, schema | **Architecture** | Section 7 |
| Plan, project, sprint, requirements, docs | **Business** | Section 8 |
| Blockchain, game, embedded, IoT, fintech | **Specialized** | Section 9 |

## Section 1: Task Analysis Protocol

When receiving ANY request:

1. **Classify** the task using the matrix above
2. **Identify** primary and secondary domains
3. **Select** patterns from appropriate sections
4. **Synthesize** a cohesive approach
5. **Execute** with domain-appropriate patterns

### Output Format

```markdown
## Task Analysis

**Primary Domain**: [Frontend/Backend/DevOps/etc]
**Secondary Domains**: [List if applicable]
**Complexity**: [Low/Medium/High]
**Approach**: [Brief description]

### Implementation Plan
1. [Step 1 with pattern reference]
2. [Step 2 with pattern reference]
3. [Step 3 with pattern reference]

### Selected Patterns
- [Pattern 1 from Section X]
- [Pattern 2 from Section Y]
```

## Section 2: Frontend Patterns

### React Components
```typescript
// Functional component with hooks
import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';

// Validation schema
const PropsSchema = z.object({
  title: z.string().min(1),
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })),
  onSelect: z.function().args(z.string()).returns(z.void()),
});

type Props = z.infer<typeof PropsSchema>;

export function ComponentName({ title, items, onSelect }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  
  const handleSelect = useCallback((id: string) => {
    setSelected(id);
    onSelect(id);
  }, [onSelect]);

  return (
    <div className="container">
      <h2>{title}</h2>
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => handleSelect(item.id)}
          className={selected === item.id ? 'selected' : ''}
        >
          {item.name}
        </button>
      ))}
    </div>
  );
}
```

### State Management (Zustand)
```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface StoreState {
  items: Item[];
  loading: boolean;
  addItem: (item: Item) => void;
  removeItem: (id: string) => void;
}

export const useStore = create<StoreState>()(
  immer((set) => ({
    items: [],
    loading: false,
    addItem: (item) => set((state) => {
      state.items.push(item);
    }),
    removeItem: (id) => set((state) => {
      state.items = state.items.filter(i => i.id !== id);
    }),
  }))
);
```

### API Calls (TanStack Query)
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query
const { data, isLoading, error } = useQuery({
  queryKey: ['users', userId],
  queryFn: () => fetchUser(userId),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Mutation
const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: createUser,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  },
});
```

### TypeScript Types
```typescript
// Domain types
type User = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'guest';
  createdAt: Date;
};

// API types
type ApiResponse<T> = {
  data: T;
  meta?: {
    page: number;
    total: number;
  };
};

type ApiError = {
  code: string;
  message: string;
  details?: Record<string, string[]>;
};
```

## Section 3: Backend Patterns

### Python FastAPI
```python
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from sqlalchemy.orm import Session

app = FastAPI()

# Pydantic models
class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    
    class Config:
        from_attributes = True

# Dependency injection
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Routes
@app.post("/users", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = User(**user.dict())
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

### Go Chi Router
```go
package main

import (
    "net/http"
    "github.com/go-chi/chi/v5"
    "github.com/go-chi/chi/v5/middleware"
)

type Handler struct {
    service Service
}

func NewHandler(s Service) *Handler {
    return &Handler{service: s}
}

func (h *Handler) Routes() chi.Router {
    r := chi.NewRouter()
    
    r.Use(middleware.RequestID)
    r.Use(middleware.RealIP)
    r.Use(middleware.Logger)
    r.Use(middleware.Recoverer)
    r.Use(middleware.Timeout(30 * time.Second))
    
    r.Get("/", h.List)
    r.Post("/", h.Create)
    r.Get("/{id}", h.Get)
    r.Put("/{id}", h.Update)
    r.Delete("/{id}", h.Delete)
    
    return r
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
    var req CreateRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        respondWithError(w, http.StatusBadRequest, "Invalid request body")
        return
    }
    
    // Validate
    if err := req.Validate(); err != nil {
        respondWithError(w, http.StatusBadRequest, err.Error())
        return
    }
    
    // Process
    result, err := h.service.Create(r.Context(), req)
    if err != nil {
        respondWithError(w, http.StatusInternalServerError, err.Error())
        return
    }
    
    respondWithJSON(w, http.StatusCreated, result)
}
```

### Java Spring Boot
```java
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    
    private final UserService userService;
    private final UserMapper userMapper;
    
    @PostMapping
    public ResponseEntity<UserDTO> createUser(@Valid @RequestBody UserCreateRequest request) {
        User user = userService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(userMapper.toDTO(user));
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUser(@PathVariable UUID id) {
        return userService.findById(id)
            .map(userMapper::toDTO)
            .map(ResponseEntity::ok)
            .orElseThrow(() -> new UserNotFoundException(id));
    }
    
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(UserNotFoundException ex) {
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(new ErrorResponse(ex.getMessage(), LocalDateTime.now()));
    }
}
```

### Database Schema (PostgreSQL)
```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role) WHERE role = 'admin';

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## Section 4: DevOps Patterns

### Docker Multi-stage
```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=builder /app/dist ./dist
EXPOSE 3000
USER node
CMD ["node", "dist/main.js"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/app
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: app
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d app"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### GitHub Actions CI/CD
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run linter
        run: npm run lint
        
      - name: Run type check
        run: npm run type-check
        
      - name: Run tests
        run: npm test -- --coverage
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to production
        run: |
          echo "${{ secrets.SSH_KEY }}" > key.pem
          chmod 600 key.pem
          ssh -i key.pem user@server "cd /app && git pull && docker-compose up -d --build"
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-deployment
  labels:
    app: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: myapp:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: app-service
spec:
  selector:
    app: myapp
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

## Section 5: Quality Patterns

### Testing Strategy

#### Unit Tests (Jest/Vitest)
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserForm } from './UserForm';

describe('UserForm', () => {
  it('renders form fields', () => {
    render(<UserForm onSubmit={vi.fn()} />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });
  
  it('validates required fields', async () => {
    const onSubmit = vi.fn();
    render(<UserForm onSubmit={onSubmit} />);
    
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
  
  it('submits valid data', async () => {
    const onSubmit = vi.fn();
    render(<UserForm onSubmit={onSubmit} />);
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'John Doe' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'John Doe',
      });
    });
  });
});
```

#### E2E Tests (Playwright)
```typescript
import { test, expect } from '@playwright/test';

test.describe('User Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });
  
  test('user can register and login', async ({ page }) => {
    // Register
    await page.click('text=Sign Up');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Registration successful')).toBeVisible();
    
    // Login
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Welcome')).toBeVisible();
  });
});
```

### Code Review Checklist

When reviewing code, verify:

- [ ] **Functionality**: Does it work as intended?
- [ ] **Tests**: Are there adequate tests?
- [ ] **Error Handling**: Are edge cases handled?
- [ ] **Security**: No secrets, proper validation?
- [ ] **Performance**: Any obvious bottlenecks?
- [ ] **Maintainability**: Clean, readable code?
- [ ] **Documentation**: Complex logic explained?

## Section 6: Data & AI Patterns

### ML Model (Python)
```python
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
import joblib

# Load and prepare data
df = pd.read_csv('data.csv')
X = df.drop('target', axis=1)
y = df['target']

# Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
print(classification_report(y_test, y_pred))

# Save
joblib.dump(model, 'model.pkl')
```

### Data Pipeline (Airflow)
```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.postgres.operators.postgres import PostgresOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'airflow',
    'depends_on_past': False,
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

with DAG(
    'etl_pipeline',
    default_args=default_args,
    description='ETL pipeline for daily data',
    schedule_interval=timedelta(days=1),
    start_date=datetime(2024, 1, 1),
    catchup=False,
) as dag:
    
    extract = PythonOperator(
        task_id='extract_data',
        python_callable=extract_from_api,
    )
    
    transform = PythonOperator(
        task_id='transform_data',
        python_callable=transform_data,
    )
    
    load = PostgresOperator(
        task_id='load_data',
        sql='sql/insert_data.sql',
    )
    
    extract >> transform >> load
```

## Section 7: Architecture Patterns

### REST API Design
```yaml
openapi: 3.0.0
info:
  title: Users API
  version: 1.0.0

paths:
  /users:
    get:
      summary: List users
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: List of users
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/User'
                  meta:
                    type: object
                    properties:
                      total:
                        type: integer
                      page:
                        type: integer
                      
    post:
      summary: Create user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserCreate'
      responses:
        '201':
          description: User created
          
  /users/{id}:
    get:
      summary: Get user by ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: User found
        '404':
          description: User not found

components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
        email:
          type: string
        name:
          type: string
          
    UserCreate:
      type: object
      required:
        - email
        - name
      properties:
        email:
          type: string
          format: email
        name:
          type: string
```

### Microservices Communication
```typescript
// Event-driven with message queue
interface OrderCreatedEvent {
  type: 'order.created';
  payload: {
    orderId: string;
    userId: string;
    items: OrderItem[];
    total: number;
  };
  timestamp: Date;
  correlationId: string;
}

// Publisher
class EventPublisher {
  async publish<T extends DomainEvent>(
    topic: string,
    event: T
  ): Promise<void> {
    const message = {
      ...event,
      timestamp: new Date(),
      correlationId: generateCorrelationId(),
    };
    
    await this.messageQueue.publish(topic, JSON.stringify(message));
  }
}

// Consumer
class OrderConsumer {
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    // Process order
    await this.inventoryService.reserveItems(event.payload.items);
    await this.paymentService.processPayment(event.payload);
    await this.notificationService.sendConfirmation(event.payload.userId);
  }
}
```

## Section 8: Business Patterns

### User Stories
```markdown
## Feature: User Registration

### User Story
As a new visitor,
I want to create an account,
So that I can access personalized features.

### Acceptance Criteria
- [ ] User can register with email and password
- [ ] Password must be at least 8 characters with uppercase, lowercase, and number
- [ ] Email must be unique and validated
- [ ] User receives confirmation email
- [ ] User can login after registration

### Technical Notes
- Use bcrypt for password hashing
- Send email via SendGrid
- Store user in PostgreSQL
```

### API Documentation
```markdown
## POST /api/users

Create a new user account.

### Request
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

### Response 201 Created
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Response 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": {
    "email": ["Email is already registered"],
    "password": ["Password must contain at least one uppercase letter"]
  }
}
```

### Response 422 Unprocessable Entity
```json
{
  "error": "Invalid request format"
}
```
```

## Section 9: Specialized Patterns

### Smart Contract (Solidity)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 1000000 * 10**18;
    
    constructor() ERC20("MyToken", "MTK") {
        _mint(msg.sender, 100000 * 10**18);
    }
    
    function mint(address to, uint256 amount) public onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
        _mint(to, amount);
    }
    
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
}
```

## Decision Rules

When multiple patterns could apply:

1. **Default to simplest**: Choose the simplest pattern that solves the problem
2. **Follow existing conventions**: Match the style of the current codebase
3. **Consider team expertise**: Use patterns the team knows well
4. **Prioritize maintainability**: Favor readability over cleverness
5. **Document deviations**: If breaking from standard patterns, explain why

## Security Rules

- NEVER commit secrets (API keys, passwords, tokens)
- ALWAYS validate user input
- USE parameterized queries (prevent SQL injection)
- IMPLEMENT rate limiting on public endpoints
- HASH passwords with bcrypt/argon2
- USE HTTPS for all communications
- SANITIZE all output to prevent XSS
- IMPLEMENT proper CORS policies
- LOG security events
- REGULARLY update dependencies

## Output Quality Standards

All code should be:
- **Readable**: Clear variable names, logical structure
- **Tested**: Unit tests for logic, integration tests for flows
- **Documented**: Complex logic explained, public APIs documented
- **Secure**: Following security best practices
- **Efficient**: No unnecessary operations or allocations
- **Maintainable**: Easy to understand and modify
