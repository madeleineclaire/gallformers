import { pipe } from 'fp-ts/lib/function';
import * as TE from 'fp-ts/lib/TaskEither';
import { GallHostUpdateFields, SimpleSpecies } from '../api/apitypes';
import { ExtractTFromPromise } from '../utils/types';
import { handleError } from '../utils/util';
import db from './db';
import { hostsByGenus } from './host';
import { extractId } from './utils';

const toValues = (gallid: number, hostids: number[]) => hostids.map((h) => `(NULL, ${gallid}, ${h})`).join(',');

const toInsertStatement = (gallid: number, hostids: number[]): Promise<number> =>
    db.$executeRaw(`INSERT INTO host (id, gall_species_id, host_species_id) VALUES ${toValues(gallid, hostids)};`);

export const updateGallHosts = (gallhost: GallHostUpdateFields): TE.TaskEither<Error, number[]> => {
    const doTx = (genusHosts: number[]) => () => {
        const deletes = db.$executeRaw(`DELETE FROM host WHERE gall_species_id = ${gallhost.gall};`);
        const hosts = [...new Set([...gallhost.hosts, ...genusHosts])];

        const steps = [deletes];
        if (hosts.length > 0) steps.push(toInsertStatement(gallhost.gall, hosts));

        return db.$transaction(steps);
    };

    return pipe(
        hostsByGenus(gallhost.genus),
        TE.map((hosts) => hosts.map(extractId)),
        TE.chain((genusHosts) => TE.tryCatch(doTx(genusHosts), handleError)),
    );
};

export const hostsByGallId = (gallid: number): TE.TaskEither<Error, SimpleSpecies[]> => {
    const lookupHosts = () =>
        db.host.findMany({
            include: { hostspecies: true },
            where: { gall_species_id: gallid },
        });

    const toSpeciesApi = (hosts: ExtractTFromPromise<ReturnType<typeof lookupHosts>>): SimpleSpecies[] =>
        hosts.flatMap((h) =>
            h.hostspecies != undefined
                ? { ...h.hostspecies, taxoncode: h.hostspecies.taxoncode ? h.hostspecies.taxoncode : '' }
                : [],
        );

    // eslint-disable-next-line prettier/prettier
    return pipe(
        TE.tryCatch(lookupHosts, handleError),
        TE.map(toSpeciesApi),
    );
};
