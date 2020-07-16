"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compose = exports.simplify = void 0;
const assert = require("assert");
const r = require("ramda");
const types_1 = require("types");
const asn1 = require("./value");
var Schema;
(function (Schema) {
    function isExplicitTagging(schema) {
        return schema.tagging
            .map(tagging => !tagging.implicit)
            .or_else(false);
    }
    Schema.isExplicitTagging = isExplicitTagging;
    function finalTagNumber(schema) {
        return schema.tagging
            .map(tagging => tagging.tagNumber)
            .or_else(schema.tagNumber);
    }
    Schema.finalTagNumber = finalTagNumber;
    function stripTagging(schema) {
        return {
            tagNumber: schema.tagNumber,
            inner: schema.inner,
            tagging: types_1.Optional.empty(),
        };
    }
    Schema.stripTagging = stripTagging;
})(Schema || (Schema = {}));
function simplify(data) {
    if (asn1.Value.isa(data)) { // asn1.Value
        return asn1.Value.simplify(data);
    }
    else if (Array.isArray(data)) { // Data[]
        return data.map(simplify);
    }
    else { // Struct
        const values = r.values(data)
            .map(simplify);
        return r.fromPairs(r.zip(r.keys(data), values));
    }
}
exports.simplify = simplify;
function compose(schema, value) {
    return schema
        .inner.map(inner => {
        if (Array.isArray(inner)) { // struct
            return asn1.Value.components(value)
                .or_fail(`schema error`)
                .chain(values => {
                const fieldSchemas = inner;
                return _align(fieldSchemas, values)
                    .chain(pairs => {
                    const fvs = pairs.map(([fieldSchema, value]) => {
                        return compose(_schema(fieldSchema), _value(fieldSchema, value))
                            .map(data => ({ [fieldSchema.name]: data }));
                    });
                    return types_1.Result.all(fvs)
                        .map(fvs => r.mergeAll(fvs))
                        .if_error(errors => types_1.Optional.cat(errors)[0]);
                });
            });
        }
        else { // list
            return asn1.Value.components(value)
                .or_fail(`schema error`)
                .chain(elements => {
                return types_1.Result.all(elements.map(v => compose(inner, v)))
                    .if_error(errors => types_1.Optional.cat(errors)[0]);
            });
        }
    })
        .or_exec(() => {
        const tag = Schema.finalTagNumber(schema);
        if (tag === '*' || tag === asn1.Value.tagNumber(value)) {
            return types_1.Result.ok(value);
        }
        else {
            return types_1.Result.fail("schema error: tag number doesn't match");
        }
    });
    function _align(fieldSchemas, values) {
        return align(fieldSchemas.map(f => ({ tagNumber: Schema.finalTagNumber(f.schema), optional: f.optional, _: f })), values.map(v => ({ tagNumber: asn1.Value.tagNumber(v), _: v })))
            .map(pairs => pairs.map(([f, v]) => pair(f._, v._)))
            .if_error(error => `align schema (${fieldSchemas.map(f => f.name).join(', ')}) error: ${error}`);
    }
    function _schema(fieldSchema) {
        if (Schema.isExplicitTagging(fieldSchema.schema)) {
            return Schema.stripTagging(fieldSchema.schema);
        }
        else {
            return fieldSchema.schema;
        }
    }
    function _value(fieldSchema, value) {
        if (Schema.isExplicitTagging(fieldSchema.schema)) {
            // explicit tagging 的值一定是個單元素 array，內含真正的 value
            const subValues = asn1.Value.components(value).or_else([]);
            assert.ok(subValues.length === 1, 'explicit tagging definition error');
            return subValues[0];
        }
        else {
            return value;
        }
    }
}
exports.compose = compose;
function align(schemas, values) {
    // optional 的 schema 一定要有明確的 tag number 才能把資料對齊
    if (schemas.some(i => i.optional && i.tagNumber === '*')) {
        return types_1.Result.fail("tag number of optional field can't be unknown");
    }
    else if (values.length === 0 && schemas.length > 0) {
        if (schemas.every(i => i.optional)) {
            return types_1.Result.ok([]);
        }
        else {
            return types_1.Result.fail('align schema error. schema is not optional but no value available');
        }
    }
    else if (schemas.length === 0) {
        return types_1.Result.ok([]); // schema 沒有定義的 value 就刪掉
    }
    else {
        const [schema, value] = [schemas[0], values[0]];
        const rest = align(schemas.slice(1), values.slice(1));
        if (schema.tagNumber === '*') {
            return rest.map(rest => [pair(schema, value)].concat(rest));
        }
        else {
            if (schema.optional === true) {
                if (schema.tagNumber === value.tagNumber) {
                    return rest.map(rest => [pair(schema, value)].concat(rest));
                }
                else {
                    return align(schemas.slice(1), values);
                }
            }
            else {
                if (schema.tagNumber === value.tagNumber) {
                    return rest.map(rest => [pair(schema, value)].concat(rest));
                }
                else {
                    return types_1.Result.fail(`align schema error. tag number ${schema.tagNumber} !== ${value.tagNumber}`);
                }
            }
        }
    }
}
function pair(a, b) {
    return [a, b];
}
