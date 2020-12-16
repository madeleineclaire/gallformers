import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import * as O from 'fp-ts/lib/Option';
import * as TA from 'fp-ts/lib/Task';
import * as TE from 'fp-ts/lib/TaskEither';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/client';
import { ParsedUrlQuery } from 'querystring';
import { DeleteResult } from './apitypes';

/**
 *
 * @param req All of the boilerplate for an API endpoint that takes an ID as its path part.
 * @param res
 * @param fDelete
 */
export async function apiIdEndpoint(
    req: NextApiRequest,
    res: NextApiResponse,
    fDelete: (id: number) => TE.TaskEither<Error, DeleteResult>,
): Promise<void> {
    const session = await getSession({ req });
    if (!session) {
        res.status(401).end();
    }

    if (req.method === 'DELETE') {
        const invalidQueryErr: Err = {
            status: 400,
            msg: 'No valid query provided. You must provide an id value to delete.',
        };

        await pipe(
            extractQueryParam(req.query, 'id'),
            O.map(parseInt),
            O.map(fDelete),
            O.map(TE.mapLeft(toErr)),
            // eslint-disable-next-line prettier/prettier
            O.fold(
                () => E.left<Err, TE.TaskEither<Err, DeleteResult>>(invalidQueryErr), 
                E.right
            ),
            TE.fromEither,
            TE.flatten,
            TE.fold(sendErrResponse(res), sendSuccResponse(res)),
        )();
    } else {
        res.status(405).end();
    }
}

export async function apiUpsertEndpoint<T, R>(
    req: NextApiRequest,
    res: NextApiResponse,
    fUpsert: (item: T) => TE.TaskEither<Error, R>,
    onComplete: (res: NextApiResponse) => (results: R) => TA.Task<never>,
): Promise<void> {
    const session = await getSession({ req });
    if (!session) {
        res.status(401).end();
    }

    const invalidQueryErr: Err = {
        status: 400,
        msg: 'Can not upsert. No valid item provided in request body.',
    };

    //TODO - figure out how to make this type safe. Maybe need to have caller pass conversion f?
    const t = !req.body ? O.none : O.of(req.body as T);

    await pipe(
        t,
        O.map(fUpsert),
        O.map(TE.mapLeft(toErr)),
        // eslint-disable-next-line prettier/prettier
        O.fold(
            () => E.left<Err, TE.TaskEither<Err, R>>(invalidQueryErr), 
            E.right
        ),
        TE.fromEither,
        TE.flatten,
        TE.fold(sendErrResponse(res), onComplete(res)),
    )();
}

/**
 * Function that is meant to be partially applied and passed to apiUpsertEndpoint or similar.
 * Redirects (200) to the conputed path.
 * @param path the path to redirect to. The id that is later fetched will be appended
 * (N.B. no slash so you must provide it or some other separator, e.g. #).
 */
export const onCompleteRedirect = (path: string) => (res: NextApiResponse) => (pathEnd: unknown): TA.Task<never> => {
    res.status(200).redirect(`/${path}${pathEnd}`).end();
    return TA.never;
};

/**
 * Function that is meant to be partially applied and passed to apiUpsertEndpoint or similar.
 * Sends the results as a JSON with status 200.
 * @param res
 */
export const onCompleteSendJson = (res: NextApiResponse) => (results: unknown): TA.Task<never> => {
    res.status(200).send(JSON.stringify(results));
    return TA.never;
};

/**
 * Given a @ParsedUrlQuery try an extract a query param from it that matches the @prop name passed in.
 * @param q
 * @param prop
 * @returns an Option that contains the query value as a string if it was found.
 */
export const extractQueryParam = (q: ParsedUrlQuery, prop: string): O.Option<string> => {
    const p = q[prop];
    if (!p) return O.none;
    if (Array.isArray(p)) return O.of(p[0]);
    return O.of(p);
};

/**
 * Given a @NextApiRequest try and extract a query param from it that matches the @prop name passed in.
 * @param prop
 * @returns an Option that contains the query value as a string if it was found.
 */
export const getQueryParam = (req: NextApiRequest) => (prop: string): O.Option<string> => extractQueryParam(req.query, prop);

/**
 * Send a 200 success repsonse as JSON.
 * @param res
 * @returns we only have a return value to make it easier to compose in pipes. This function sends the requests without delay.
 */
export const sendSuccResponse = (res: NextApiResponse) => <T>(t: T): TA.Task<never> => {
    res.status(200).json(t);
    return TA.never; // make type checker happy
};

/**
 * Send a @status error back to the client with @e as the message, plain text.
 * @param res
 * @returns we only have a return value to make it easier to compose in pipes. This function sends the requests without delay.
 */
export const sendErrResponse = (res: NextApiResponse) => (e: Err): TA.Task<never> => {
    console.error(e.e ? e.e : e.msg);
    res.status(e.status).end(e.msg);
    return TA.never; // make type checker happy
};

/**
 * Type used for representing Repsonse failures back to the client.
 */
export type Err = {
    status: number;
    msg: string;
    e?: Error;
};

/**
 * Converts an @Error to an @Err type.
 * @param e
 */
export const toErr = (e: Error): Err => ({
    status: 500,
    msg: e.message,
    e: e,
});
