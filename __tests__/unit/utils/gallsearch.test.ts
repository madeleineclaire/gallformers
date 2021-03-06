import * as O from 'fp-ts/lib/Option';
import {
    AlignmentApi,
    CellsApi,
    ColorApi,
    GallApi,
    GallLocation,
    GallTaxon,
    GallTexture,
    SearchQuery,
    ShapeApi,
    WallsApi,
} from '../../../libs/api/apitypes';
import { checkGall, testables } from '../../../libs/utils/gallsearch';

const { dontCare } = testables;

describe('dontCare tests', () => {
    test('Should return true for undefined, empty string, or empty array', () => {
        expect(dontCare(undefined)).toBeTruthy();
        expect(dontCare('')).toBeTruthy();
        expect(dontCare([])).toBeTruthy();
    });
});

describe('checkGall tests', () => {
    const g: GallApi = {
        abundance: O.none,
        commonnames: O.none,
        description: O.of('The chicken gall...'),
        family: { id: 1, name: 'Phasianidae', description: '' },
        gall: {
            alignment: O.none,
            cells: O.none,
            color: O.none,
            detachable: O.none,
            galllocation: [],
            galltexture: [],
            shape: O.none,
            walls: O.none,
        },
        genus: 'Gallus',
        hosts: [],
        id: 1,
        name: 'Gallus gallus',
        speciessource: [],
        synonyms: O.none,
        taxoncode: GallTaxon,
    };

    const q: SearchQuery = {
        alignment: O.none,
        cells: O.none,
        color: O.none,
        detachable: O.none,
        host: '',
        locations: [],
        shape: O.none,
        textures: [],
        walls: O.none,
    };

    // helper to create test galls in the tests.
    const makeG = (
        k: keyof GallApi['gall'],
        v: AlignmentApi | CellsApi | ColorApi | number | GallLocation[] | GallTexture[] | ShapeApi | WallsApi,
    ): GallApi => ({
        ...g,
        gall: { ...g.gall, [k]: Array.isArray(v) ? v : O.of(v) },
    });

    test('Should not fail to match for any search field that is undefined, empty string, or empty array', () => {
        expect(checkGall(g, q)).toBeTruthy();
        expect(checkGall(makeG('alignment', { alignment: '', id: 1, description: O.of('') }), q)).toBeTruthy();
        expect(checkGall(makeG('cells', { cells: '', id: 1, description: O.of('') }), q)).toBeTruthy();
        expect(checkGall(makeG('color', { color: '', id: 1, description: O.of('') }), q)).toBeTruthy();
        expect(checkGall(makeG('shape', { shape: '', id: 1, description: O.of('') }), q)).toBeTruthy();
        expect(checkGall(makeG('walls', { walls: '', id: 1, description: O.of('') }), q)).toBeTruthy();
        expect(checkGall(makeG('galllocation', [{ loc: '', id: 1, description: O.of('') }]), q)).toBeTruthy();
        expect(checkGall(makeG('galltexture', [{ tex: '', id: 1, description: O.of('') }]), q)).toBeTruthy();
    });

    test('Should match when provided query has single matches', () => {
        expect(
            checkGall(makeG('alignment', { alignment: 'foo', id: 1, description: O.of('') }), {
                ...q,
                alignment: O.of('foo'),
            }),
        ).toBeTruthy();
        expect(
            checkGall(makeG('cells', { cells: 'foo', id: 1, description: O.of('') }), {
                ...q,
                cells: O.of('foo'),
            }),
        ).toBeTruthy();
        expect(
            checkGall(makeG('color', { color: 'foo', id: 1, description: O.of('') }), {
                ...q,
                color: O.of('foo'),
            }),
        ).toBeTruthy();
        expect(
            checkGall(makeG('detachable', 1), {
                ...q,
                detachable: O.of('yes'),
            }),
        ).toBeTruthy();
        expect(
            checkGall(makeG('detachable', 0), {
                ...q,
                detachable: O.of('no'),
            }),
        ).toBeTruthy();
        expect(
            checkGall(makeG('shape', { shape: 'foo', id: 1, description: O.of('') }), {
                ...q,
                shape: O.of('foo'),
            }),
        ).toBeTruthy();
        expect(
            checkGall(makeG('walls', { walls: 'foo', id: 1, description: O.of('') }), {
                ...q,
                walls: O.of('foo'),
            }),
        ).toBeTruthy();
        expect(
            checkGall(makeG('galllocation', [{ loc: 'foo', id: 1, description: O.of('') }]), {
                ...q,
                locations: ['foo'],
            }),
        ).toBeTruthy();
        expect(
            checkGall(makeG('galltexture', [{ tex: 'foo', id: 1, description: O.of('') }]), {
                ...q,
                textures: ['foo'],
            }),
        ).toBeTruthy();
    });

    test('Should handle sepcial cases for detachable', () => {
        expect(
            checkGall(makeG('detachable', 1), {
                ...q,
                detachable: O.of('unsure'),
            }),
        ).toBeFalsy();
        expect(
            checkGall(makeG('detachable', 1), {
                ...q,
                detachable: O.none,
            }),
        ).toBeTruthy();
        expect(
            checkGall(makeG('detachable', 0), {
                ...q,
                detachable: O.none,
            }),
        ).toBeTruthy();
    });

    test('Should match when provided query has multiple matches', () => {
        expect(
            checkGall(
                {
                    ...g,
                    gall: {
                        ...g.gall,
                        alignment: O.of({ alignment: 'afoo', id: 1, description: O.none }),
                        color: O.of({ color: 'cofoo', id: 1 }),
                        cells: O.of({ cells: 'cefoo', id: 1, description: O.none }),
                        shape: O.of({ shape: 'sfoo', id: 1, description: O.none }),
                        walls: O.of({ walls: 'wfoo', id: 1, description: O.none }),
                        galllocation: [{ loc: 'lfoo', id: 1, description: O.none }],
                        galltexture: [{ tex: 'tfoo', id: 1, description: O.none }],
                    },
                },
                {
                    ...q,
                    alignment: O.of('afoo'),
                    color: O.of('cofoo'),
                    cells: O.of('cefoo'),
                    shape: O.of('sfoo'),
                    walls: O.of('wfoo'),
                    locations: ['lfoo'],
                    textures: ['tfoo'],
                },
            ),
        ).toBeTruthy();
    });

    test('Handles array types correctly (location and texture)', () => {
        const theG = {
            ...g,
            gall: {
                ...g.gall,
                galllocation: [
                    { loc: 'lfoo1', id: 1, description: O.of('') },
                    { loc: 'lfoo2', id: 2, description: O.of('') },
                ],
                galltexture: [{ tex: 'tfoo', id: 1, description: O.of('') }],
            },
        };

        expect(
            checkGall(theG, {
                ...q,
                locations: ['lfoo'],
                textures: ['tfoo'],
            }),
        ).toBeFalsy();

        expect(
            checkGall(theG, {
                ...q,
                locations: ['lfoo1'],
                textures: ['tfoo'],
            }),
        ).toBeTruthy();

        expect(
            checkGall(theG, {
                ...q,
                locations: ['lfoo1', 'lfoo2'],
                textures: ['tfoo'],
            }),
        ).toBeTruthy();

        expect(
            checkGall(theG, {
                ...q,
                locations: ['lfoo1', 'lfoo2', 'nope'],
                textures: ['tfoo'],
            }),
        ).toBeFalsy();

        expect(
            checkGall(theG, {
                ...q,
                locations: [],
                textures: [],
            }),
        ).toBeTruthy();
    });
});
