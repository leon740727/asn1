"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compose = exports.simplify = void 0;
const assert = require("assert");
const r = require("ramda");
const types_1 = require("types");
const asn1 = require("./value");
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
    if (schema.name === 'any') {
        return types_1.Result.ok(value);
    }
    else if (schema.name === 'list') {
        return asn1.Value.components(value)
            .or_fail(`schema error`)
            .chain(elements => {
            if (schema.inner.name === 'any') {
                return types_1.Result.ok(elements);
            }
            else {
                return types_1.Result.all(elements.map(v => compose(schema.inner, v)))
                    .if_error(errors => types_1.Optional.cat(errors)[0]);
            }
        });
    }
    else if (schema.name === 'struct') {
        return asn1.Value.components(value)
            .or_fail(`schema error`)
            .chain(fvalues => {
            const ps = pairs(schema.fields, fvalues);
            const fields = ps.map(p => p[0]);
            const values = ps.map(([fieldSchema, value]) => {
                return compose(fieldSchema.schema, value);
            });
            return types_1.Result.all(values)
                .map(values => {
                return r.mergeAll(r.zip(fields, values).map(([field, value]) => r.objOf(field.fieldName, value)));
            })
                .if_error(errors => types_1.Optional.cat(errors)[0]);
        });
    }
    else {
        const _ = schema;
    }
}
exports.compose = compose;
function pairs(fieldSchemas, values) {
    if (fieldSchemas.length === 0 || values.length === 0) {
        return [];
    }
    else {
        const [fieldSchema, value] = [fieldSchemas[0], values[0]];
        return fieldSchema.tagging
            .map(tagging => {
            if (tagging.tag === asn1.Value.tagNumber(value)) {
                // 這個 optional 欄位有值
                let cur;
                if (tagging.implicit === true) {
                    cur = [fieldSchema, value];
                }
                else {
                    // explicit tagging 的值一定是個 array，內含真正的 value
                    const elements = asn1.Value.components(value);
                    assert.ok(elements.is_present(), 'explicit tagging definition error');
                    cur = [fieldSchema, elements.get()[0]];
                }
                return [cur].concat(pairs(fieldSchemas.slice(1), values.slice(1)));
            }
            else {
                // 沒有值，忽略
                return pairs(fieldSchemas.slice(1), values);
            }
        })
            .or_exec(() => {
            return [[fieldSchema, value]]
                .concat(pairs(fieldSchemas.slice(1), values.slice(1)));
        });
    }
}
