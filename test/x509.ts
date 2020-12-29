import * as assert from 'assert';
import * as crypto from 'crypto';
import { values } from 'ramda';
import { Result, Json } from 'types';
import { schema, Value, compose } from '../index';
import { dumper } from '../src/utils';

declare const describe, it, before, after, afterEach;

/** https://tools.ietf.org/html/rfc5280#section-4.1 */
namespace Certificate {
    const attributeTypeAndValue = schema.object({
        type: schema.any(),
        value: schema.any(),
    });

    const relativeDistinguishedName = schema.array(attributeTypeAndValue);

    const extension = schema.seq().object({
        extnID: schema.oid(),
        critical: schema.any(1).optional(),     // boolean
        extnValue: schema.oct(),
    });

    const tbsCertificate = schema.object({
        version: schema.any().explicit(0).optional(),
        serialNumber: schema.any(),
        signature: schema.any(),
        issuer: schema.array(relativeDistinguishedName),
        validity: schema.array(schema.any()),
        subject: schema.array(relativeDistinguishedName),
        subjectPublicKeyInfo: schema.object({
            algorithm: schema.object({
                id: schema.any(),
                parameters: schema.any(),
            }),
            subjectPublicKey: schema.any(),
        }),
        issuerUniqueID: schema.any().implicit(1).optional(),
        subjectUniqueID: schema.any().implicit(2).optional(),
        extensions: schema.seq().array(extension).explicit(3).optional(),
    });

    const accessDescription = schema.seq().object({
        accessMethod: schema.oid(),
        accessLocation: schema.any(),
    });

    export const asn1Schema = {
        main: schema.object({
            tbsCertificate: tbsCertificate,
            signatureAlgorithm: schema.any(),
            signatureValue: schema.any(),
        }),

        AuthorityKeyIdentifier: schema.seq().object({
            keyIdentifier: schema.any().implicit(0).optional(),
            authorityCertIssuer: schema.any().implicit(1).optional(),
            authorityCertSerialNumber: schema.any().implicit(2).optional(),
        }),

        authorityInfoAccess: schema.seq().array(accessDescription),
    }
}

