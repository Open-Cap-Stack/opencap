# 📖 Enhanced Documentation APIs

**Endpoint Count:** 7

## Overview

This category contains 7 endpoints for 📖 enhanced documentation operations.


## 📖 Enhanced Documentation


### `POST /demo/agent-swarm`

**Summary:** Create Demo Agent Swarm

**Demo: Create Agent Swarm**

Create a multi-agent system for collaborative AI tasks.

**Real-world example:**
```python
# Create a code review swarm
swarm = client.agent_swarm.create(
    name="Code Review Swarm",
    agents=[
        {"type": "analyzer", "model": "gpt-4", "role": "Code analysis"},
        {"type": "security", "model": "claude-3", "role": "Security review"}, 
        {"type": "performance", "model": "llama-2", "role": "Performance optimization"}
    ]
)

# Execute collaborative task
result = swarm.execute_task(
    task="Review this Python function",
    inputs={"code": "def process_data(data): ..."}
)
```

**Agent Swarm Benefits:**
- **Parallel Processing**: Multiple agents work simultaneously
- **Specialized Roles**: Each agent has specific expertise
- **Quality Assurance**: Cross-agent validation
- **Cost Optimization**: Use different models for different tasks

**Popular Swarm Configurations:**
- Content Creation: Writer + Editor + Reviewer
- Code Review: Analyzer + Security + Performance  
- Research: Researcher + Fact-checker + Summarizer
- Customer Support: Classifier + Resolver + Quality Assurance

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /demo/agent-swarm/{swarm_id}/execute`

**Summary:** Execute Demo Swarm Task

**Demo: Execute Agent Swarm Task**

Execute a collaborative task across multiple AI agents.

**How it works:**
1. **Task Distribution**: Break down complex task into agent-specific subtasks
2. **Parallel Execution**: Agents work simultaneously on their parts
3. **Cross-Agent Communication**: Agents share context and intermediate results
4. **Quality Assurance**: Final review and validation across agents
5. **Result Synthesis**: Combine outputs into final result

**Example Tasks:**
- "Write and review a blog post about AI trends"
- "Analyze code for bugs, security issues, and performance"  
- "Research competitors and create market analysis"
- "Generate marketing copy and review for brand compliance"

**Performance:**
- **3-5x Faster** than sequential processing
- **Higher Quality** through multi-agent validation
- **Cost Effective** using optimal models for each role

**Parameters:**

- `swarm_id` (path) *(required)*: No description
- `task` (query) *(required)*: Task for the swarm to execute
- `inputs` (query): JSON string of task inputs

**Success Response (200):** Successful Response

---

### `GET /demo/features`

**Summary:** Get Demo Features

**Demo: AINative Studio Feature Overview**

Comprehensive overview of all AINative Studio capabilities.

**What makes AINative Studio special:**
This single platform replaces 8+ traditional services while providing
better performance, lower costs, and seamless integration.

**Success Response (200):** Successful Response

---

### `GET /demo/projects`

**Summary:** List Demo Projects

**Demo: List ZeroDB Projects**

This endpoint demonstrates the project listing functionality.
In a real implementation, this would fetch user-specific projects from the database.

**Try it now:**
1. Click "Try it out"
2. Click "Execute" 
3. See sample projects returned

**What this replaces:**
- Multiple database setup and management
- Vector database provisioning
- Storage bucket creation

**Success Response (200):** Successful Response

---

### `POST /demo/projects`

**Summary:** Create Demo Project

**Demo: Create ZeroDB Project**

Creates a new ZeroDB project - your AI-native database instance.

**Real-world usage:**
```python
project = client.zerodb.projects.create(
    name="My AI Project",
    description="Vector storage for my app"
)
```

**What you get:**
- Vector database with semantic search
- Traditional relational storage  
- File storage with auto-indexing
- Real-time event streaming
- Memory management for AI contexts
- Built-in RLHF capabilities

**Try different names:** 
- "Product Recommendation Engine"
- "Customer Support AI"
- "Document Analysis System"

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /demo/projects/{project_id}/vectors`

**Summary:** Upsert Demo Vectors

**Demo: Store Vector Embeddings**

Store vector embeddings with metadata for semantic search.

**Real-world example:**
```python
# Store product embeddings
client.zerodb.vectors.upsert(
    project_id="proj_123",
    vectors=[{
        "id": "product_456", 
        "embedding": openai_embeddings,
        "metadata": {
            "title": "Wireless Headphones",
            "price": 199.99,
            "category": "electronics"
        }
    }]
)
```

**Use cases:**
- Product recommendations
- Document search
- Content similarity
- Customer support
- Knowledge bases

**Tip:** Use OpenAI, Cohere, or any embedding model to generate vectors from text.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /demo/projects/{project_id}/vectors/search`

**Summary:** Search Demo Vectors

**Demo: Semantic Vector Search**

Search for similar vectors using cosine similarity.

**Real-world example:**
```python
# Search for similar products
results = client.zerodb.vectors.search(
    project_id="proj_123",
    query_vector=user_preference_embedding,
    limit=10,
    filter={"category": "electronics", "price_range": "100-500"}
)

for match in results.matches:
    print(f"Product: {match.metadata['title']}")
    print(f"Similarity: {match.similarity_score:.2f}")
```

**Performance:**
- **Sub-50ms** search times
- **Millions** of vectors
- **Real-time** filtering
- **Hybrid** text + vector search

**Try searching with:**
- Different vector values
- Various limit values (1-100)
- Metadata filters

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
