import { abundance, family, PrismaClient, species } from '@prisma/client';
import { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import React from 'react';
import { Col, Container, Media, Row } from 'react-bootstrap';
import db from '../../../libs/db/db';
import { formatCSV, mightBeNull } from '../../../libs/db/utils';

type GallProp = species & {
    gallspecies: species;
};

type HostSpeciesProp = species & {
    family: family;
    abundance: abundance;
    host_galls: GallProp[];
};

type Props = {
    host: HostSpeciesProp;
};

function gallAsLink(g: GallProp) {
    return (
        <Link key={g.gallspecies.id} href={`/gall/${g.gallspecies.id}`}>
            <a>{g.gallspecies.name} </a>
        </Link>
    );
}

const Host = ({ host }: Props): JSX.Element => {
    return (
        <div
            style={{
                marginBottom: '5%',
                marginRight: '5%',
            }}
        >
            <Media>
                <img width={170} height={128} className="mr-3" src="" alt={host.name} />
                <Media.Body>
                    <Container className="p-3 border">
                        <Row>
                            <Col>
                                <h2>{host.name}</h2>
                                {host.commonnames ? `(${formatCSV(host.commonnames)})` : ''}
                            </Col>
                            Family:
                            <Link key={host.family.id} href={`/family/${host.family.id}`}>
                                <a> {host.family.name}</a>
                            </Link>
                        </Row>
                        <Row>
                            <Col className="lead p-3">{host.description}</Col>
                        </Row>
                        <Row>
                            <Col>Galls: {host.host_galls.map(gallAsLink)}</Col>
                        </Row>
                        <Row>
                            <Col>Abdundance: {mightBeNull(host.abundance?.abundance)}</Col>
                        </Row>
                    </Container>
                </Media.Body>
            </Media>
        </div>
    );
};

// Use static so that this stuff can be built once on the server-side and then cached.
export const getStaticProps: GetStaticProps = async (context) => {
    if (context === undefined || context.params === undefined || context.params.id === undefined) {
        throw new Error(`Host id can not be undefined.`);
    } else if (Array.isArray(context.params.id)) {
        throw new Error(`Expected single id but got an array of ids ${context.params.id}.`);
    }

    const host = await db.species.findFirst({
        include: {
            abundance: true,
            family: true,
            host_galls: {
                include: {
                    gallspecies: true,
                },
            },
        },
        where: {
            id: { equals: parseInt(context.params.id) },
        },
    });
    return {
        props: {
            host: host,
        },
        revalidate: 1,
    };
};

export const getStaticPaths: GetStaticPaths = async () => {
    const hosts = await db.species.findMany({
        include: {
            family: {},
        },
        where: {
            family: {
                description: { equals: 'Plant' },
            },
        },
    });

    const paths = hosts.map((host) => ({
        params: { id: host.id?.toString() },
    }));

    return { paths, fallback: false };
};

export default Host;
