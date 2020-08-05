import * as assert from 'assert';
import * as r from 'ramda';

export namespace TypeBlock {
    export enum Classes {
        Universal = 0,              // 00 000000
        Application = 64,           // 01 000000
        ContextSpecific = 128,      // 10 000000
        Private = 192,              // 11 000000
    }

    // 32  = '00100000' = constructed
    export function isConstructed (block: Buffer) {
        return (block[0] & 32) > 0;
    }

    export function setConstructed (block: Buffer, constructed: boolean) {
        const clearbit = 223;       // 223 = 11011111
        const h = block[0] & clearbit;
        const head = constructed ? (h | 32) : h;
        return Buffer.concat([int2buf(head), block.slice(1)]);
    }

    export function setClass (block: Buffer, klass: Classes) {
        const head = clearClass(block[0]) | klass;
        return Buffer.concat([int2buf(head), block.slice(1)]);
    }

    function clearClass (byte: number) {
        return byte & 63;           // 63 = 00111111
    }
}

export namespace LengthBlock {
    export function value (lengthBlock: Buffer): number {
        assert.ok(lengthBlock.length > 0);
        const head = lengthBlock[0];
        const firstBitIsOn = (head & 128) > 0;
        if (firstBitIsOn) {         // long form
            const bytesCnt = head & 127;
            assert.ok(lengthBlock.length >= bytesCnt + 1);
            return buf2int(lengthBlock.slice(1, bytesCnt + 1));
        } else {                    // short form
            return head;
        }
    }
    
    export function from (n: number): Buffer {
        // http://luca.ntop.org/Teaching/Appunti/asn1.html
        assert.ok(n >= 0);
        if (n <= 127) {             // Short form
            return int2buf(n);
        } else {                    // long form
            const bytes = split(n);
            const head = int2buf(128 | bytes.length);
            return Buffer.concat([head].concat(bytes.map(int2buf)));
        }
        
        function split (n: number): number[] {
            if (n <= 255) {
                return [n];
            } else {
                return split(Math.floor(n / 256)).concat([n % 256]);
            }
        }
    }
}

export namespace dumper {
    export function integer (n: number) {
        return Buffer.concat([
            Buffer.from('02', 'hex'),
            LengthBlock.from(int2buf(n).length),
            int2buf(n),
        ]);
    }
    
    export function bitString (data: Buffer) {
        return Buffer.concat([
            Buffer.from('03', 'hex'),
            LengthBlock.from(data.length + 1),
            Buffer.from('00', 'hex'),
            data,
        ]);
    }

    export function octetString (data: Buffer) {
        return Buffer.concat([
            Buffer.from('04', 'hex'),
            LengthBlock.from(data.length),
            data,
        ]);
    }

    export function seq (components: Buffer[]) {
        const content = Buffer.concat(components);
        return Buffer.concat([
            Buffer.from('30', 'hex'),
            LengthBlock.from(content.length),
            content,
        ]);
    }

    export function printableString (text: string) {
        const content = Buffer.concat(r.range(0, text.length).map(i => int2buf(text.charCodeAt(i))));
        return Buffer.concat([
            Buffer.from('13', 'hex'),
            LengthBlock.from(content.length),
            content,
        ]);
    }

    export function utcTime (time: Date) {
        const y = time.getFullYear().toString().slice(-2);
        const m = paddingLeft((time.getMonth() + 1).toString(), '0', 2);
        const d = paddingLeft(time.getDate().toString(), '0', 2);
        const h = paddingLeft(time.getHours().toString(), '0', 2);
        const M = paddingLeft(time.getMinutes().toString(), '0', 2);
        const s = paddingLeft(time.getSeconds().toString(), '0', 2);
        const text = [y,m,d,h,M,s,'Z'].join('');
        const content = Buffer.concat(r.range(0, text.length).map(i => int2buf(text.charCodeAt(i))));
        return Buffer.concat([
            Buffer.from('17', 'hex'),
            LengthBlock.from(content.length),
            content,
        ]);

        function paddingLeft (str: string, padding: string, minLength: number) {
            if (str.length >= minLength) {
                return str;
            } else {
                const lack = minLength - str.length;
                const p = r.range(0, lack)
                .map(_ => padding)
                .join('')
                .slice(0, lack);        // 萬一 padding 不只一個字元
                return p + str;
            }
        }
    }
}

function int2buf (n: number) {
    const hex = parseInt(n as any).toString(16);
    return Buffer.from(hex.length % 2 === 0 ? hex : `0${hex}`, 'hex');
}

function buf2int (buf: Buffer) {
    const ints = r.range(0, buf.length).map(i => buf[i]);
    const bases = r.range(0, buf.length).reverse().map(i => Math.pow(256, i));
    return r.zip(ints, bases)
    .map(([int, base]) => int * base)
    .reduce((acc, i) => acc + i, 0);
}
