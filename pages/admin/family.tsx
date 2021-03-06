import { yupResolver } from '@hookform/resolvers/yup';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import { Col, Row } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import Auth from '../../components/auth';
import ControlledTypeahead from '../../components/controlledtypeahead';
import { AdminFormFields, useAPIs } from '../../hooks/useAPIs';
import { ALL_FAMILY_TYPES, DeleteResult, FamilyApi, FamilyUpsertFields } from '../../libs/api/apitypes';
import { allFamilies } from '../../libs/db/family';
import { genOptions } from '../../libs/utils/forms';
import { mightFailWithArray } from '../../libs/utils/util';

const Schema = yup.object().shape({
    value: yup.mixed().required(),
    description: yup.string().required(),
});

type Props = {
    families: FamilyApi[];
};

type FormFields = AdminFormFields<FamilyApi> & Omit<FamilyApi, 'id' | 'name'>;

const Family = (props: Props): JSX.Element => {
    if (!props.families) throw new Error(`The input props for families can not be null or undefined.`);

    const [existing, setExisting] = useState(false);
    const [deleteResults, setDeleteResults] = useState<DeleteResult>();
    const [families, setFamilies] = useState(props.families);

    const { register, handleSubmit, errors, control, setValue, reset } = useForm<FormFields>({
        mode: 'onBlur',
        resolver: yupResolver(Schema),
    });

    const router = useRouter();

    const { doDeleteOrUpsert } = useAPIs<FamilyApi, FamilyUpsertFields>('name', '../api/family/', '../api/family/upsert');

    const onSubmit = async (data: FormFields) => {
        const postDelete = (id: number | string, result: DeleteResult) => {
            setFamilies(families.filter((s) => s.id !== id));
            setDeleteResults(result);
        };

        const postUpdate = (res: Response) => {
            router.push(res.url);
        };

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const convertFormFieldsToUpsert = (fields: FormFields, name: string, id: number): FamilyUpsertFields => ({
            ...fields,
            name: name,
        });

        await doDeleteOrUpsert(data, postDelete, postUpdate, convertFormFieldsToUpsert);
        reset();
    };

    return (
        <Auth>
            <>
                <Head>
                    <title>Add/Edit Families</title>
                </Head>

                <form onSubmit={handleSubmit(onSubmit)} className="m-4 pr-4">
                    <h4>Add or Edit a Family</h4>
                    <Row className="form-group">
                        <Col>
                            Name:
                            <ControlledTypeahead
                                control={control}
                                name="value"
                                placeholder="Name"
                                options={families}
                                labelKey="name"
                                clearButton
                                isInvalid={!!errors.value}
                                newSelectionPrefix="Add a new Family: "
                                allowNew={true}
                                onChangeWithNew={(e, isNew) => {
                                    setExisting(!isNew);
                                    const d = isNew || !e[0] ? '' : (e[0] as FamilyApi).description;
                                    setValue('description', d);
                                }}
                            />
                            {errors.value && <span className="text-danger">The Name is required.</span>}
                        </Col>
                    </Row>
                    <Row className="form-group">
                        <Col>
                            Description:
                            <select name="description" className="form-control" ref={register}>
                                {genOptions(ALL_FAMILY_TYPES)}
                            </select>
                            {errors.description && <span className="text-danger">You must provide the description.</span>}
                        </Col>
                    </Row>
                    <Row className="fromGroup" hidden={!existing}>
                        <Col xs="1">Delete?:</Col>
                        <Col className="mr-auto">
                            <input name="del" type="checkbox" className="form-check-input" ref={register} />
                        </Col>
                        <Col xs="8">
                            <em className="text-danger">
                                Caution. If there are any species (galls or hosts) assigned to this Family they too will be
                                deleted.
                            </em>
                        </Col>
                    </Row>
                    <Row className="form-input">
                        <Col>
                            <input type="submit" className="button" value="Submit" />
                        </Col>
                    </Row>
                    <Row hidden={!deleteResults}>
                        <Col>{`Deleted ${deleteResults?.name}.`}</Col>☹️
                    </Row>
                </form>
            </>
        </Auth>
    );
};

export const getServerSideProps: GetServerSideProps = async () => {
    return {
        props: {
            families: await mightFailWithArray<FamilyApi>()(allFamilies()),
        },
    };
};
export default Family;
