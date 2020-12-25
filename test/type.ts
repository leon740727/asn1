import * as assert from 'assert';
import { schema, Value, compose, dumper } from '../index';

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
});
