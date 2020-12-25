"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dumper = exports.LengthBlock = exports.TypeBlock = void 0;
const assert = require("assert");
const r = require("ramda");
var TypeBlock;
(function (TypeBlock) {
    let Classes;
    (function (Classes) {
        Classes[Classes["Universal"] = 0] = "Universal";
        Classes[Classes["Application"] = 64] = "Application";
        Classes[Classes["ContextSpecific"] = 128] = "ContextSpecific";
        Classes[Classes["Private"] = 192] = "Private";
    })(Classes = TypeBlock.Classes || (TypeBlock.Classes = {}));
    // 32  = '00100000' = constructed
    function isConstructed(block) {
        return (block[0] & 32) > 0;
    }
    TypeBlock.isConstructed = isConstructed;
    function setConstructed(block, constructed) {
        const clearbit = 223; // 223 = 11011111
        const h = block[0] & clearbit;
        const head = constructed ? (h | 32) : h;
        return Buffer.concat([int2buf(head), block.slice(1)]);
    }
    TypeBlock.setConstructed = setConstructed;
    function setClass(block, klass) {
        const head = clearClass(block[0]) | klass;
        return Buffer.concat([int2buf(head), block.slice(1)]);
    }
    TypeBlock.setClass = setClass;
    function clearClass(byte) {
        return byte & 63; // 63 = 00111111
    }
})(TypeBlock = exports.TypeBlock || (exports.TypeBlock = {}));
var LengthBlock;
(function (LengthBlock) {
    function value(lengthBlock) {
        assert.ok(lengthBlock.length > 0);
        const head = lengthBlock[0];
        const firstBitIsOn = (head & 128) > 0;
        if (firstBitIsOn) { // long form
            const bytesCnt = head & 127;
            assert.ok(lengthBlock.length >= bytesCnt + 1);
            return buf2int(lengthBlock.slice(1, bytesCnt + 1));
        }
        else { // short form
            return head;
        }
    }
    LengthBlock.value = value;
    function from(n) {
        // http://luca.ntop.org/Teaching/Appunti/asn1.html
        assert.ok(n >= 0);
        if (n <= 127) { // Short form
            return int2buf(n);
        }
        else { // long form
            const bytes = split(n);
            const head = int2buf(128 | bytes.length);
            return Buffer.concat([head].concat(bytes.map(int2buf)));
        }
        function split(n) {
            if (n <= 255) {
                return [n];
            }
            else {
                return split(Math.floor(n / 256)).concat([n % 256]);
            }
        }
    }
    LengthBlock.from = from;
})(LengthBlock = exports.LengthBlock || (exports.LengthBlock = {}));
var dumper;
(function (dumper) {
    function integer(n) {
        return Buffer.concat([
            Buffer.from('02', 'hex'),
            LengthBlock.from(int2buf(n).length),
            int2buf(n),
        ]);
    }
    dumper.integer = integer;
    function bitString(data) {
        return Buffer.concat([
            Buffer.from('03', 'hex'),
            LengthBlock.from(data.length + 1),
            Buffer.from('00', 'hex'),
            data,
        ]);
    }
    dumper.bitString = bitString;
    function octetString(data) {
        return Buffer.concat([
            Buffer.from('04', 'hex'),
            LengthBlock.from(data.length),
            data,
        ]);
    }
    dumper.octetString = octetString;
    function seq(components) {
        const content = Buffer.concat(components);
        return Buffer.concat([
            Buffer.from('30', 'hex'),
            LengthBlock.from(content.length),
            content,
        ]);
    }
    dumper.seq = seq;
    function printableString(text) {
        const content = Buffer.concat(r.range(0, text.length).map(i => int2buf(text.charCodeAt(i))));
        return Buffer.concat([
            Buffer.from('13', 'hex'),
            LengthBlock.from(content.length),
            content,
        ]);
    }
    dumper.printableString = printableString;
    function utcTime(time) {
        const y = paddingLeft(time.getUTCFullYear().toString().slice(-2), '0', 2);
        const m = paddingLeft((time.getUTCMonth() + 1).toString(), '0', 2);
        const d = paddingLeft(time.getUTCDate().toString(), '0', 2);
        const h = paddingLeft(time.getUTCHours().toString(), '0', 2);
        const M = paddingLeft(time.getUTCMinutes().toString(), '0', 2);
        const s = paddingLeft(time.getUTCSeconds().toString(), '0', 2);
        const text = [y, m, d, h, M, s, 'Z'].join('');
        const content = Buffer.concat(r.range(0, text.length).map(i => int2buf(text.charCodeAt(i))));
        return Buffer.concat([
            Buffer.from('17', 'hex'),
            LengthBlock.from(content.length),
            content,
        ]);
    }
    dumper.utcTime = utcTime;
    function generalizedTime(time) {
        const y = paddingLeft(time.getUTCFullYear().toString(), '0', 2);
        const m = paddingLeft((time.getUTCMonth() + 1).toString(), '0', 2);
        const d = paddingLeft(time.getUTCDate().toString(), '0', 2);
        const h = paddingLeft(time.getUTCHours().toString(), '0', 2);
        const M = paddingLeft(time.getUTCMinutes().toString(), '0', 2);
        const s = paddingLeft(time.getUTCSeconds().toString(), '0', 2);
        const text = [y, m, d, h, M, s, 'Z'].join('');
        const content = Buffer.concat(r.range(0, text.length).map(i => int2buf(text.charCodeAt(i))));
        return Buffer.concat([
            Buffer.from('18', 'hex'),
            LengthBlock.from(content.length),
            content,
        ]);
    }
    dumper.generalizedTime = generalizedTime;
})(dumper = exports.dumper || (exports.dumper = {}));
function paddingLeft(str, padding, minLength) {
    if (str.length >= minLength) {
        return str;
    }
    else {
        const lack = minLength - str.length;
        const p = r.range(0, lack)
            .map(_ => padding)
            .join('')
            .slice(0, lack); // 萬一 padding 不只一個字元
        return p + str;
    }
}
function int2buf(n) {
    const hex = parseInt(n).toString(16);
    return Buffer.from(hex.length % 2 === 0 ? hex : `0${hex}`, 'hex');
}
function buf2int(buf) {
    const ints = r.range(0, buf.length).map(i => buf[i]);
    const bases = r.range(0, buf.length).reverse().map(i => Math.pow(256, i));
    return r.zip(ints, bases)
        .map(([int, base]) => int * base)
        .reduce((acc, i) => acc + i, 0);
}
