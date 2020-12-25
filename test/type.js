"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const index_1 = require("../index");
describe('basic type', () => {
    it('GeneralizedTime', () => {
        const dt = '2020-12-23T03:27:57.000Z';
        const ber = '180F32303230313232333033323735375A'.toLowerCase();
        index_1.Value.fromBER(Buffer.from(ber, 'hex')).map(v => {
            assert.ok(v.__value === dt); // test decoder
            index_1.compose(index_1.schema.generalizedTime(), v)
                .map(v => assert.ok(v === dt)); // test schema
        });
        assert.ok(index_1.dumper.generalizedTime(new Date(Date.parse(dt))).toString('hex') === ber); // test dumper
    });
});
