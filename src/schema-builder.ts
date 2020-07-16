import * as r from 'ramda';
import { Optional, Result, Json } from 'types';
import { Value } from './value';
import { Schema, compose as _compose, simplify } from './schema';

export namespace schema {
    export function any () {
        return new SchemaBuilder(blank, false);
    }

    export function value (tagNumber: number) {
        return new SchemaBuilder(amend(blank, { tagNumber }), false);
    }

    export function object (inner: {[field: string]: SchemaBuilder}) {
        return new SchemaBuilder(blank, false).object(inner);
    }

    export function array (schema: SchemaBuilder) {
        return new SchemaBuilder(blank, false).array(schema);
    }

    /* http://luca.ntop.org/Teaching/Appunti/asn1.html */
    export const int = () => new SchemaBuilder(amend(blank, { tagNumber: 2 }), false);      // integer
    export const bit = () => new SchemaBuilder(amend(blank, { tagNumber: 3 }), false);      // bit string
    export const oct = () => new SchemaBuilder(amend(blank, { tagNumber: 4 }), false);      // octet string
    export const nil = () => new SchemaBuilder(amend(blank, { tagNumber: 5 }), false);      // null
    export const oid = () => new SchemaBuilder(amend(blank, { tagNumber: 6 }), false);      // object identifier
    export const seq = () => new SchemaBuilder(amend(blank, { tagNumber: 16 }), false);     // sequence and sequenceOf
    export const set = () => new SchemaBuilder(amend(blank, { tagNumber: 17 }), false);     // set and setOf
    export const str = () => new SchemaBuilder(amend(blank, { tagNumber: 19 }), false);     // printable string
    export const t61 = () => new SchemaBuilder(amend(blank, { tagNumber: 20 }), false);     // T61 string
    export const ia5 = () => new SchemaBuilder(amend(blank, { tagNumber: 22 }), false);     // IA5 string
    export const utctime = () => new SchemaBuilder(amend(blank, { tagNumber: 23 }), false); // UTCTime

    const blank: Schema = {
        tagNumber: '*',
        inner: Optional.empty(),
        tagging: Optional.empty(),
    }
}

export function compose (schema: SchemaBuilder, value: Value, verbose?: boolean): Result<string, Json> {
    const result = _compose(schema.build(), value);
    return verbose ? result : result.map(simplify);
}

class SchemaBuilder {
    constructor (
        private schema: Schema,
        private _optional: boolean,
    ) {}

    build (): Schema {
        return this.schema;
    }

    implicit (tagNumber: number): SchemaBuilder {
        const s2 = amend(this.schema, {
            tagging: Optional.of({
                implicit: true,
                tagNumber: tagNumber,
            }),
        });
        return new SchemaBuilder(s2, this._optional);
    }

    explicit (tagNumber: number): SchemaBuilder {
        const s2 = amend(this.schema, {
            tagging: Optional.of({
                implicit: false,
                tagNumber: tagNumber,
            }),
        });
        return new SchemaBuilder(s2, this._optional);
    }

    optional (): SchemaBuilder {
        return new SchemaBuilder(this.schema, true);
    }

    object (inner: {[field: string]: SchemaBuilder}): SchemaBuilder {
        const fieldSchemas = r.toPairs(inner)
        .map(([name, v]) => ({
            name: name,
            schema: v.schema,
            optional: v._optional,
        }))
        const s2 = amend(this.schema, {
            inner: Optional.of(fieldSchemas),
        });
        return new SchemaBuilder(s2, this._optional);
    }

    array (inner: SchemaBuilder): SchemaBuilder {
        const s2 = amend(this.schema, {
            inner: Optional.of(inner.schema),
        });
        return new SchemaBuilder(s2, this._optional);
    }
}

function amend <T extends {[field: string]: any}> (
    obj: T,
    partial: Partial<T>,
): T {
    return r.merge(obj, partial) as T;
}
