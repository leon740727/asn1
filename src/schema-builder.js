"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compose = exports.schema = void 0;
const r = require("ramda");
const types_1 = require("types");
const schema_1 = require("./schema");
var schema;
(function (schema_2) {
    function any(tagNumber) {
        const n = tagNumber === undefined ? '*' : tagNumber;
        return new SchemaBuilder(amend(blank, { tagNumber: n }), false);
    }
    schema_2.any = any;
    function value(tagNumber) {
        return new SchemaBuilder(amend(blank, { tagNumber }), false);
    }
    schema_2.value = value;
    function object(inner) {
        return new SchemaBuilder(blank, false).object(inner);
    }
    schema_2.object = object;
    function array(schema) {
        return new SchemaBuilder(blank, false).array(schema);
    }
    schema_2.array = array;
    /* http://luca.ntop.org/Teaching/Appunti/asn1.html */
    schema_2.int = () => new SchemaBuilder(amend(blank, { tagNumber: 2 }), false); // integer
    schema_2.bit = () => new SchemaBuilder(amend(blank, { tagNumber: 3 }), false); // bit string
    schema_2.oct = () => new SchemaBuilder(amend(blank, { tagNumber: 4 }), false); // octet string
    schema_2.nil = () => new SchemaBuilder(amend(blank, { tagNumber: 5 }), false); // null
    schema_2.oid = () => new SchemaBuilder(amend(blank, { tagNumber: 6 }), false); // object identifier
    schema_2.seq = () => new SchemaBuilder(amend(blank, { tagNumber: 16 }), false); // sequence and sequenceOf
    schema_2.set = () => new SchemaBuilder(amend(blank, { tagNumber: 17 }), false); // set and setOf
    schema_2.str = () => new SchemaBuilder(amend(blank, { tagNumber: 19 }), false); // printable string
    schema_2.t61 = () => new SchemaBuilder(amend(blank, { tagNumber: 20 }), false); // T61 string
    schema_2.ia5 = () => new SchemaBuilder(amend(blank, { tagNumber: 22 }), false); // IA5 string
    schema_2.utctime = () => new SchemaBuilder(amend(blank, { tagNumber: 23 }), false); // UTCTime
    const blank = {
        tagNumber: '*',
        inner: types_1.Optional.empty(),
        tagging: types_1.Optional.empty(),
    };
})(schema = exports.schema || (exports.schema = {}));
function compose(schema, value, verbose) {
    const result = schema_1.compose(schema.build(), value);
    return verbose ? result : result.map(schema_1.simplify);
}
exports.compose = compose;
class SchemaBuilder {
    constructor(schema, _optional) {
        this.schema = schema;
        this._optional = _optional;
    }
    build() {
        return this.schema;
    }
    implicit(tagNumber) {
        const s2 = amend(this.schema, {
            tagging: types_1.Optional.of({
                implicit: true,
                tagNumber: tagNumber,
            }),
        });
        return new SchemaBuilder(s2, this._optional);
    }
    explicit(tagNumber) {
        const s2 = amend(this.schema, {
            tagging: types_1.Optional.of({
                implicit: false,
                tagNumber: tagNumber,
            }),
        });
        return new SchemaBuilder(s2, this._optional);
    }
    optional() {
        return new SchemaBuilder(this.schema, true);
    }
    object(inner) {
        const fieldSchemas = r.toPairs(inner)
            .map(([name, v]) => ({
            name: name,
            schema: v.schema,
            optional: v._optional,
        }));
        const s2 = amend(this.schema, {
            inner: types_1.Optional.of(fieldSchemas),
        });
        return new SchemaBuilder(s2, this._optional);
    }
    array(inner) {
        const s2 = amend(this.schema, {
            inner: types_1.Optional.of(inner.schema),
        });
        return new SchemaBuilder(s2, this._optional);
    }
}
function amend(obj, partial) {
    return r.merge(obj, partial);
}
