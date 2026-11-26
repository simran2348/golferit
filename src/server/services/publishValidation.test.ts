import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { ShotRecord } from '../../shared/api.ts';
import { MAX_STROKES } from '../../shared/constants/game.ts';
import { buildCourseFromDesign } from '../../shared/editor/buildCourse.ts';
import { createStarterDesign, withTile } from '../../shared/editor/design.ts';
import { validatePublish } from './publishValidation.ts';

const design = createStarterDesign();
const built = buildCourseFromDesign(design, 'x');
assert.ok(built.ok);
const { tee } = built.course;
const putt: ShotRecord = {
  t: 1,
  x: tee.x,
  z: tee.z,
  dx: 0,
  dz: -1,
  power: 0.5,
};

describe('validatePublish', () => {
  test('accepts a buildable design with a plausible winning run', () => {
    const result = validatePublish({ design, shots: [putt], penalties: 0 });
    assert.equal(typeof result, 'object');
    assert.deepEqual(
      typeof result === 'object' ? [result.strokes, result.design] : null,
      [1, design]
    );
  });

  test('counts penalties in the creator strokes', () => {
    const second: ShotRecord = { ...putt, t: 3 };
    const result = validatePublish({
      design,
      shots: [putt, second],
      penalties: 1,
    });
    assert.equal(typeof result === 'object' ? result.strokes : result, 3);
  });

  test('rejects junk and malformed designs', () => {
    const junk: unknown[] = [null, 'x', {}, { design: { version: 1 } }];
    for (const body of junk)
      assert.equal(typeof validatePublish(body), 'string');
  });

  test('rejects a design that does not build, with the builder message', () => {
    const broken = withTile(design, 0, 0, 'track');
    assert.match(
      String(validatePublish({ design: broken, shots: [putt], penalties: 0 })),
      /connected in one piece/
    );
  });

  test('requires a test run', () => {
    assert.match(
      String(validatePublish({ design })),
      /test run before publishing/
    );
  });

  test('rejects a run that does not fit this course', () => {
    const notFromTee: ShotRecord = { ...putt, x: tee.x + 1 };
    assert.match(
      String(validatePublish({ design, shots: [notFromTee], penalties: 0 })),
      /from the tee/
    );
    const tooMany = Array.from({ length: MAX_STROKES + 1 }, (_, i) => ({
      ...putt,
      t: i,
    }));
    assert.match(
      String(validatePublish({ design, shots: tooMany, penalties: 0 })),
      /Too many strokes/
    );
  });
});
