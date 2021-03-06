import { family, species } from '@prisma/client';
import { pipe } from 'fp-ts/lib/function';
import * as TE from 'fp-ts/lib/TaskEither';
import { TaskEither } from 'fp-ts/lib/TaskEither';
import {
    ALL_FAMILY_TYPES,
    DeleteResult,
    FamilyApi,
    FamilyGallTypesTuples,
    FamilyHostTypesTuple,
    FamilyTypesTuple,
    FamilyUpsertFields,
    FamilyWithSpecies,
    GallTaxon,
    HostTaxon,
    SpeciesApi,
} from '../api/apitypes';
import { handleError } from '../utils/util';
import db from './db';
import { gallDeleteSteps } from './gall';
import { getSpecies } from './species';
import { extractId } from './utils';

export const familyById = (id: number): TaskEither<Error, family[]> => {
    const family = () =>
        db.family.findMany({
            where: { id: { equals: id } },
        });

    return TE.tryCatch(family, handleError);
};

export const speciesByFamily = (id: number): TaskEither<Error, species[]> => {
    const families = () =>
        db.species.findMany({
            where: { family_id: { equals: id } },
            orderBy: { name: 'asc' },
        });

    return TE.tryCatch(families, handleError);
};

const adaptFamily = (f: family): FamilyApi => ({
    ...f,
});

export const allFamilies = (
    types: FamilyTypesTuple | FamilyGallTypesTuples | FamilyHostTypesTuple = ALL_FAMILY_TYPES,
): TaskEither<Error, FamilyApi[]> => {
    const families = () =>
        db.family.findMany({
            orderBy: { name: 'asc' },
            where: { description: { in: [...types] } },
        });

    return pipe(
        TE.tryCatch(families, handleError),
        TE.map((f) => f.map(adaptFamily)),
    );
};

export const getGallMakerFamilies = (): TaskEither<Error, FamilyWithSpecies[]> => {
    const families = () =>
        db.family.findMany({
            include: {
                species: {
                    select: {
                        id: true,
                        name: true,
                        gall: { include: { species: { select: { id: true, name: true } } } },
                    },
                    where: { taxoncode: GallTaxon },
                    orderBy: { name: 'asc' },
                },
            },
            where: { description: { not: 'Plant' } },
            orderBy: { name: 'asc' },
        });

    return TE.tryCatch(families, handleError);
};

export const getHostFamilies = (): TaskEither<Error, FamilyWithSpecies[]> => {
    const families = () =>
        db.family.findMany({
            include: {
                species: {
                    select: {
                        id: true,
                        name: true,
                        gall: { include: { species: { select: { id: true, name: true } } } },
                    },
                    where: { taxoncode: HostTaxon },
                    orderBy: { name: 'asc' },
                },
            },
            where: { description: { equals: 'Plant' } },
            orderBy: { name: 'asc' },
        });

    return TE.tryCatch(families, handleError);
};

export const allFamilyIds = (): TaskEither<Error, string[]> => {
    const families = () =>
        db.family.findMany({
            select: { id: true },
        });

    return pipe(
        TE.tryCatch(families, handleError),
        TE.map((x) => x.map(extractId).map((n) => n.toString())),
    );
};

export const getAllSpeciesForFamily = (id: number): TaskEither<Error, SpeciesApi[]> => {
    return getSpecies([{ family_id: id }]);
};

export const familyDeleteSteps = (familyid: number): Promise<number>[] => {
    return [
        db.family
            .deleteMany({
                where: { id: familyid },
            })
            .then((batch) => batch.count),
    ];
};

export const deleteFamily = (id: number): TaskEither<Error, DeleteResult> => {
    const deleteTx = (speciesids: number[]) =>
        TE.tryCatch(() => db.$transaction(gallDeleteSteps(speciesids).concat(familyDeleteSteps(id))), handleError);

    const toDeleteResult = (batch: number[]): DeleteResult => {
        return {
            type: 'family',
            name: '',
            count: batch.reduce((acc, v) => acc + v, 0),
        };
    };

    return pipe(
        getAllSpeciesForFamily(id),
        TE.map((species) => species.map(extractId)),
        TE.map(deleteTx),
        TE.flatten,
        TE.map(toDeleteResult),
    );
};

export const upsertFamily = (f: FamilyUpsertFields): TaskEither<Error, number> => {
    const upsert = () =>
        db.family.upsert({
            where: { name: f.name },
            update: {
                description: f.description,
            },
            create: {
                name: f.name,
                description: f.description,
            },
        });
    return pipe(
        TE.tryCatch(upsert, handleError),
        TE.map((sp) => sp.id),
    );
};
