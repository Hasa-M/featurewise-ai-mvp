# ADR-0001: Use lightweight Organization wrapper - single projected

Date: 2026-05-26

Status: accepted

## Context

The product should be framed around an organization/client/workspace, but the MVP does not include teams, permissions, or multi-project management.

## Decision

i will include a lightweight `Organization` entity in the MVP.

Each organization will initially contain only one project. Organization authentication, members, roles, and multi-project support are postponed.

## Consequences

The objective is to make the MVP still include the real main entity without implementing the needed full multi-tenancy.

It adds a small amount of domain structure now, but I want to avoid user/team/permission system for now.