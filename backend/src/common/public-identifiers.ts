import { BadRequestException, type PipeTransform } from '@nestjs/common';

export type PublicIdentifierEntity = 'feature' | 'project';

export type EntityIdentifier =
  | { readonly kind: 'publicNumber'; readonly value: number }
  | { readonly kind: 'uuid'; readonly value: string };

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const POSITIVE_INTEGER_PATTERN = /^[1-9][0-9]*$/;
const POSTGRES_INTEGER_MAX = 2_147_483_647;

const PUBLIC_KEY_PREFIXES: Record<PublicIdentifierEntity, string> = {
  feature: 'FEAT',
  project: 'PRJ',
};

export function formatPublicKey(
  entity: PublicIdentifierEntity,
  publicNumber: number,
): string {
  if (
    !Number.isInteger(publicNumber) ||
    publicNumber <= 0 ||
    publicNumber > POSTGRES_INTEGER_MAX
  ) {
    throw new RangeError(`Invalid ${entity} public number`);
  }

  return `${PUBLIC_KEY_PREFIXES[entity]}-${publicNumber}`;
}

export function parseEntityIdentifier(
  entity: PublicIdentifierEntity,
  value: string,
): EntityIdentifier {
  if (UUID_V4_PATTERN.test(value)) {
    return { kind: 'uuid', value };
  }

  const prefix = PUBLIC_KEY_PREFIXES[entity];
  const separatorIndex = value.indexOf('-');
  const suppliedPrefix = value.slice(0, separatorIndex);
  const numericPart = value.slice(separatorIndex + 1);

  if (
    separatorIndex !== prefix.length ||
    suppliedPrefix !== prefix ||
    !POSITIVE_INTEGER_PATTERN.test(numericPart)
  ) {
    throw new BadRequestException(`Invalid ${entity} identifier`);
  }

  const publicNumber = Number(numericPart);

  if (publicNumber > POSTGRES_INTEGER_MAX) {
    throw new BadRequestException(`Invalid ${entity} identifier`);
  }

  return { kind: 'publicNumber', value: publicNumber };
}

export function toIdentifierWhere(identifier: EntityIdentifier) {
  return identifier.kind === 'uuid'
    ? { id: identifier.value }
    : { publicNumber: identifier.value };
}

export class ParseEntityIdentifierPipe implements PipeTransform<
  string,
  EntityIdentifier
> {
  constructor(private readonly entity: PublicIdentifierEntity) {}

  transform(value: string): EntityIdentifier {
    return parseEntityIdentifier(this.entity, value);
  }
}
