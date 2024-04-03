const { Scalar, F1Field } = require("ffjavascript");
const rootsOfUnity4096 = require("./rootsOfUnity4096.json");
const {
    scalar2fea
} = require("@0xpolygonhermez/zkevm-commonjs").smtUtils;

module.exports = class myHelper {
    blobSize = 4096;

    constructor() {
        this.FrBLS12_381 = new F1Field(0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001n);
    }

    setup(props) {
        for (const name in props) {
            this[name] = props[name];
        }
    }

    /**
     * Computes the inverse of the given element of the BLS12-381 scalar field.
     * @param ctx - Context.
     * @param tag - Tag.
    */
    eval_frBLS12_381inv(ctx, tag) {
        const ctxFullFe = { ...ctx, fullFe: true };
        const a = this.evalCommand(ctxFullFe, tag.params[0]);
        return this.FrBLS12_381.inv(a);
    }

    /**
     * Checks if the given element of the BLS12-381 scalar field is a 4096-th root of unity.
     * @param ctx - Context.
     * @param tag - Tag.
    */
    eval_check4096Root(ctx, tag) {
        const ctxFullFe = { ...ctx, fullFe: true };
        const z = this.evalCommand(ctxFullFe, tag.params[0]);

        for (let i = 0; i < this.blobSize; i++) {
            const rooti = BigInt(rootsOfUnity4096[i]);
            if (z === rooti) {
                ctx["BLS12_381Root"] = {z, index: i};
                return 1n;
            }
        }
        return 0n;
    }

    /**
     * Returns the index of the given element of the BLS12-381 scalar field if it is a 4096-th root of unity.
     * @param ctx - Context.
     * @param tag - Tag.
    */
    eval_get4096RootIndex(ctx, tag) {
        const ctxFullFe = { ...ctx, fullFe: true };
        const z = this.evalCommand(ctxFullFe, tag.params[0]);

        if (ctx["BLS12_381Root"]?.z === z) {
            return ctx["BLS12_381Root"].index;
        }

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

    eval_getY(ctx, tag) {
        if (tag.params.length != 0) throw new Error(`Invalid number of parameters (0 != ${tag.params.length}) function ${tag.funcName} ${ctx.sourceRef}`);
        return scalar2fea(ctx.Fr, Scalar.e(ctx.input.y));
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