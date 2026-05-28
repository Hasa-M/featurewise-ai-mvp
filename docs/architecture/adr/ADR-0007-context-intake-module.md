# ADR-007: Implement Context Intake as backend module, not separate service in phase 1

Date: 2026-05-26

Status: accepted

## Context

The product will eventually need to ingest context from external sources such as files, screenshots, Figma, repositories, MCP tools, and other APIs.

In phase 1, context will mostly come from manual text, data exchange formats, screenshots, markup files or mocked integration payloads.

## Decision

Context intake will be implemented as a module inside the NestJS backend.

The module should be designed with future adapter-based integrations in mind.

## Consequences

This keeps the MVP simpler to build, deploy, and test.

It still creates a clear architectural boundary for future integrations.

If context ingestion becomes complex later, this module can be extracted into a separate service.

It will be probably completly refactored in the future of the product.