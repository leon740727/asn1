import * as r from 'ramda';
import { Optional, Result, Json } from 'types';
import { Value } from './value';
import { Schema, compose as _compose, simplify } from './schema';

class SchemaBuilder {
    constructor (public tagging: Optional<{implicit: boolean, tag: number}>) {}

    implicit (tag: number) {
        const clone = r.clone(this);
        clone.tagging = Optional.of({implicit: true, tag: tag});
        return clone;
    }

    explicit (tag: number) {
        const clone = r.clone(this);
        clone.tagging = Optional.of({implicit: false, tag: tag});
        return clone;
    }

    build (): Schema {
        throw new Error('not implement');
    }

    clone (): SchemaBuilder {
        throw new Error('not implement');
    }
}

class Asn1ValueSchemaBuilder extends SchemaBuilder {
    constructor (tagging: Optional<{implicit: boolean, tag: number}>) {
        super(tagging);
    }

    build (): Schema {
        return 'Asn1ValueDef';
    }

    clone () {
        return new Asn1ValueSchemaBuilder(this.tagging);
    }
}

class ListSchemaBuilder extends SchemaBuilder {
    constructor (
        tagging: Optional<{implicit: boolean, tag: number}>,
        private innerSchema: SchemaBuilder,
    ) {
        super(tagging);
    }

    build (): Schema {
        return {
            type: this.innerSchema.build(),
        }
    }

    clone () {
        return new ListSchemaBuilder(this.tagging, this.innerSchema);
    }
}

class StructSchemaBuilder extends SchemaBuilder {
    constructor (
        tagging: Optional<{implicit: boolean, tag: number}>,
        private layout: {[field: string]: SchemaBuilder},
    ) {
        super(tagging);
    }

    build (): Schema {
        return r.toPairs(this.layout)
        .map(([field, builder]) => ({
            name: field,
            type: builder.build(),
            tagging: builder.tagging,
        }));
    }

    clone () {
        return new StructSchemaBuilder(this.tagging, this.layout);
    }
}

export const schema = {
    object: (layout: {[field: string]: SchemaBuilder}) => {
        return new StructSchemaBuilder(Optional.empty(), layout);
    },

    array: (innerSchema: SchemaBuilder) => {
        return new ListSchemaBuilder(Optional.empty(), innerSchema);
    },

    value: () => {
        return new Asn1ValueSchemaBuilder(Optional.empty());
    }
}

export function compose (schema: SchemaBuilder, value: Value, verbose?: boolean): Result<string, Json> {
    const result = _compose(schema.build(), value);
    return verbose ? result : result.map(simplify);
}
