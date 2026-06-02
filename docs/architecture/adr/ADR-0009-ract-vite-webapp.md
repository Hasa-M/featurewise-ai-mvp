# ADR-008: Use React + Vite Web App for Phase 1

Date: 2026-06-02

Status: accepted

## Context

Featurewise needs a real user interface for the main MVP workflow:

- create organization/project;
- create feature;
- add/edit feature brief;
- add context artifacts;
- configure generation settings;
- trigger spec generation;
- review and edit generated spec;
- export Markdown.

The MVP does not need a polished frontend, full responsiveness, themes, or advanced UI customization.

## Decision

Use a React + Vite + TypeScript web application as the frontend container for phase 1.

The web app communicates with the NestJS backend through REST/JSON APIs.

## Consequences

- The MVP can provide a real product workflow instead of being API-only.
- The frontend remains lightweight and fast to iterate.
- The backend remains the owner of business logic, LLM orchestration, persistence, and export.
- Advanced frontend concerns such as design system maturity, full responsiveness, theming, and production-grade UX polish are deferred.