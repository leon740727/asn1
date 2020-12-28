import * as assert from 'assert';
import { schema, Value, compose, dumper } from '../index';
import { LengthBlock } from '../src/utils';

declare const describe, it, before, after, afterEach;

describe('basic type', () => {
    it('GeneralizedTime', () => {
        const dt = '2020-12-23T03:27:57.000Z';
        const ber = '180F32303230313232333033323735375A'.toLowerCase();
        Value.fromBER(Buffer.from(ber, 'hex')).map(v => {
            assert.ok(v.__value === dt);            // test decoder

            compose(schema.generalizedTime(), v)
            .map(v => assert.ok(v === dt));         // test schema
        });
        assert.ok(dumper.generalizedTime(new Date(Date.parse(dt))).toString('hex') === ber);    // test dumper
    });

    it('integer', () => {
        const pkeySchema = schema.seq().object({
            n1: schema.int(),
            n2: schema.int(),
        });
        // evernote public key
        const pkey = '3082010a0282010100a49fd2a331160b6f9498b51c6346c1cc6a8d8f0c14c376dc09d692e0531141dccf100ed3d99bd3583ea418aa44623a29ea1d16504e6ae93684367aaa110ad6bb1cebc221055e79bf13967a749eabce147218d7cc413bc633e015b9dbd238036ceb5828c60758bb399853dd0cd2155e5507b5ebf58f7b0a240732f729afa42a8a9567598a8749a40c440bb33983da82eb12b137f99a7c394733677beb15daefe638412a507106cff1fd0f86e5ddcd2cc811d8f14d438f8eb79f8427a0e1859cf8350cbf1cee8165a319daaa37d33eafc5bc02661656cd75a4f55359c6d7dd4263145eea02f0a08c56906a47ffc40c83dc21a3c5849a530b6feba149dd50a4f4970203010001';
        Value.fromBER(Buffer.from(pkey, 'hex'))
        .chain(v => compose(pkeySchema, v))
        .map(v => {
            assert.ok((v['n1'] as string).startsWith('0xA49FD2A331160B6F9498B51C6346C1CC6A8D8F0C14C376DC09D692E0531141'.toLowerCase()));
            assert.ok(BigInt(v['n1']).toString().startsWith('207818935757469208598194479909767130890755013425177397290481657858356'));
            assert.ok(v['n2'] === 65537);

            const n1size = LengthBlock.value(Buffer.from('820101', 'hex'));
            const pkey2 = dumper.seq([
                dumper.integer(v['n1'], n1size),
                dumper.integer(65537),
            ]);
            assert.ok(pkey2.toString('hex') === pkey);
        });
    });
});