describe('x509', () => {
    // evernote certificate
    const pemEvernote = `-----BEGIN CERTIFICATE-----
    MIIGNjCCBR6gAwIBAgIQDfyRqcSlw4SnkEhsppRaMTANBgkqhkiG9w0BAQsFADBN
    MQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMScwJQYDVQQDEx5E
    aWdpQ2VydCBTSEEyIFNlY3VyZSBTZXJ2ZXIgQ0EwHhcNMjAwOTAyMDAwMDAwWhcN
    MjExMDA0MDAwMDAwWjBxMQswCQYDVQQGEwJVUzETMBEGA1UECBMKQ2FsaWZvcm5p
    YTEVMBMGA1UEBxMMUmVkd29vZCBDaXR5MR0wGwYDVQQKExRFdmVybm90ZSBDb3Jw
    b3JhdGlvbjEXMBUGA1UEAwwOKi5ldmVybm90ZS5jb20wggEiMA0GCSqGSIb3DQEB
    AQUAA4IBDwAwggEKAoIBAQCkn9KjMRYLb5SYtRxjRsHMao2PDBTDdtwJ1pLgUxFB
    3M8QDtPZm9NYPqQYqkRiOinqHRZQTmrpNoQ2eqoRCta7HOvCIQVeeb8Tlnp0nqvO
    FHIY18xBO8Yz4BW529I4A2zrWCjGB1i7OZhT3QzSFV5VB7Xr9Y97CiQHMvcpr6Qq
    ipVnWYqHSaQMRAuzOYPagusSsTf5mnw5RzNne+sV2u/mOEEqUHEGz/H9D4bl3c0s
    yBHY8U1Dj463n4QnoOGFnPg1DL8c7oFloxnaqjfTPq/FvAJmFlbNdaT1U1nG191C
    YxRe6gLwoIxWkGpH/8QMg9who8WEmlMLb+uhSd1QpPSXAgMBAAGjggLsMIIC6DAf
    BgNVHSMEGDAWgBQPgGEcgjFh1S8o541GOLQs4cbZ4jAdBgNVHQ4EFgQUi61aCRvt
    6sMEqE5Xp+3NR3+bW+UwJwYDVR0RBCAwHoIOKi5ldmVybm90ZS5jb22CDGV2ZXJu
    b3RlLmNvbTAOBgNVHQ8BAf8EBAMCBaAwHQYDVR0lBBYwFAYIKwYBBQUHAwEGCCsG
    AQUFBwMCMGsGA1UdHwRkMGIwL6AtoCuGKWh0dHA6Ly9jcmwzLmRpZ2ljZXJ0LmNv
    bS9zc2NhLXNoYTItZzYuY3JsMC+gLaArhilodHRwOi8vY3JsNC5kaWdpY2VydC5j
    b20vc3NjYS1zaGEyLWc2LmNybDBMBgNVHSAERTBDMDcGCWCGSAGG/WwBATAqMCgG
    CCsGAQUFBwIBFhxodHRwczovL3d3dy5kaWdpY2VydC5jb20vQ1BTMAgGBmeBDAEC
    AjB8BggrBgEFBQcBAQRwMG4wJAYIKwYBBQUHMAGGGGh0dHA6Ly9vY3NwLmRpZ2lj
    ZXJ0LmNvbTBGBggrBgEFBQcwAoY6aHR0cDovL2NhY2VydHMuZGlnaWNlcnQuY29t
    L0RpZ2lDZXJ0U0hBMlNlY3VyZVNlcnZlckNBLmNydDAMBgNVHRMBAf8EAjAAMIIB
    BQYKKwYBBAHWeQIEAgSB9gSB8wDxAHcA9lyUL9F3MCIUVBgIMJRWjuNNExkzv98M
    LyALzE7xZOMAAAF0TwxDAwAABAMASDBGAiEA03gu3kVWZQOp1Gr14TDmW0R+V5w+
    DuCGgv68BRt2G2sCIQD30Z6qAGcYutag/+ejS4dwHFIjm3R0JB5aCRsYTh5eLQB2
    AO7Ale6NcmQPkuPDuRvHEqNpagl7S2oaFDjmR7LL7cX5AAABdE8MQ2kAAAQDAEcw
    RQIgXNAPvXKDo3BwaTyGvorAI8JbsoO2WiGlohzC8ZIF+HsCIQCKwZy6VZPcPlXy
    yB5BWcMH4+VwX0FrWErUL9Qy30IzSzANBgkqhkiG9w0BAQsFAAOCAQEAYm6UvTyg
    W05GU179MKi90C8NIlMWlhUv7kG6uV1bCrhYBOUqPTzqlXL/NOUg6ZyOnKAJqj6K
    g1TpbRfKXSl8WdfkeAYqMTEA0aGgwgCmC0d7+UKe2cm5vwIGEf0Gf/BVIPJ6poH0
    rv3Dpf42MUJ0xmF4fPe7WPoyf2FnB03oRHoe8tBmCuObp7EZKfDstaFo/r+cxfgw
    xrrldEs1luHZy/pVXMuDks0Bh4Wj40eh+MJNrcKAGmL1r8FlTGhkU2rMJfJTEkI4
    qGs9lWD223SkX9HqlVGor6P8KPgXZb609gOS3utgX0wV5mywxVqPyUIV3a0KMQle
    A03COnYwMxC8aA==
    -----END CERTIFICATE-----`;

    // DigiCert certificate (evernote's CA)
    const pemDigiCert = `-----BEGIN CERTIFICATE-----
    MIIElDCCA3ygAwIBAgIQAf2j627KdciIQ4tyS8+8kTANBgkqhkiG9w0BAQsFADBh
    MQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3
    d3cuZGlnaWNlcnQuY29tMSAwHgYDVQQDExdEaWdpQ2VydCBHbG9iYWwgUm9vdCBD
    QTAeFw0xMzAzMDgxMjAwMDBaFw0yMzAzMDgxMjAwMDBaME0xCzAJBgNVBAYTAlVT
    MRUwEwYDVQQKEwxEaWdpQ2VydCBJbmMxJzAlBgNVBAMTHkRpZ2lDZXJ0IFNIQTIg
    U2VjdXJlIFNlcnZlciBDQTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEB
    ANyuWJBNwcQwFZA1W248ghX1LFy949v/cUP6ZCWA1O4Yok3wZtAKc24RmDYXZK83
    nf36QYSvx6+M/hpzTc8zl5CilodTgyu5pnVILR1WN3vaMTIa16yrBvSqXUu3R0bd
    KpPDkC55gIDvEwRqFDu1m5K+wgdlTvza/P96rtxcflUxDOg5B6TXvi/TC2rSsd9f
    /ld0Uzs1gN2ujkSYs58O09rg1/RrKatEp0tYhG2SS4HD2nOLEpdIkARFdRrdNzGX
    kujNVA075ME/OV4uuPNcfhCOhkEAjUVmR7ChZc6gqikJTvOX6+guqw9ypzAO+sf0
    /RR3w6RbKFfCs/mC/bdFWJsCAwEAAaOCAVowggFWMBIGA1UdEwEB/wQIMAYBAf8C
    AQAwDgYDVR0PAQH/BAQDAgGGMDQGCCsGAQUFBwEBBCgwJjAkBggrBgEFBQcwAYYY
    aHR0cDovL29jc3AuZGlnaWNlcnQuY29tMHsGA1UdHwR0MHIwN6A1oDOGMWh0dHA6
    Ly9jcmwzLmRpZ2ljZXJ0LmNvbS9EaWdpQ2VydEdsb2JhbFJvb3RDQS5jcmwwN6A1
    oDOGMWh0dHA6Ly9jcmw0LmRpZ2ljZXJ0LmNvbS9EaWdpQ2VydEdsb2JhbFJvb3RD
    QS5jcmwwPQYDVR0gBDYwNDAyBgRVHSAAMCowKAYIKwYBBQUHAgEWHGh0dHBzOi8v
    d3d3LmRpZ2ljZXJ0LmNvbS9DUFMwHQYDVR0OBBYEFA+AYRyCMWHVLyjnjUY4tCzh
    xtniMB8GA1UdIwQYMBaAFAPeUDVW0Uy7ZvCj4hsbw5eyPdFVMA0GCSqGSIb3DQEB
    CwUAA4IBAQAjPt9L0jFCpbZ+QlwaRMxp0Wi0XUvgBCFsS+JtzLHgl4+mUwnNqipl
    5TlPHoOlblyYoiQm5vuh7ZPHLgLGTUq/sELfeNqzqPlt/yGFUzZgTHbO7Djc1lGA
    8MXW5dRNJ2Srm8c+cftIl7gzbckTB+6WohsYFfZcTEDts8Ls/3HB40f/1LkAtDdC
    2iDJ6m6K7hQGrn2iWZiIqBtvLfTyyRRfJs8sjX7tN8Cp1Tm5gr8ZDOo0rwAhaPit
    c+LJMto4JQtV05od8GiG7S5BNO98pVAdvzr508EIDObtHopYJeS4d60tbvVS3bR0
    j6tJLp07kzQoH3jOlOrHvdPJbRzeXDLz
    -----END CERTIFICATE-----`;

    it('basic field', () => {
        decode(Certificate.asn1Schema.main, pem2der(pemEvernote))
        .map(v => {
            const cert = v['tbsCertificate'];
            assert.ok(BigInt(cert.serialNumber).toString() === '18591377153366135306752357345801820721');
            assert.ok(cert.subject.filter(i => i[0].type === '2.5.4.10')[0][0].value === 'Evernote Corporation');
            assert.ok(oct2buf(cert.subject.filter(i => i[0].type === '2.5.4.3')[0][0].value).toString('utf-8') === '*.evernote.com');
            assert.ok(cert.validity[0] === '2020-09-02T00:00:00.000Z');     // notBefore
            assert.ok(cert.validity[1] === '2021-10-04T00:00:00.000Z');     // notAfter
        });
    });

    it('subjectPublicKey match subjectKeyIdentifier', () => {
        decode(Certificate.asn1Schema.main, pem2der(pemEvernote))
        .map(v => {
            const cert = v['tbsCertificate'];
            const pkey = cert.subjectPublicKeyInfo.subjectPublicKey;
            const pkeyId = cert.extensions.filter(i => i.extnID === '2.5.29.14')[0].extnValue;
            assert.ok(verifyKeyId(oct2buf(pkey), oct2buf(pkeyId)));
        });
    });

    it('ca public key match AuthorityKeyIdentifier', () => {
        Result.all([
            decode(Certificate.asn1Schema.main, pem2der(pemEvernote)),
            decode(Certificate.asn1Schema.main, pem2der(pemDigiCert)),
        ])
        .map(([subject, ca]) => [subject['tbsCertificate'], ca['tbsCertificate']])
        .map(([subject, ca]) => {
            assert.ok(verifyKeyId(
                oct2buf(ca.subjectPublicKeyInfo.subjectPublicKey),
                oct2buf(subject.extensions.filter(i => i.extnID === '2.5.29.35')[0].extnValue)));
        });
    });

    it('verify signature', () => {
        Value.fromBER(pem2der(pemEvernote))
        .map(v => {
            const tbsCert = v.__value[0].__ber;
            const sig = v.__value[2].__value;
            const caPkey = crypto.createPublicKey(pemDigiCert.split('\n').map(i => i.trim()).join('\n'));
            assert.ok(crypto.verify('sha256', oct2buf(tbsCert), caPkey, oct2buf(sig)));
        })
        .if_error(err => { throw err; });
    });
});

