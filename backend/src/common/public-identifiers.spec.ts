import { BadRequestException } from '@nestjs/common';

import {
  formatPublicKey,
  parseEntityIdentifier,
  toIdentifierWhere,
} from './public-identifiers';

describe('public identifiers', () => {
  it('formats positive Project and Feature public numbers', () => {
    expect(formatPublicKey('project', 204)).toBe('PRJ-204');
    expect(formatPublicKey('feature', 5831)).toBe('FEAT-5831');
  });

  it('parses strict public keys', () => {
    expect(parseEntityIdentifier('project', 'PRJ-204')).toEqual({
      kind: 'publicNumber',
      value: 204,
    });
    expect(parseEntityIdentifier('feature', 'FEAT-5831')).toEqual({
      kind: 'publicNumber',
      value: 5831,
    });
  });

  it('accepts UUID v4 identifiers for transition compatibility', () => {
    const uuid = '20000000-0000-4000-8000-000000000002';

    expect(parseEntityIdentifier('project', uuid)).toEqual({
      kind: 'uuid',
      value: uuid,
    });
    expect(toIdentifierWhere({ kind: 'uuid', value: uuid })).toEqual({
      id: uuid,
    });
  });

  it.each([
    ['project', 'PRJ-0'],
    ['project', 'PRJ-01'],
    ['project', 'PRJ--1'],
    ['project', 'PRJ-1.5'],
    ['project', 'prj-1'],
    ['project', 'FEAT-1'],
    ['project', 'PRJ-2147483648'],
    ['feature', 'FEAT-0'],
    ['feature', 'FEAT-01'],
    ['feature', 'PRJ-1'],
    ['feature', 'not-an-identifier'],
  ] as const)('rejects malformed %s identifier %s', (entity, value) => {
    expect(() => parseEntityIdentifier(entity, value)).toThrow(
      BadRequestException,
    );
  });

  it.each([0, -1, 1.5, 2_147_483_648])(
    'refuses to format invalid public number %s',
    (publicNumber) => {
      expect(() => formatPublicKey('project', publicNumber)).toThrow(
        RangeError,
      );
    },
  );
});
