import * as fc from 'fast-check';
import { constant, pipe } from 'fp-ts/lib/function';
import * as TE from 'fp-ts/lib/TaskEither';
import * as U from '../../../libs/utils/util';

test('randInt should always return a number within the bounds', () => {
    fc.assert(
        fc.property(
            fc.tuple(fc.integer(), fc.integer()).filter((t) => t[0] < t[1]),
            (t) => {
                const [lower, upper] = t;
                const x = U.randInt(lower, upper);
                expect(x).toBeLessThanOrEqual(upper);
                expect(x).toBeGreaterThanOrEqual(lower);
            },
        ),
    );
});

test('randInt should fail with invalid inputs', () => {
    fc.property(
        fc.tuple(fc.integer(), fc.integer()).filter((t) => t[0] >= t[1]),
        (t) => {
            const [lower, upper] = t;
            expect(U.randInt(lower, upper)).toThrow();
        },
    );
});

test('hasProp should detect props', () => {
    fc.property(fc.object(), (o) => {
        for (const p in o) {
            expect(U.hasProp(o, p)).toBeTruthy();
        }
        fc.property(
            fc.string().filter((s) => !U.hasProp(o, s)),
            (p) => {
                expect(U.hasProp(o, p)).toBeFalsy();
            },
        );
    });
});

const anError = new Error('this is an expected test exception, it does not mean anything went awry!');

test('mightFail should return the passed in default on failure', async () => {
    // eslint-disable-next-line prettier/prettier
    const r = await pipe(
        TE.left<Error, unknown[]>(anError),
        U.mightFail(constant(new Array<unknown>())),
    );

    expect(r.length).toBe(0);
});

test('errorThrow should always throw', () => {
    expect(() => U.errorThrow(anError)).toThrow();
});

test('handleFailure should convert to an Error', () => {
    expect(U.handleError('foo').message).toBe('foo');
});

test('truncateAtWord should handle varying input', () => {
    fc.property(fc.set(fc.unicodeString()), (values) => {
        const s = values.join(' ');
        const t = U.truncateAtWord(2)(s);
        expect(t.length).toBeLessThanOrEqual(s.length);
        expect(t.split(' ').length).toBeLessThanOrEqual(s.split(' ').length);
    });
});
