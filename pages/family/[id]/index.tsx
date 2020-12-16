import { family, species } from '@prisma/client';
import { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import React from 'react';
import { Col, Container, ListGroup, Media, Row } from 'react-bootstrap';
import { GallTaxon } from '../../../libs/api/apitypes';
import { allFamilyIds, familyById, speciesByFamily } from '../../../libs/db/family';
import { getStaticPathsFromIds, getStaticPropsWithContext } from '../../../libs/pages/nextPageHelpers';

type Props = {
    family: family;
    species: species[];
};

function makeSpeciesLink(s: species) {
    const speciesType = s.taxoncode === GallTaxon ? 'gall' : 'host';
    return (
        <Link key={s.id} href={`/${speciesType}/${s.id}`}>
            <a>{s.name} </a>
        </Link>
    );
}

const Family = ({ family, species }: Props): JSX.Element => {
    return (
        <div
            style={{
                marginBottom: '5%',
                marginRight: '5%',
            }}
        >
            <Media>
                <Media.Body>
                    <Container className="p-3">
                        <Row>
                            <Col>
                                <h1>{family.name}</h1>
                            </Col>
                        </Row>
                        <Row>
                            <Col className="lead p-3">{family.description}</Col>
                        </Row>
                        <Row>
                            <ListGroup>
                                {species.map((s) => (
                                    <ListGroup.Item key={s.id}>{makeSpeciesLink(s)}</ListGroup.Item>
                                ))}
                            </ListGroup>
                        </Row>
                    </Container>
                </Media.Body>
            </Media>
        </div>
    );
};

// Use static so that this stuff can be built once on the server-side and then cached.
export const getStaticProps: GetStaticProps = async (context) => {
    const family = getStaticPropsWithContext(context, familyById, 'family');
    const species = getStaticPropsWithContext(context, speciesByFamily, 'species', false, true);

    return {
        props: {
            family: (await family)[0],
            species: await species,
        },
        revalidate: 1,
    };
};

export const getStaticPaths: GetStaticPaths = async () => getStaticPathsFromIds(allFamilyIds);

export default Family;
