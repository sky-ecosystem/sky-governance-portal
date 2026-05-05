/*

SPDX-FileCopyrightText: © 2026 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import { verifySvixSignature } from '../privy';

const RAW_BODY = '{"type":"privy.test","message":"hi"}';
const SVIX_ID = 'msg_test_id';

// Standard Webhooks: HMAC-SHA256 over `${id}.${timestamp}.${body}` with the
// base64-decoded secret bytes, base64-encoded result, prefixed with `v1,`.
function sign(body: string, id: string, timestamp: string, secret: string): string {
  const stripped = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret;
  const keyBytes = Buffer.from(stripped, 'base64');
  const sig = crypto
    .createHmac('sha256', keyBytes)
    .update(`${id}.${timestamp}.${body}`)
    .digest('base64');
  return `v1,${sig}`;
}

const SECRET_RAW = Buffer.from('test-secret-bytes-for-svix-hmac').toString('base64');
const SECRET_PREFIXED = `whsec_${SECRET_RAW}`;

describe('verifySvixSignature', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-04T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function nowSec(): string {
    return Math.floor(Date.now() / 1000).toString();
  }

  it('accepts a valid signature with whsec_-prefixed secret', () => {
    const ts = nowSec();
    const header = sign(RAW_BODY, SVIX_ID, ts, SECRET_PREFIXED);
    expect(() => verifySvixSignature(RAW_BODY, SVIX_ID, ts, header, SECRET_PREFIXED)).not.toThrow();
  });

  it('accepts a valid signature with raw (unprefixed) secret', () => {
    const ts = nowSec();
    const header = sign(RAW_BODY, SVIX_ID, ts, SECRET_RAW);
    expect(() => verifySvixSignature(RAW_BODY, SVIX_ID, ts, header, SECRET_RAW)).not.toThrow();
  });

  it('rejects a tampered signature', () => {
    const ts = nowSec();
    expect(() =>
      verifySvixSignature(RAW_BODY, SVIX_ID, ts, 'v1,bogus-signature-value', SECRET_PREFIXED)
    ).toThrow('No matching signature found');
  });

  it('rejects a signature computed with the wrong secret', () => {
    const ts = nowSec();
    const wrongSecret = `whsec_${Buffer.from('different-secret').toString('base64')}`;
    const header = sign(RAW_BODY, SVIX_ID, ts, wrongSecret);
    expect(() => verifySvixSignature(RAW_BODY, SVIX_ID, ts, header, SECRET_PREFIXED)).toThrow(
      'No matching signature found'
    );
  });

  it('rejects a signature when the body has been tampered with', () => {
    const ts = nowSec();
    const header = sign(RAW_BODY, SVIX_ID, ts, SECRET_PREFIXED);
    expect(() =>
      verifySvixSignature(RAW_BODY + 'extra', SVIX_ID, ts, header, SECRET_PREFIXED)
    ).toThrow('No matching signature found');
  });

  it('rejects a timestamp older than the 5-minute tolerance', () => {
    const tooOld = (Math.floor(Date.now() / 1000) - 6 * 60).toString();
    const header = sign(RAW_BODY, SVIX_ID, tooOld, SECRET_PREFIXED);
    expect(() => verifySvixSignature(RAW_BODY, SVIX_ID, tooOld, header, SECRET_PREFIXED)).toThrow(
      'Timestamp outside tolerance'
    );
  });

  it('rejects a timestamp too far in the future', () => {
    const tooFuture = (Math.floor(Date.now() / 1000) + 6 * 60).toString();
    const header = sign(RAW_BODY, SVIX_ID, tooFuture, SECRET_PREFIXED);
    expect(() =>
      verifySvixSignature(RAW_BODY, SVIX_ID, tooFuture, header, SECRET_PREFIXED)
    ).toThrow('Timestamp outside tolerance');
  });

  it('accepts a timestamp at the edge of tolerance', () => {
    const edge = (Math.floor(Date.now() / 1000) - 5 * 60).toString();
    const header = sign(RAW_BODY, SVIX_ID, edge, SECRET_PREFIXED);
    expect(() => verifySvixSignature(RAW_BODY, SVIX_ID, edge, header, SECRET_PREFIXED)).not.toThrow();
  });

  it('rejects a non-numeric timestamp', () => {
    expect(() =>
      verifySvixSignature(RAW_BODY, SVIX_ID, 'not-a-number', 'v1,sig', SECRET_PREFIXED)
    ).toThrow('Invalid timestamp');
  });

  it('accepts when one of multiple v1 entries matches', () => {
    const ts = nowSec();
    const valid = sign(RAW_BODY, SVIX_ID, ts, SECRET_PREFIXED);
    const header = `v1,bogus-first ${valid}`;
    expect(() => verifySvixSignature(RAW_BODY, SVIX_ID, ts, header, SECRET_PREFIXED)).not.toThrow();
  });

  it('ignores non-v1 entries when finding a match', () => {
    const ts = nowSec();
    const valid = sign(RAW_BODY, SVIX_ID, ts, SECRET_PREFIXED);
    const header = `v2,future-version-sig ${valid}`;
    expect(() => verifySvixSignature(RAW_BODY, SVIX_ID, ts, header, SECRET_PREFIXED)).not.toThrow();
  });

  it('rejects when only non-v1 entries are present', () => {
    const ts = nowSec();
    expect(() =>
      verifySvixSignature(RAW_BODY, SVIX_ID, ts, 'v2,some-sig v3,another-sig', SECRET_PREFIXED)
    ).toThrow('No matching signature found');
  });

  it('rejects an empty signature header', () => {
    const ts = nowSec();
    expect(() => verifySvixSignature(RAW_BODY, SVIX_ID, ts, '', SECRET_PREFIXED)).toThrow(
      'No matching signature found'
    );
  });

  it('rejects when svixId differs from the one used to sign', () => {
    const ts = nowSec();
    const header = sign(RAW_BODY, SVIX_ID, ts, SECRET_PREFIXED);
    expect(() =>
      verifySvixSignature(RAW_BODY, 'msg_different_id', ts, header, SECRET_PREFIXED)
    ).toThrow('No matching signature found');
  });
});
