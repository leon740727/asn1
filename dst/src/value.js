"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setTagNumber = exports.Value = void 0;
const assert = require("assert");
const r = require("ramda");
const types_1 = require("types");
const asn1 = require("asn1js");
var Asn1Value;
(function (Asn1Value) {
    function isa(value) {
        return value.idBlock !== undefined && value.valueBlock !== undefined;
    }
    Asn1Value.isa = isa;
})(Asn1Value || (Asn1Value = {}));
var Value;
(function (Value) {
    function isa(value) {
        return value['__tag'] !== undefined && value['__ber'] !== undefined && value['__value'] !== undefined;
    }
    Value.isa = isa;
    function tagNumber(value) {
        return value.__tag;
    }
    Value.tagNumber = tagNumber;
    function components(value) {
        if (Array.isArray(value.__value)) {
            return types_1.Optional.of(value.__value);
        }
        else {
            return types_1.Optional.empty();
        }
    }
    Value.components = components;
    function fromBER(ber) {
        const value = asn1.fromBER(buf2ArrayBuffer(ber)).result;
        assert.ok(typeof (value.error) === 'string');
        if (value.error === '') {
            return types_1.Result.ok(decode(value));
        }
        else {
            return types_1.Result.fail(value.error);
        }
    }
    Value.fromBER = fromBER;
    function simplify(value) {
        if (Array.isArray(value.__value)) {
            return value.__value.map(simplify);
        }
        else {
            return value.__value;
        }
    }
    Value.simplify = simplify;
})(Value = exports.Value || (exports.Value = {}));
/**
 * x.208 定義的 universal 型別是我們知道該怎麼處理的型別。這種型別真接轉 Json (oid 轉成 "1.42.860.xxx" 的字串)
 *
 * 對於我們不知道怎麼處理的型別，例如:
 * 1. implicitly tagged type。他改變了底層資料的型別，所以無法從資料中判斷裡面到底是什麼
 * 2. Application 或 Private 型別
 * 3. 自定義的 Universal 型別(例如 RFC 5280 的 UTF8String)
 * 處理原則如下:
 * 1. 如果知道他的底層型別(從 RFC 文件定義中找到)，就用底層型別的 decode 方法
 * 2. 如果他是 primitive type，直接輸出其 content bytes 及 BER/DER 的 bytes
 *    輸出 BER/DER bytes 的原因是將來可以進一步套用方法 1
 * 3. 如果他是 constructed type，就把其 value[] 分別作 decode。這種情形在他底層是 SEQUENCE 時特別有用
 */
function decode(value, refDecoder) {
    // 這裡不能用 Optional。因為 NULL decoder.decode() 會傳回 null
    const decoder = r.values(decoderOf).filter(i => i.suitable(value))[0];
    if (decoder) {
        return decoder.decode(value);
    }
    else {
        if (refDecoder) {
            return refDecoder.decode(value);
        }
        else {
            if (value.idBlock.isConstructed) {
                const children = value.valueBlock.value;
                assert.ok(Array.isArray(children) && children.every(Asn1Value.isa), 'constructed type must be value array');
                return {
                    __tag: value.idBlock.tagNumber,
                    __ber: '0x' + Buffer.from(value.valueBeforeDecode).toString('hex'),
                    __value: children.map(i => decode(i)),
                };
            }
            else {
                return {
                    __tag: value.idBlock.tagNumber,
                    __ber: '0x' + Buffer.from(value.valueBeforeDecode).toString('hex'),
                    __value: valueHex(value),
                };
            }
        }
    }
}
const decoderOf = {
    sequenceOrSet: {
        suitable: v => v.idBlock.tagClass === 1 && [16, 17].some(n => n === v.idBlock.tagNumber),
        decode: v => wrap(v, v.valueBlock.value.map(v => decode(v))),
    },
    integer: {
        suitable: v => v.idBlock.tagClass === 1 && v.idBlock.tagNumber === 2,
        decode: v => {
            const hex = valueHex(v);
            const bn = BigInt(hex);
            return wrap(v, bn > Number.MAX_SAFE_INTEGER ? `0x${bn.toString(16)}` : parseInt(hex, 16));
        },
    },
    nonPrintableString: {
        suitable: v => v.idBlock.tagClass === 1 && [3, 4, 20, 22].some(n => n === v.idBlock.tagNumber),
        decode: v => wrap(v, valueHex(v)),
    },
    null: {
        suitable: v => v.idBlock.tagClass === 1 && v.idBlock.tagNumber === 5,
        decode: v => wrap(v, null),
    },
    oid: {
        suitable: v => v.idBlock.tagClass === 1 && v.idBlock.tagNumber === 6,
        decode: v => {
            function firstByte(n) {
                // The first octet has value 40 * value1 + value2
                const v2 = n % 40;
                const v1 = (n - v2) / 40;
                return [v1, v2];
            }
            const parts = v.valueBlock.value.map(i => i.valueDec);
            return wrap(v, firstByte(parts[0]).concat(parts.slice(1)).join('.'));
        },
    },
    printableString: {
        suitable: v => v.idBlock.tagClass === 1 && v.idBlock.tagNumber === 19,
        decode: v => wrap(v, v.valueBlock.value),
    },
    UTCTime: {
        suitable: v => v.idBlock.tagClass === 1 && v.idBlock.tagNumber === 23,
        decode: v => {
            const d = v;
            return wrap(v, new Date(Date.UTC(d.year, d.month - 1, d.day, d.hour, d.minute, d.second)).toISOString());
        },
    },
    generalizedTime: {
        suitable: v => v.idBlock.tagClass === 1 && v.idBlock.tagNumber === 24,
        decode: v => {
            const datestr = Buffer.from(valueHex(v).slice(2), 'hex').toString('utf-8'); // YYYYMMDDHHMMSSZ
            assert.ok(datestr.endsWith('Z'), 'ASN.1 GeneralizedTime is not YYYYMMDDHHMMSSZ');
            const [y, m, d, h, minute, s] = [
                datestr.slice(0, 4),
                datestr.slice(4, 6),
                datestr.slice(6, 8),
                datestr.slice(8, 10),
                datestr.slice(10, 12),
                datestr.slice(12, 14),
            ].map(i => parseInt(i));
            return wrap(v, new Date(Date.UTC(y, m - 1, d, h, minute, s)).toISOString());
        },
    }
};
function wrap(value, result) {
    return {
        __tag: value.idBlock.tagNumber,
        __ber: '0x' + Buffer.from(value.valueBeforeDecode).toString('hex'),
        __value: result,
    };
}
function valueHex(value) {
    const bytes = value.valueBlock.valueHex;
    assert.ok(bytes instanceof ArrayBuffer, `valueHex must be of ArrayBuffer`);
    return '0x' + Buffer.from(bytes).toString('hex');
}
/** 修改 Asn1 第一個 byte (Identifier octets) 裡面 tag class 與 tag number 的值 */
function setTagNumber(ber, newTagClass, newTagNumber) {
    let firstByte = ber[0];
    firstByte <<= 2;
    firstByte >>= 2;
    firstByte |= newTagClass << 6;
    firstByte >>= 5;
    firstByte <<= 5;
    firstByte |= newTagNumber;
    return Buffer.concat([Buffer.from(firstByte.toString(16), 'hex'), ber.slice(1)]);
}
exports.setTagNumber = setTagNumber;
function buf2ArrayBuffer(buffer) {
    const res = new ArrayBuffer(buffer.length);
    let view = new Uint8Array(res);
    for (let i = 0; i < buffer.length; i++) {
        view[i] = buffer[i];
    }
    return res;
}
