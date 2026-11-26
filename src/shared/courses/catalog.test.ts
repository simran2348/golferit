import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { isPointInPolygon } from '../course/geometry.ts';
import { isBallInWater } from '../course/rules.ts';
import { MAX_PAR, MIN_PAR } from '../editor/design.ts';
import { COURSE_CATALOG, DEFAULT_COURSE, getCourseById } from './index.ts';

describe('course catalog', () => {
  test('has unique ids that getCourseById finds', () => {
    const ids = COURSE_CATALOG.map((course) => course.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const course of COURSE_CATALOG) {
      assert.equal(getCourseById(course.id), course);
    }
    assert.equal(getCourseById('no-such-course'), undefined);
  });

  test('includes the default course', () => {
    assert.ok(COURSE_CATALOG.includes(DEFAULT_COURSE));
  });

  for (const course of COURSE_CATALOG) {
    describe(course.name, () => {
      test('tee and cup are on the course and not in water', () => {
        for (const point of [course.tee, course.cup]) {
          assert.ok(isPointInPolygon(point, course.outline));
          assert.equal(isBallInWater(point, course), false);
        }
      });

      test('par is in range', () => {
        assert.ok(Number.isInteger(course.par));
        assert.ok(course.par >= MIN_PAR && course.par <= MAX_PAR);
      });

      test('ponds lie inside the outline', () => {
        for (const pond of course.water) {
          for (const point of pond.outline) {
            assert.ok(isPointInPolygon(point, course.outline), `${pond.id}`);
          }
        }
      });
    });
  }
});
