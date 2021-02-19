"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const index_1 = require("../index");
/**
 * basic OCSP response
 * https://www.ietf.org/rfc/rfc2560.txt
 */
var BasicOCSPResponse;
(function (BasicOCSPResponse) {
    BasicOCSPResponse.asn1Schema = index_1.schema.object({
        tbsResponseData: index_1.schema.object({
            version: index_1.schema.int().explicit(0).optional(),
            responderID: index_1.schema.any(),
            producedAt: index_1.schema.generalizedTime(),
            responses: index_1.schema.array(index_1.schema.object({
                certID: index_1.schema.object({
                    hashAlgorithm: index_1.schema.any(),
                    issuerNameHash: index_1.schema.oct(),
                    issuerKeyHash: index_1.schema.oct(),
                    serialNumber: index_1.schema.int(),
                }),
                certStatus: index_1.schema.any(),
                thisUpdate: index_1.schema.generalizedTime(),
                nextUpdate: index_1.schema.generalizedTime().explicit(0).optional(),
                singleExtensions: index_1.schema.any().explicit(0).optional(),
            })),
            responseExtensions: index_1.schema.any().explicit(1).optional(),
        }),
        signatureAlgorithm: index_1.schema.any(),
        signature: index_1.schema.any(),
    });
})(BasicOCSPResponse || (BasicOCSPResponse = {}));
const basicResp = Buffer.from('308201b530819ea21604140f80611c823161d52f28e78d4638b42ce1c6d9e2180f32303230313232333033323735375a307330713049300906052b0e03021a05000414105fa67a80089db5279f35ce830b43889ea3c70d04140f80611c823161d52f28e78d4638b42ce1c6d9e202100dfc91a9c4a5c384a790486ca6945a318000180f32303230313232333033323735375aa011180f32303230313233303032343235375a300d06092a864886f70d01010b050003820101002f468007da18602ce79cd4116671237f72ab99f88bcce4c388b8207f33a17aeff267189cc791e24d565c923899bbd71378d469938d309def16944a701ecdcdb9002c9b1ed0fdb4a9cb482996efba7ec5444e7472fc09ade4a263d64e407975bcb31f9c4f64880778a075ccfe2f7325764749f3bf8f1f93ac28ea1ac00ddcfebce0c66c3f1aac3f3f273487743402669b334aa414ca481111547b0d9ab521b8f9758a98fe32c22d14fc73116a4e38583b7cc7003618f24a311d0e2bb35b25c40b7b1d06179de712adcb4a4b1050bb00d1e774db2b3d3b76a9d6ffc702fb630d7bb825323885d971d324df3c5fd550eb9ce96969de0065d83347f20451c7a082e1', 'hex');
describe('ocsp basic response', () => {
    it('decode', () => {
        index_1.Value.fromBER(basicResp)
            .chain(value => index_1.compose(BasicOCSPResponse.asn1Schema, value))
            .map((res) => {
            const producedAt = res['tbsResponseData']['producedAt'];
            assert.ok(producedAt === '2020-12-23T03:27:57.000Z');
            const cert = res['tbsResponseData']['responses'][0];
            const certIdHashAlgorithm = cert['certID']['hashAlgorithm'];
            const certId = BigInt(cert['certID']['serialNumber']);
            const issuerNameHash = cert['certID']['issuerNameHash'];
            const issuerKeyHash = cert['certID']['issuerKeyHash'];
            const thisUpdate = cert['thisUpdate'];
            const nextUpdate = cert['nextUpdate'];
            assert.ok(JSON.stringify(certIdHashAlgorithm) === JSON.stringify(['1.3.14.3.2.26', null]));
            assert.ok(certId.toString() === '18591377153366135306752357345801820721');
            assert.ok(issuerNameHash === '0x105fa67a80089db5279f35ce830b43889ea3c70d');
            assert.ok(issuerKeyHash === '0x0f80611c823161d52f28e78d4638b42ce1c6d9e2');
            assert.ok(thisUpdate === '2020-12-23T03:27:57.000Z');
            assert.ok(nextUpdate === '2020-12-30T02:42:57.000Z');
        });
    });
});
