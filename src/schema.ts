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
 * any: any asn1 value (primitive, list, struct, ...)
 * list: sequenceOf, setOf
 */
export type Schema = AnySchema | ListSchema | StructSchema;

/** any asn1 value (primitive, list, struct) */
type AnySchema = {
    name: 'any',
};

/** sequenceOf, setOf */
type ListSchema = {
    name: 'list',
    inner: Schema,
}

/** 內部型別 */
type StructFieldSchema = {
    fieldName: string,
    schema: Schema,
    tagging: Optional<{
        implicit: boolean,
        tag: number,
    }>,
}

type StructSchema = {
    name: 'struct',
    fields: StructFieldSchema[],
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
    if (schema.name === 'any') {
        return Result.ok(value);
    } else if (schema.name === 'list') {
        return asn1.Value.components(value)
        .or_fail(`schema error`)
        .chain(elements => {
            if (schema.inner.name === 'any') {
                return Result.ok<string, Data[]>(elements);
            } else {
                return Result.all(elements.map(v => compose(schema.inner, v)))
                .if_error(errors => Optional.cat(errors)[0]);
            }
        });
    } else if (schema.name === 'struct') {
        return asn1.Value.components(value)
        .or_fail(`schema error`)
        .chain(fvalues => {
            const ps = pairs(schema.fields, fvalues);
            const fields = ps.map(p => p[0]);
            const values = ps.map(([fieldSchema, value]) => {
                return compose(fieldSchema.schema, value);
            });
            return Result.all(values)
            .map(values => {
                return r.mergeAll(r.zip(fields, values).map(([field, value]) => r.objOf(field.fieldName, value)));
            })
            .if_error(errors => Optional.cat(errors)[0]);
        });
    } else {
        const _: never = schema;
    }
}

function pairs (fieldSchemas: StructFieldSchema[], values: asn1.Value[]): [StructFieldSchema, asn1.Value][] {
    if (fieldSchemas.length === 0 || values.length === 0) {
        return [];
    } else {
        const [fieldSchema, value] = [fieldSchemas[0], values[0]];
        return fieldSchema.tagging
        .map(tagging => {
            if (tagging.tag === asn1.Value.tag(value)) {
                // 這個 optional 欄位有值
                let cur: [StructFieldSchema, asn1.Value];
                if (tagging.implicit === true) {
                    cur = [fieldSchema, value];
                } else {
                    // explicit tagging 的值一定是個 array，內含真正的 value
                    const elements = asn1.Value.components(value);
                    assert.ok(elements.is_present(), 'explicit tagging definition error');
                    cur = [fieldSchema, elements.get()[0]];
                }
                return [cur].concat(pairs(fieldSchemas.slice(1), values.slice(1)));
            } else {
                // 沒有值，忽略
                return pairs(fieldSchemas.slice(1), values);
            }
        })
        .or_exec(() => {
            return ([[fieldSchema, value]] as [[StructFieldSchema, asn1.Value]])
            .concat(pairs(fieldSchemas.slice(1), values.slice(1)));
        });
    }
}
