import * as assert from 'assert';
import * as r from 'ramda';
import { Optional, Result } from 'types';
import * as asn1 from './value';

/**
 * Value: Asn1 value, 最基礎的資料單元
 * Schema: 描述 Value 的意義。例如第一個 value 是 name，第二個是 age...
 * Value + Schema => Data
 */

/**
 * inner: constructed value 內部型別的定義
 * * 對 list (sequenceOf, setOf) 來說，inner 是所有的 sub value 的 schema
 * * 對 struct (sequence) 來說，inner 是 StructFieldSchema[]
 */
export type Schema = {
    tagNumber: number | '*',                // * is a wildcard
    inner: Optional<Schema | StructFieldSchema[]>,

    // 透過 implicit / explicit 重新設定 tag number
    tagging: Optional<{
        implicit: boolean,
        tagNumber: number,
    }>,
}

namespace Schema {
    export function isExplicitTagging (schema: Schema) {
        return schema.tagging
        .map(tagging => ! tagging.implicit)
        .orElse(false);
    }

    export function finalTagNumber (schema: Schema) {
        return schema.tagging
        .map(tagging => tagging.tagNumber as number | '*')
        .orElse(schema.tagNumber);
    }

    export function stripTagging (schema: Schema): Schema {
        return {
            tagNumber: schema.tagNumber,
            inner: schema.inner,
            tagging: Optional.empty(),
        }
    }
}

/** 內部型別 */
type StructFieldSchema = {
    name: string,
    schema: Schema,
    optional: boolean,
}

type Data = asn1.Value | Struct | Data[];

type Struct = {
    [field: string]: Data,
}

export function simplify (data: Data) {
    if (asn1.Value.isa(data)) {             // asn1.Value
        return asn1.Value.simplify(data as asn1.Value);
    } else if (Array.isArray(data)) {       // Data[]
        return data.map(simplify);
    } else {                                // Struct
        const values = r.values(data as Struct)
        .map(simplify);
        return r.fromPairs(r.zip(r.keys(data as Struct) as string[], values));
    }
}

export function compose (schema: Schema, value: asn1.Value): Result<string, Data> {
    return schema
    .inner.map(inner => {
        if (Array.isArray(inner)) {                         // struct
            return asn1.Value.components(value)
            .orFail(`schema error`)
            .chain(values => {
                const fieldSchemas = inner;
                return _align(fieldSchemas, values)
                .chain(pairs => {
                    const fvs = pairs.map(([fieldSchema, value]) => {
                        return compose(_schema(fieldSchema), _value(fieldSchema, value))
                        .map(data => ({[fieldSchema.name]: data}));
                    });
                    return Result.all(fvs)
                    .map(fvs => r.mergeAll(fvs))
                    .ifFail(errors => Optional.filter(errors)[0]);
                });
            });
        } else {                                            // list
            return asn1.Value.components(value)
            .orFail(`schema error`)
            .chain(elements => {
                return Result.all(elements.map(v => compose(inner, v)))
                .ifFail(errors => Optional.filter(errors)[0]);
            });
        }
    })
    .orExec(() => {
        const tag = Schema.finalTagNumber(schema);
        if (tag === '*' || tag === asn1.Value.tagNumber(value)) {
            return Result.ok(value);
        } else {
            return Result.fail("schema error: tag number doesn't match");
        }
    });

    function _align (
        fieldSchemas: StructFieldSchema[],
        values: asn1.Value[],
    ): Result<string, [StructFieldSchema, asn1.Value][]> {
        return align(
            fieldSchemas.map(f => ({ tagNumber: Schema.finalTagNumber(f.schema), optional: f.optional, _: f })),
            values.map(v => ({ tagNumber: asn1.Value.tagNumber(v), _: v })),
        )
        .map(pairs => pairs.map(([f, v]) => pair(f._, v._)))
        .ifFail(error => `align schema (${fieldSchemas.map(f => f.name).join(', ')}) error: ${error}`);
    }

    function _schema (fieldSchema: StructFieldSchema) {
        if (Schema.isExplicitTagging(fieldSchema.schema)) {
            return Schema.stripTagging(fieldSchema.schema);
        } else {
            return fieldSchema.schema;
        }
    }

    function _value (fieldSchema: StructFieldSchema, value: asn1.Value): asn1.Value {
        if (Schema.isExplicitTagging(fieldSchema.schema)) {
            // explicit tagging 的值一定是個單元素 array，內含真正的 value
            const subValues = asn1.Value.components(value).orElse([]);
            assert.ok(subValues.length === 1, 'explicit tagging definition error');
            return subValues[0];
        } else {
            return value;
        }
    }
}

type _S = { tagNumber: number | '*', optional: boolean };
type _V = { tagNumber: number };
function align <S extends _S, V extends _V> (
    schemas: S[],
    values: V[],
): Result<string, [S, V][]> {
    // optional 的 schema 一定要有明確的 tag number 才能把資料對齊
    if (schemas.some(i => i.optional && i.tagNumber === '*')) {
        return Result.fail("tag number of optional field can't be unknown");
    } else if (values.length === 0 && schemas.length > 0) {
        if (schemas.every(i => i.optional)) {
            return Result.ok([]);
        } else {
            return Result.fail('align schema error. schema is not optional but no value available');
        }
    } else if (schemas.length === 0) {
        return Result.ok([]);                                   // schema 沒有定義的 value 就刪掉
    } else {
        const [schema, value] = [schemas[0], values[0]];
        const rest = align(schemas.slice(1), values.slice(1));
        if (schema.tagNumber === '*') {
            return rest.map(rest => [pair(schema, value)].concat(rest));
        } else {
            if (schema.optional === true) {
                if (schema.tagNumber === value.tagNumber) {
                    return rest.map(rest => [pair(schema, value)].concat(rest));
                } else {
                    return align(schemas.slice(1), values);
                }
            } else {
                if (schema.tagNumber === value.tagNumber) {
                    return rest.map(rest => [pair(schema, value)].concat(rest));
                } else {
                    return Result.fail(`align schema error. tag number ${schema.tagNumber} !== ${value.tagNumber}`);
                }
            }
        }
    }
}

function pair <A, B> (a: A, b: B): [A, B] {
    return [a, b];
}
