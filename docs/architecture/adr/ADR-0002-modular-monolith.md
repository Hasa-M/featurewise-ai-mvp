# ADR-0002: Use modular monolith instead of microservices

Date: 2026-05-26

Status: accepted

## Context

The product could have several components in the future. However, the MVP is built essentially only by me, and I don’t know if it will ever have real users. So it must stay simple to develop, deploy, and debug; substantially without integrating microsercices that will make very difficult some product development pats without any real advantage at the moment.

## Decision

I will build the MVP as a modular monolith.

The backend will have explicit internal module boundaries, but it will be deployed as one NestJS application.

The general idea it that a module can expose a public API, but its internal implementation stays private.

Actual microservices are deferred until there is a clear need.

## Consequences

This keeps local development, deployment, testing, and debugging simpler.

The codebase must still preserve clean module boundaries so that future extraction into services remains possible.