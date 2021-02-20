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
export declare type Schema = {
    tagNumber: number | '*';
    inner: Optional<Schema | StructFieldSchema[]>;
    tagging: Optional<{
        implicit: boolean;
        tagNumber: number;
    }>;
};
/** 內部型別 */
declare type StructFieldSchema = {
    name: string;
    schema: Schema;
    optional: boolean;
};
declare type Data = asn1.Value | Struct | Data[];
declare type Struct = {
    [field: string]: Data;
};
export declare function simplify(data: Data): any;
export declare function compose(schema: Schema, value: asn1.Value): Result<string, Data>;
export {};
