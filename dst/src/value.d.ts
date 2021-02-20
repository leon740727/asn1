/// <reference types="node" />
import { Optional, Result, Json } from 'types';
declare type ValueResult = string | number | null | Value[];
export declare type Value = {
    __tag: number;
    __ber: string;
    __value: ValueResult;
};
export declare namespace Value {
    function isa(value: any): boolean;
    function tagNumber(value: Value): number;
    function components(value: Value): Optional<Value[]>;
    function fromBER(ber: Buffer): Result<string, Value>;
    function simplify(value: Value): Json;
}
/** 修改 Asn1 第一個 byte (Identifier octets) 裡面 tag class 與 tag number 的值 */
export declare function setTagNumber(ber: Buffer, newTagClass: number, newTagNumber: number): Buffer;
export {};
