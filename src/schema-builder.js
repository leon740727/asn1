"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compose = exports.schema = void 0;
const r = require("ramda");
const types_1 = require("types");
const schema_1 = require("./schema");
class SchemaBuilder {
    constructor(tagging) {
        this.tagging = tagging;
    }
    implicit(tag) {
        const clone = r.clone(this);
        clone.tagging = types_1.Optional.of({ implicit: true, tag: tag });
        return clone;
    }
    explicit(tag) {
        const clone = r.clone(this);
        clone.tagging = types_1.Optional.of({ implicit: false, tag: tag });
        return clone;
    }
    build() {
        throw new Error('not implement');
    }
    clone() {
        throw new Error('not implement');
    }
}
class AnySchemaBuilder extends SchemaBuilder {
    constructor(tagging) {
        super(tagging);
    }
    build() {
        return {
            inner: types_1.Optional.empty(),
        };
    }
    clone() {
        return new AnySchemaBuilder(this.tagging);
    }
}
class ListSchemaBuilder extends SchemaBuilder {
    constructor(tagging, innerSchema) {
        super(tagging);
        this.innerSchema = innerSchema;
    }
    build() {
        return {
            inner: types_1.Optional.of(this.innerSchema.build()),
        };
    }
    clone() {
        return new ListSchemaBuilder(this.tagging, this.innerSchema);
    }
}
class StructSchemaBuilder extends SchemaBuilder {
    constructor(tagging, layout) {
        super(tagging);
        this.layout = layout;
    }
    build() {
        const fields = r.toPairs(this.layout)
            .map(([field, builder]) => ({
            fieldName: field,
            schema: builder.build(),
            tagging: builder.tagging,
        }));
        return {
            inner: types_1.Optional.of(fields),
        };
    }
    clone() {
        return new StructSchemaBuilder(this.tagging, this.layout);
    }
}
exports.schema = {
    object: (layout) => {
        return new StructSchemaBuilder(types_1.Optional.empty(), layout);
    },
    array: (innerSchema) => {
        return new ListSchemaBuilder(types_1.Optional.empty(), innerSchema);
    },
    value: () => {
        return new AnySchemaBuilder(types_1.Optional.empty());
    }
};
function compose(schema, value, verbose) {
    const result = schema_1.compose(schema.build(), value);
    return verbose ? result : result.map(schema_1.simplify);
}
exports.compose = compose;
