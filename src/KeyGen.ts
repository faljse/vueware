import jsSHA from "jssha";


export class KeyGenerator {
    productHash: string;
    constructor(productHash: string) {
        this.productHash = productHash;
    }

    public GenerateSerial(count: number, version: number, addons: boolean[]=[true, true, true, true, true]): string {
        try {
            if (addons.length != 5)
                throw new Error("Addon array length is not 5.");
            if (version > 31 || version < 0)
                throw new Error("Version field needs to be within 0 to 31.");
            if (count > 65535 || count < 0)
                throw new Error("Count field needs to be within 0  to 65535.");
            let bitset = new Uint8Array(125);
            this.SetBitSetValue(bitset, 80, 25, BigInt(this.GetRandomNumber(25)), "UnitID - Random");
            this.SetBitSetValue(bitset, 105, 5, BigInt(version), "Version (Product Specific)");
            this.SetBitSetValue(bitset, 110, 15, BigInt(this.GetRandomNumber(15)), "BatchId - Random");
            if (version >= 6) {
                this.SetBitSetValue(bitset, 45, 16, BigInt(count), "Count - User Specified");
                this.SetBitSetValue(bitset, 61, 2, 0n, "Support - 0");
                this.SetBitSetValue(bitset, 63, 3, 0n, "Subscription - 0");
                this.SetBitSetValue(bitset, 66, 2, 0n, "Expiration - 0");
                this.SetBitSetValue(bitset, 68, 12, 0n, "Issue - 0 (Used for calculating end date)");
            }
            if (version >= 8) {
                let startingPos = 40;
                for (let i = 0; i < 5; i++) {
                    bitset[startingPos + i] = Number(addons[i]);
                }
            }
            this.SetBitSetValue(bitset, 0, 40, this.CalculateHash(bitset), "Hash / checksum (Yes, that fold operation converts bytes wrong. It's VMware's fault.)");

            return this.EncodeBitSet(this.PermutateBitSet(bitset));
        }
        catch (err) {
            return "Something has gone horribly wrong.";
        }
    }

    private EncodeBitSet(bitset: Uint8Array): string {
        let permutation = [25, 21, 1, 16, 19, 0, 20, 8, 22, 24, 27, 2, 9, 10, 6, 14, 26, 28, 3, 4, 12, 13, 7, 15, 18];
        let serial = new Uint8Array(29);
        serial[5] = serial[11] = serial[17] = serial[23] = "-".charCodeAt(0);
        for (let i = 0; i < 25; i++) {
            let pos = permutation[i];
            let charpos = this.GetBitSetValue(bitset, i * 5, 5);
            serial[pos] = "0123456789ACDEFGHJKLMNPQRTUVWXYZ".charCodeAt(charpos);
        }
        return new TextDecoder().decode(serial);
    }

    private PermutateBitSet(bitset: Uint8Array): Uint8Array {
        let newBitSet = new Uint8Array(125);
        let Counter1 = 0;
        let Counter2 = 40;
        let Counter3 = 80;
        let ShiftOffset = 21;
        for (let i1 = 0; i1 < 5; i1++) {
            for (let i2 = 0; i2 < ShiftOffset; i2++) {
                if ((i2 % 3 == 0) || (i2 == 20)) {
                    newBitSet[ShiftOffset * i1 + i2] = bitset[Counter1];
                    Counter1++;
                }
                else if ((i2 % 2 == 1) || (i2 == 16)) {
                    newBitSet[ShiftOffset * i1 + i2] = bitset[Counter2];
                    Counter2++;
                }
                else {
                    newBitSet[ShiftOffset * i1 + i2] = bitset[Counter3];
                    Counter3++;
                }
            }
        }

        for (let i1 = 105; i1 < 125; i1++) {
            newBitSet[i1] = bitset[i1];
        }
        return newBitSet;
    }

    private CalculateHash(bitset: Uint8Array): bigint {
        let HashSeed = new Uint8Array([125, -57, -119, -7, 105, 93, 113, -112, -6, -124, 34, -54, -65, 29, -64, -64, -120, 66, 55, -43, 112, -128, 46, -125, -57, -110, -93, 89, -58, -107, 36, -65]);
        const shaObj = new jsSHA("SHA-1", "UINT8ARRAY");
        for (let i = 0; i < 11; i++) {
            shaObj.update( new Uint8Array([this.GetBitSetValue(bitset, 40 + (i * 8), 8)]));
        }
        let enc = new TextEncoder();
        shaObj.update(enc.encode(this.productHash));
        shaObj.update(HashSeed);
        return (this.FoldHash(shaObj.getHash("UINT8ARRAY")));
    }

    private FoldHash(FullHash: Uint8Array): bigint {
        let convertedBytes = new BigInt64Array(FullHash.length);
        for (let i = 0; i < FullHash.length; i++) {
            let value = FullHash[i];
            if (value < 0) {
                value = value & 255;
            }
            convertedBytes[i] = BigInt(value);
        }
        return (convertedBytes[0] ^ convertedBytes[5] ^ convertedBytes[10] ^ convertedBytes[15]) |
            (convertedBytes[1] ^ convertedBytes[6] ^ convertedBytes[11] ^ convertedBytes[16]) << BigInt(8) |
            (convertedBytes[2] ^ convertedBytes[7] ^ convertedBytes[12] ^ convertedBytes[17]) << BigInt(16) |
            (convertedBytes[3] ^ convertedBytes[8] ^ convertedBytes[13] ^ convertedBytes[18]) << BigInt(24) |
            (convertedBytes[4] ^ convertedBytes[9] ^ convertedBytes[14] ^ convertedBytes[19]) << BigInt(32);
    }

    private GetRandomNumber(bits: number): number {
        return this.getRandomInt(Math.pow(2, bits));
    }

    private getRandomInt(max: number) {
        return Math.floor(Math.random() * max);
    }

    private GetBitSetValue(bitset: Uint8Array, position: number, bits: number): number {
        let result = 0;
        for (let i = 0; i < bits; i++) {
            if (bitset[position + i]) {
                result += (1 << (i));
            }
        }
        return result;
    }

    private SetBitSetValue(bitset: Uint8Array, position: number, bits: number, value: bigint, comment: string): void {
        for (let i = 0; i < bits; i++) {
            bitset[position + i] = Number((((value >> BigInt(i)) & BigInt(1)) == 1n));
        }
    }
}
