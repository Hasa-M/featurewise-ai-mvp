# ADR-009: Build Phase 1 as a Local-First Prototype

Date: 2026-06-02

Status: accepted

## Context

The first MVP is mainly intended for local development, learning, demos, and operator-assisted client conversations.

A production deployment would require additional concerns such as authentication, authorization, environment hardening, data isolation, operational monitoring, and deployment reliability.

## Decision

Phase 1 will be built as a local-first prototype.

The application may use online external services such as the LLM provider and object storage, but the product itself will not be deployed as a public production application in phase 1.

A minimal `User` table may exist to prepare the domain model for future ownership/audit needs, but it does not provide authentication or authorization.

## Consequences

- The MVP can focus on product workflow, backend architecture, LLM generation, context handling, and spec artifacts.
- Authentication, permissions, teams, and production deployment are deferred.
- The app must not be treated as secure for real multi-user production usage.
- Any real client data must be handled carefully and only with explicit permission.