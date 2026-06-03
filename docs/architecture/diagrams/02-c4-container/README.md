# C4 Container — Featurewise

## Purpose

This diagram shows the main runtime containers of the Featurewise MVP and how they communicate.

Featurewise is implemented as a local-first prototype with a React web app, a NestJS modular monolith backend, PostgreSQL, object storage, and an external LLM provider.

The diagram focuses on the current MVP architecture. Future integrations are shown only as deferred external systems.

## Containers

### Web App

React + Vite + TypeScript frontend.

Provides the main product workflow UI: organization/project setup, feature creation, context intake, generation settings, async generation status, spec review/editing, and Markdown export.

### Backend API

NestJS + TypeScript REST API implemented as a modular monolith.

Owns the product workflow, context intake, context selection, spec generation orchestration, structured spec persistence, review checkpoints, quality checks, Markdown export, LLM calls, and storage access.

Spec generation is asynchronous from the user perspective, but runs inside the NestJS process in phase 1. No separate worker or queue is included yet.

### PostgreSQL Database

Stores business entities, minimal user records without context metadata, spec runs, generated specs, checkpoint statuses, quality-check results, and LLM call logs.

PostgreSQL is the main persistence, traceability, and audit/logging backbone for the MVP.

### Object Storage

AWS S3-compatible object storage.

Stores uploaded images and raw context artifacts that should not live directly inside PostgreSQL. PostgreSQL stores metadata and object references.

## External Systems

### External LLM Provider

External AI provider, initially likely OpenAI or another cost-effective provider.

The backend sends normalized context, image inputs, prompt instructions, schema version, and generation settings. The provider returns structured draft specification content and usage metadata.

The frontend never calls the LLM provider directly.

### Deferred App Integrations

Future integrations such as Figma, GitHub, Jira, Linear, and Notion are not part of phase 1.

In the MVP, their context is represented through uploaded or pasted artifacts rather than direct integrations.

## Exclusions

This diagram intentionally excludes:

- production deployment;
- queue/worker infrastructure;
- dedicated AI/FastAPI service;
- real Figma/GitHub/Jira/Linear/Notion integrations;
- vector database;
- embeddings/RAG;
- agent execution;
- payments;
- Kubernetes;
- microservices.

## Notes

The backend should be structured so that spec generation can later move to a worker or dedicated AI service without changing the core product model.

The implementation-readiness artifact is not a separate container. It is stored as structured data in PostgreSQL and exported as Markdown on demand by the backend.
