import { useCallback, useEffect, useState } from 'react';

import {
  getOrganization,
  type OrganizationDto,
  updateOrganization,
} from '../api';

export interface Organization {
  readonly createdAt: Date;
  readonly id: string;
  readonly name: string;
  readonly updatedAt: Date;
}

export type OrganizationStatus = 'loading' | 'ready' | 'error';

function toOrganization(dto: OrganizationDto): Organization {
  return {
    createdAt: new Date(dto.createdAt),
    id: dto.id,
    name: dto.name,
    updatedAt: new Date(dto.updatedAt),
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The organization could not be loaded.';
}

export function useOrganization(
  accessToken: string,
  organizationId: string,
) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [status, setStatus] = useState<OrganizationStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    let active = true;

    void getOrganization(accessToken, organizationId)
      .then((dto) => {
        if (!active) return;
        setOrganization(toOrganization(dto));
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) return;
        setErrorMessage(getErrorMessage(error));
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [accessToken, organizationId, requestVersion]);

  const retry = useCallback(() => {
    setStatus('loading');
    setErrorMessage(null);
    setRequestVersion((version) => version + 1);
  }, []);

  const updateName = useCallback(
    async (name: string) => {
      const dto = await updateOrganization(accessToken, organizationId, {
        name,
      });
      const updatedOrganization = toOrganization(dto);
      setOrganization(updatedOrganization);
      return updatedOrganization;
    },
    [accessToken, organizationId],
  );

  return {
    errorMessage,
    organization,
    retry,
    status,
    updateName,
  } as const;
}
