# Job Aggregator & Matching Backend Service

A lightweight, high-performance Node.js + TypeScript Express web service ready for deployment on **Render**, featuring automated job fetching from 6 platform feeds (**WeWorkRemotely**, **RemoteOK**, **Arbeitnow**, **Remotive**, **Jobspresso**, **MicroGigs**), Disability RAG Taxonomy Matching, resume parsing, social link integration, 24h cache scheduling, full description popups, and AI application drafting.

---

## ♿ RAG Disability & Skill Taxonomy System

Built a structured RAG Knowledge Base ([`src/services/taxonomyManager.ts`](file:///d:/Personal_practice/sort/cap-able/src/services/taxonomyManager.ts)) containing categorized disability profiles, synonyms, assistive tech needs, and incompatible job demands.

### Disability Taxonomy Groups
- **Visual Impairment & Blindness (`visual`)**:
  - *Incompatible Demands*: Robotics hardware assembly, circuit soldering, visual UI/graphic design, driving, warehouse labor.
  - *Compatible Demands*: Screen reader compatible software, backend development, python, data science.
- **Mobility & Physical Impairment (`mobility`)**:
  - *Incompatible Demands*: Heavy lifting, standing long hours, climbing, warehouse, cleaning.
  - *Compatible Demands*: 100% Remote, digital software, desk jobs, wheelchair accessible offices.
- **Auditory Impairment & Deafness (`auditory`)**:
  - *Incompatible Demands*: Phone sales, inbound call centers, live phone support.
  - *Compatible Demands*: Text chat support, software engineering, async written communication.
- **Speech Impairment (`speech`)**:
  - *Incompatible Demands*: Phone sales, public speaking, radio.
  - *Compatible Demands*: Coding, async communication, data entry.

---

## 🌐 Endpoints Reference

### 1. `GET /api/taxonomy`
Returns the full Disability Taxonomy Catalog and Skill Taxonomy Catalog for RAG indexing & frontend filtering.

### 2. `POST /api/taxonomy/compare`
RAG Semantic Comparison Endpoint. Compares candidate disabilities against job demands.

- **Request Body**:
```json
{
  "disabilities": ["blind"],
  "jobTitle": "Robotics Engineer",
  "jobDescription": "Physical assembly and circuit soldering in robotics lab."
}
```

- **Response (`200 OK`)**:
```json
{
  "hasConflict": true,
  "scorePenalty": 0.8,
  "status": "physical_conflict",
  "reason": "Physical Conflict: Candidate with visual impairment (blindness) cannot perform physical Robotics hardware assembly, circuit inspection, or visual design tasks for \"Robotics Engineer\"."
}
```

### 3. `POST /api/search-jobs`
Single candidate job search endpoint with disability RAG evaluation & 24h cache policy.

---

## 🏃 Local Development

```bash
npm run dev     # Run dev server with hot reload at http://localhost:3000
npm run build   # Build TypeScript project to dist/
npm start       # Start compiled server
```
