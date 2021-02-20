import { Result, Json } from 'types';
import { Value } from './value';
import { Schema } from './schema';
export declare namespace schema {
    function any(tagNumber?: number): SchemaBuilder;
    function value(tagNumber: number): SchemaBuilder;
    function object(inner: {
        [field: string]: SchemaBuilder;
    }): SchemaBuilder;
    function array(schema: SchemaBuilder): SchemaBuilder;
    const int: () => SchemaBuilder;
    const bit: () => SchemaBuilder;
    const oct: () => SchemaBuilder;
    const nil: () => SchemaBuilder;
    const oid: () => SchemaBuilder;
    const seq: () => SchemaBuilder;
    const set: () => SchemaBuilder;
    const str: () => SchemaBuilder;
    const t61: () => SchemaBuilder;
    const ia5: () => SchemaBuilder;
    const utctime: () => SchemaBuilder;
    const generalizedTime: () => SchemaBuilder;
}
export declare function compose(schema: SchemaBuilder, value: Value, verbose?: boolean): Result<string, Json>;
declare class SchemaBuilder {
    private schema;
    private _optional;
    constructor(schema: Schema, _optional: boolean);
    build(): Schema;
    implicit(tagNumber: number): SchemaBuilder;
    explicit(tagNumber: number): SchemaBuilder;
    optional(): SchemaBuilder;
    object(inner: {
        [field: string]: SchemaBuilder;
    }): SchemaBuilder;
    array(inner: SchemaBuilder): SchemaBuilder;
}
export {};
