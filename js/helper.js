const { Scalar, F1Field } = require("ffjavascript");
const rootsOfUnity4096 = require("./rootsOfUnity4096.json");
const { scalar2fea } =  require("@0xpolygonhermez/zkevm-commonjs").smtUtils;

module.exports = class myHelper {
    blobSize = 4096;

    constructor() {
        this.FrBLS12_381 = new F1Field(0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001n);
        this.FpBLS12_381 = new F1Field(0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaabn);
    }

    setup(props) {
        for (const name in props) {
            this[name] = props[name];
        }
    }

    /**
     *
     * @param ctx - Context.
     * @param tag - Tag.
     * @returns The square root of the input scalar in the BLS12-381 base field or 2^384-1 if the input scalar is not a square.
     */
    eval_fpBLS12_381_sqrt(ctx, tag) {
        const field = this.FpBLS12_381;

        const a = field.e(this.evalCommand(ctx, tag.params[0]));
        const sign = Number(this.evalCommand(ctx, tag.params[1])); // Also knows as "parity"

        if (field.eq(a, 0n)) {
            return 0n;
        }

        if (field.exp(a, (field.p - 1n) / 2n) !== 1n) {
            // console.warn(`${a.toString(16)} is not a square in Fp`);

            // return 2^384-1, the maximum allowed value that can be represented
            return 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn;
        }

        // You don't need to apply the standard Tonelli-Shanks algorithm because p = 3 mod 4
        const sqrt = field.exp(a, (field.p + 1n) / 4n); // a^((p+1)/4)

        if (sign_p(sqrt) === sign) {
            return sqrt;
        } else {
            return field.neg(sqrt);
        }

        function sign_p(a) {
            return a > (field.p - 1n) / 2n ? 1 : 0;
        }
    }

    /**
     *
     * @param ctx - Context.
     * @param tag - Tag.
     * @returns Length of the binary representation of the input scalar. If there are multiple input scalars, it returns the maximum length.
     */
    // TODO: Rethink it
    eval_lenBinDecomp(ctx, tag) {
        let k = BigInt(this.evalCommand(ctx, tag.params[0]));
        if (k === 0n) return 1;
        let len = 0;
        while (k > 0n) {
            k >>= 1n;
            len++;
        }
        return len;
    }

    /**
     * Computes the inverse of the given element of the BLS12-381 scalar field.
     * @param ctx - Context.
     * @param tag - Tag.
    */
    eval_frBLS12_381_inv(ctx, tag) {
        const ctxFullFe = { ...ctx, fullFe: true };
        const a = this.evalCommand(ctxFullFe, tag.params[0]);
        return this.FrBLS12_381.inv(a);
    }

    /**
     * Computes the inverse of the given element of the BLS12-381 base field.
     * @param ctx - Context.
     * @param tag - Tag.
    */
    eval_fpBLS12_381_inv(ctx, tag) {
        const ctxFullFe = { ...ctx, fullFe: true };
        const a = this.evalCommand(ctxFullFe, tag.params[0]);
        return this.FpBLS12_381.inv(a);
    }

    fp2Add(a, b) {
        return [this.FpBLS12_381.add(a[0], b[0]), this.FpBLS12_381.add(a[1], b[1])];
    }

    fp2Sub(a, b) {
        return [this.FpBLS12_381.sub(a[0], b[0]), this.FpBLS12_381.sub(a[1], b[1])];
    }

    fp2Mul(a, b) {
        const F = this.FpBLS12_381;
        const a0b0 = F.mul(a[0], b[0]);
        const a1b1 = F.mul(a[1], b[1]);
        const a0b1 = F.mul(a[0], b[1]);
        const a1b0 = F.mul(a[1], b[0]);
        return [F.sub(a0b0, a1b1), F.add(a0b1, a1b0)];
    }

    fp2ScalarMul(a, b) {
        return [this.FpBLS12_381.mul(a[0], b), this.FpBLS12_381.mul(a[1], b)];
    }

    fp2Square(a) {
        const F = this.FpBLS12_381;
        const a0a1 = F.mul(a[0], a[1]);
        const a0a0 = F.square(a[0]);
        const a1a1 = F.square(a[1]);
        return [F.sub(a0a0, a1a1), F.add(a0a1, a0a1)];
    }

    fp2Inv(a) {
        const F = this.FpBLS12_381;
        if (F.isZero(a[0]) && F.isZero(a[1])) {
            throw new Error("Inversion of zero");
        }

        const den = F.add(F.square(a[0]), F.square(a[1]));
        return [F.div(a[0], den), F.neg(F.div(a[1], den))];
    }

    fp2Div(a, b) {
        return this.fp2Mul(a, this.fp2Inv(b));
    }

    fp2GetSlope(x1, y1, x2, y2, isDouble) {
        if (isDouble) {
            return this.fp2Div(
                this.fp2ScalarMul(this.fp2Square(x1), 3n),
                this.fp2ScalarMul(y1, 2n)
            );
        } else {
            return this.fp2Div(this.fp2Sub(y2, y1), this.fp2Sub(x2, x1));
        }
    }

    eval_fp2GetSlope_x(ctx, tag) {
        const ctxFullFe = { ...ctx, fullFe: true };
        const isDouble = tag.params.length === 4;
        const x1 = [this.evalCommand(ctxFullFe, tag.params[0]), this.evalCommand(ctxFullFe, tag.params[1])];
        const y1 = [this.evalCommand(ctxFullFe, tag.params[2]), this.evalCommand(ctxFullFe, tag.params[3])];
        const x2 = [this.evalCommand(ctxFullFe, isDouble ? tag.params[0] : tag.params[4]), this.evalCommand(ctxFullFe, isDouble ? tag.params[1] : tag.params[5])];
        const y2 = [this.evalCommand(ctxFullFe, isDouble ? tag.params[2] : tag.params[6]), this.evalCommand(ctxFullFe, isDouble ? tag.params[3] : tag.params[7])];

        return this.fp2GetSlope(x1, y1, x2, y2, isDouble)[0];
    }

    eval_fp2GetSlope_y(ctx, tag) {
        const ctxFullFe = { ...ctx, fullFe: true };
        const isDouble = tag.params.length === 4;
        const x1 = [this.evalCommand(ctxFullFe, tag.params[0]), this.evalCommand(ctxFullFe, tag.params[1])];
        const y1 = [this.evalCommand(ctxFullFe, tag.params[2]), this.evalCommand(ctxFullFe, tag.params[3])];
        const x2 = [this.evalCommand(ctxFullFe, isDouble ? tag.params[0] : tag.params[4]), this.evalCommand(ctxFullFe, isDouble ? tag.params[1] : tag.params[5])];
        const y2 = [this.evalCommand(ctxFullFe, isDouble ? tag.params[2] : tag.params[6]), this.evalCommand(ctxFullFe, isDouble ? tag.params[3] : tag.params[7])];

        return this.fp2GetSlope(x1, y1, x2, y2, isDouble)[1];
    }

    eval_fp2GetVerticalIntercept_x(ctx, tag) {
        const ctxFullFe = { ...ctx, fullFe: true };
        const slope = [this.evalCommand(ctxFullFe, tag.params[0]), this.evalCommand(ctxFullFe, tag.params[1])];
        const x = [this.evalCommand(ctxFullFe, tag.params[2]), this.evalCommand(ctxFullFe, tag.params[3])];
        const y = [this.evalCommand(ctxFullFe, tag.params[4]), this.evalCommand(ctxFullFe, tag.params[5])];

        return this.fp2Sub(y, this.fp2Mul(slope, x))[0];
    }

    eval_fp2GetVerticalIntercept_y(ctx, tag) {
        const ctxFullFe = { ...ctx, fullFe: true };
        const slope = [this.evalCommand(ctxFullFe, tag.params[0]), this.evalCommand(ctxFullFe, tag.params[1])];
        const x = [this.evalCommand(ctxFullFe, tag.params[2]), this.evalCommand(ctxFullFe, tag.params[3])];
        const y = [this.evalCommand(ctxFullFe, tag.params[4]), this.evalCommand(ctxFullFe, tag.params[5])];

        return this.fp2Sub(y, this.fp2Mul(slope, x))[1];
    }


    /**
     * Computes the "real" part of the inverse of the given Fp2 element.
     * @param ctx - Context.
     * @param tag - Tag.
    */
    eval_fp2BLS12_381_inv_x(ctx, tag) {
        const Fp = this.FpBLS12_381;
        const ctxFullFe = { ...ctx, fullFe: true };
        const a = this.evalCommand(ctxFullFe, tag.params[0]);
        const b = this.evalCommand(ctxFullFe, tag.params[1]);
        const den = Fp.add(Fp.mul(a, a), Fp.mul(b, b));

        return Fp.div(a, den);
    }

    /**
     * Computes the "imaginary" part of the inverse of the given Fp2 element.
     * @param ctx - Context.
     * @param tag - Tag.
    */
    eval_fp2BLS12_381_inv_y(ctx, tag) {
        const Fp = this.FpBLS12_381;
        const ctxFullFe = { ...ctx, fullFe: true };
        const a = this.evalCommand(ctxFullFe, tag.params[0]);
        const b = this.evalCommand(ctxFullFe, tag.params[1]);
        const den = Fp.add(Fp.mul(a, a), Fp.mul(b, b));

        return Fp.div(Fp.neg(b), den);
    }

    /**
     * Returns the index of the given element of the BLS12-381 scalar field if it is a 4096-th root of unity.
     * @param ctx - Context.
     * @param tag - Tag.
    */
    eval_get4096RootIndex(ctx, tag) {
        const z = this.evalCommand(ctx, tag.params[0]);

        for (let i = 0; i < this.blobSize; i++) {
            const rooti = BigInt(rootsOfUnity4096[i]);
            if (z === rooti) {
                return i;
            }
        }
        throw new Error("Root not found");
    }

    eval_getLastL1InfoTreeIndex(ctx, tag) {
        if (tag.params.length != 0) throw new Error(`Invalid number of parameters (0 != ${tag.params.length}) function ${tag.funcName} ${ctx.sourceRef}`);

        return [ctx.Fr.e(ctx.input.lastL1InfoTreeIndex), ctx.Fr.zero, ctx.Fr.zero, ctx.Fr.zero, ctx.Fr.zero, ctx.Fr.zero, ctx.Fr.zero, ctx.Fr.zero];
    }

    eval_getLastL1InfoTreeRoot(ctx, tag) {
        if (tag.params.length != 0) throw new Error(`Invalid number of parameters (0 != ${tag.params.length}) function ${tag.funcName} ${ctx.sourceRef}`);
        return scalar2fea(ctx.Fr, Scalar.e(ctx.input.lastL1InfoTreeRoot));
    }

    eval_getTimestampLimit(ctx, tag) {
        if (tag.params.length != 0) throw new Error(`Invalid number of parameters (0 != ${tag.params.length}) function ${tag.funcName} ${ctx.sourceRef}`);

        return [ctx.Fr.e(ctx.input.timestampLimit), ctx.Fr.zero, ctx.Fr.zero, ctx.Fr.zero, ctx.Fr.zero, ctx.Fr.zero, ctx.Fr.zero, ctx.Fr.zero];
    }

    eval_getZkGasLimit(ctx, tag) {
        if (tag.params.length != 0) throw new Error(`Invalid number of parameters (0 != ${tag.params.length}) function ${tag.funcName} ${ctx.sourceRef}`);

        return scalar2fea(ctx.Fr, Scalar.e(ctx.input.zkGasLimit));
    }

    eval_getType(ctx, tag) {
        if (tag.params.length != 0) throw new Error(`Invalid number of parameters (0 != ${tag.params.length}) function ${tag.funcName} ${ctx.sourceRef}`);

        return [ctx.Fr.e(ctx.input.blobType), ctx.Fr.zero, ctx.Fr.zero, ctx.Fr.zero, ctx.Fr.zero, ctx.Fr.zero, ctx.Fr.zero, ctx.Fr.zero];
    }

    eval_getZ(ctx, tag) {
        if (tag.params.length != 0) throw new Error(`Invalid number of parameters (0 != ${tag.params.length}) function ${tag.funcName} ${ctx.sourceRef}`);
        return scalar2fea(ctx.Fr, Scalar.e(ctx.input.z));
    }

    eval_getVersionedHash(ctx, tag) {
        if (tag.params.length != 0) throw new Error(`Invalid number of parameters (0 != ${tag.params.length}) function ${tag.funcName} ${ctx.sourceRef}`);
        return scalar2fea(ctx.Fr, Scalar.e(ctx.input.versionedHash));
    }

    eval_getKzgCommitmentHash(ctx, tag) {
        if (tag.params.length != 0) throw new Error(`Invalid number of parameters (0 != ${tag.params.length}) function ${tag.funcName} ${ctx.sourceRef}`);
        return scalar2fea(ctx.Fr, Scalar.e(ctx.input.kzgCommitmentHash));
    }

    eval_getKzgProof(ctx, tag) {
        if (tag.params.length != 1) throw new Error(`Invalid number of parameters (0 != ${tag.params.length}) function ${tag.funcName} ${ctx.sourceRef}`);
        if(tag.params[0].varName === 'high') {
            return scalar2fea(ctx.Fr, Scalar.e("0x"+ctx.input.kzgProof.replace("0x","").substring(0,16*2)));
        } else if(tag.params[0].varName === 'low') {
            return scalar2fea(ctx.Fr, Scalar.e("0x"+ctx.input.kzgProof.replace("0x","").substring(16*2)));
        }
    }

    eval_getBlobL2HashData(ctx, tag) {
        if (tag.params.length != 0) throw new Error(`Invalid number of parameters (0 != ${tag.params.length}) function ${tag.funcName} ${ctx.sourceRef}`);
        return scalar2fea(ctx.Fr, Scalar.e(ctx.input.blobL2HashData));
    }

    eval_getForcedHashData(ctx, tag) {
        if (tag.params.length != 0) throw new Error(`Invalid number of parameters (0 != ${tag.params.length}) function ${tag.funcName} ${ctx.sourceRef}`);
        return scalar2fea(ctx.Fr, Scalar.e(ctx.input.forcedHashData));
    }

    eval_getBlobLen(ctx, tag) {
        if (tag.params.length != 0) throw new Error(`Invalid number of parameters (0 != ${tag.params.length}) function ${tag.funcName} ${ctx.sourceRef}`);
        const inputLen = ctx.input.blobData.startsWith("0x") ? ctx.input.blobData.slice(2).length : ctx.input.blobData.length
        return [ctx.Fr.e(inputLen / 2), ctx.Fr.zero, ctx.Fr.zero, ctx.Fr.zero, ctx.Fr.zero, ctx.Fr.zero, ctx.Fr.zero, ctx.Fr.zero];
    }
};