function decode (schema, ber: Buffer) {
    return Value.fromBER(ber)
    .chain(v => compose(schema, v))
    .if_error(error => { throw error; });
}

function verifyKeyId (key: Buffer, id: Buffer) {
    // https://tools.ietf.org/html/rfc5280#section-4.2.1.2
    const kid = crypto.createHash('sha1').update(key).digest();
    return Value.fromBER(id).map(v => Value.simplify(v))
    .map(idBox => find(idBox, `0x${kid.toString('hex')}`));

    function find (idBox: Json, target: string): boolean {
        // https://tools.ietf.org/html/rfc5280#section-4.2.1.1
        if (typeof idBox === 'string' && idBox === target) {
            return true;
        } else if (typeof idBox === 'object') {
            if (idBox instanceof Array) {
                return idBox.some(i => find(i, target));
            } else {
                return values(idBox).some(i => find(i, target));
            }
        } else {
            return false;
        }
    }
}

function pem2der (pem: string) {
    return Buffer.from(
        pem.split('\n')
            .slice(1, -1)
            .map(l => l.trim())
            .join(''),
        'base64');
}

function oct2buf (oct: string) {
    assert.ok(oct.startsWith('0x'));
    return Buffer.from(oct.replace(/^0x/, ''), 'hex');
}
