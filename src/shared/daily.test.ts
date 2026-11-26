import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { COURSE_CATALOG, DEFAULT_COURSE } from './courses/index.ts';
import { createStarterDesign, withTile } from './editor/design.ts';
import {
  COMMUNITY_COURSE_ID,
  courseForPost,
  challengeNumber,
  courseForDate,
  parsePostData,
  postLabel,
  previousDateKey,
  utcDateKey,
} from './daily.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
const EPOCH = '2026-11-18';
const addDays = (key: string, days: number): string =>
  utcDateKey(new Date(Date.parse(`${key}T00:00:00Z`) + days * DAY_MS));

describe('utcDateKey', () => {
  test('uses the UTC date, not the local one', () => {
    // 23:30 in New York on Nov 18 is already Nov 19 in UTC.
    assert.equal(
      utcDateKey(new Date('2026-11-18T23:30:00-05:00')),
      '2026-11-19'
    );
    // 01:00 in Tokyo on Nov 19 is still Nov 18 in UTC.
    assert.equal(
      utcDateKey(new Date('2026-11-19T01:00:00+09:00')),
      '2026-11-18'
    );
  });

  test('handles the first and last millisecond of a day', () => {
    assert.equal(utcDateKey(new Date(Date.UTC(2026, 10, 18))), '2026-11-18');
    assert.equal(
      utcDateKey(new Date(Date.UTC(2026, 10, 18, 23, 59, 59, 999))),
      '2026-11-18'
    );
  });
});

describe('previousDateKey', () => {
  test('steps back across month and year ends', () => {
    assert.equal(previousDateKey('2026-11-19'), '2026-11-18');
    assert.equal(previousDateKey('2026-12-01'), '2026-11-30');
    assert.equal(previousDateKey('2027-03-01'), '2027-02-28');
    assert.equal(previousDateKey('2028-03-01'), '2028-02-29');
    assert.equal(previousDateKey('2027-01-01'), '2026-12-31');
  });
});

describe('challengeNumber', () => {
  test('the epoch is challenge #1 and numbers go up by one a day', () => {
    assert.equal(challengeNumber(EPOCH), 1);
    assert.equal(challengeNumber('2026-11-19'), 2);
    assert.equal(challengeNumber('2026-12-01'), 14);
    assert.equal(challengeNumber('2027-03-15'), 118);
  });

  test('days before the epoch count down from 0', () => {
    assert.equal(challengeNumber('2026-11-17'), 0);
  });
});

describe('courseForDate', () => {
  test('rotates through the whole catalog in order, then repeats', () => {
    const count = COURSE_CATALOG.length;
    for (let day = 0; day < count * 2 + 1; day++) {
      assert.equal(
        courseForDate(addDays(EPOCH, day)).id,
        COURSE_CATALOG[day % count]?.id
      );
    }
  });

  test('stays inside the catalog for dates before the epoch', () => {
    const last = COURSE_CATALOG[COURSE_CATALOG.length - 1];
    assert.equal(courseForDate(addDays(EPOCH, -1)).id, last?.id);
  });
});

describe('parsePostData', () => {
  const courseId = COURSE_CATALOG[1]?.id ?? DEFAULT_COURSE.id;
  const fallback = { kind: 'practice', courseId: DEFAULT_COURSE.id };

  test('accepts valid daily data', () => {
    const daily = { kind: 'daily', courseId, date: '2026-11-20', number: 3 };
    assert.deepEqual(parsePostData(daily), daily);
  });

  test('accepts valid practice data', () => {
    assert.deepEqual(parsePostData({ kind: 'practice', courseId }), {
      kind: 'practice',
      courseId,
    });
  });

  test('drops unknown extra fields', () => {
    assert.deepEqual(parsePostData({ kind: 'practice', courseId, x: 1 }), {
      kind: 'practice',
      courseId,
    });
  });

  test('daily data with a bad date or number becomes practice on that course', () => {
    const broken: unknown[] = [
      { kind: 'daily', courseId, number: 3 },
      { kind: 'daily', courseId, date: '20-11-2026', number: 3 },
      { kind: 'daily', courseId, date: '2026-11-20', number: '3' },
    ];
    for (const value of broken) {
      assert.deepEqual(parsePostData(value), { kind: 'practice', courseId });
    }
  });

  test('junk falls back to practice on the default course', () => {
    const junk: unknown[] = [
      null,
      undefined,
      42,
      'daily',
      [],
      {},
      { kind: 'daily' },
      { courseId: 7 },
      { kind: 'practice', courseId: 'no-such-course' },
    ];
    for (const value of junk) {
      assert.deepEqual(parsePostData(value), fallback);
    }
  });
});

describe('postLabel', () => {
  test('labels daily posts with number and date', () => {
    assert.equal(
      postLabel({
        kind: 'daily',
        courseId: DEFAULT_COURSE.id,
        date: EPOCH,
        number: 1,
      }),
      'Daily #1 · Nov 18'
    );
  });

  test('labels practice posts', () => {
    assert.equal(
      postLabel({ kind: 'practice', courseId: DEFAULT_COURSE.id }),
      'Practice'
    );
  });
});

describe('community posts', () => {
  const design = createStarterDesign();
  const community = {
    kind: 'community',
    design,
    author: 'green_putter',
    creatorStrokes: 2,
  };

  test('valid community data round-trips through JSON', () => {
    assert.deepEqual(
      parsePostData(JSON.parse(JSON.stringify(community))),
      community
    );
  });

  test('builds its course from the design', () => {
    const course = courseForPost(parsePostData(community));
    assert.equal(course.id, COMMUNITY_COURSE_ID);
    assert.equal(course.name, design.name);
    assert.equal(course.par, design.par);
  });

  test('labels the post with its author', () => {
    assert.equal(postLabel(parsePostData(community)), 'By u/green_putter');
  });

  test('bad community data falls back to the default course', () => {
    const fallback = { kind: 'practice', courseId: DEFAULT_COURSE.id };
    const bad: unknown[] = [
      { ...community, design: { ...design, tiles: 'x' } },
      // Parses, but no longer builds into a playable course.
      { ...community, design: withTile(design, 0, 0, 'track') },
      { ...community, author: '' },
      { ...community, author: 'has spaces' },
      { ...community, author: 7 },
      { ...community, creatorStrokes: 0 },
      { ...community, creatorStrokes: 11 },
      { ...community, creatorStrokes: 2.5 },
      { kind: 'community' },
    ];
    for (const value of bad) assert.deepEqual(parsePostData(value), fallback);
  });
});
