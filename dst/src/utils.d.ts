/// <reference types="node" />
export declare namespace TypeBlock {
    enum Classes {
        Universal = 0,
        Application = 64,
        ContextSpecific = 128,
        Private = 192
    }
    function isConstructed(block: Buffer): boolean;
    function setConstructed(block: Buffer, constructed: boolean): Buffer;
    function setClass(block: Buffer, klass: Classes): Buffer;
}
export declare namespace LengthBlock {
    function value(lengthBlock: Buffer): number;
    function from(n: number): Buffer;
}
export declare namespace dumper {
    /**
     * @param n number || hex string like 0xff
     * @param byteSize (optional) expected size
     */
    function integer(n: number | string, byteSize?: number): Buffer;
    function bitString(data: Buffer): Buffer;
    function octetString(data: Buffer): Buffer;
    function seq(components: Buffer[]): Buffer;
    function printableString(text: string): Buffer;
    function utcTime(time: Date): Buffer;
    function generalizedTime(time: Date): Buffer;
}
