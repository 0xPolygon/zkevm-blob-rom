/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
/* eslint-disable no-use-before-define */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
const { expect } = require('chai');
const path = require('path')
const fs = require('fs');

const pathInputsBlob = path.join(__dirname,"../node_modules/@0xpolygonhermez/zkevm-testvectors/inputs-executor-blob");
const pathInputsFT = path.join(__dirname,"../node_modules/@0xpolygonhermez/zkevm-proverjs/src/sm/sm_main/logs-ft-blob");


it("Fulltracer tests", async function () {
    
    const inputsNames = fs.readdirSync(pathInputsBlob);
    for(let i = 0; i < inputsNames.length; i++) {
        const inputName = inputsNames[i];
        const inputPath = `${pathInputsBlob}/${inputName}`;
        const fulltracerPath = `${pathInputsFT}/${inputName.replace(".json","__ft.json")}`
        const input = require(inputPath);
        const inputFT = require(fulltracerPath);
        console.log("Check input: ", inputName);
        expect(inputFT.new_blob_state_root).to.be.equal(input.newBlobStateRoot);
        expect(inputFT.new_blob_acc_input_hash).to.be.equal(input.newBlobAccInputHash);
        expect(inputFT.new_num_blob).to.be.equal(input.newNumBlob);
        expect(inputFT.final_acc_batch_hash_data).to.be.equal(input.finalAccBatchHashData);
        expect(inputFT.local_exit_root_from_blob).to.be.equal(input.localExitRootFromBlob);
        expect(inputFT.is_invalid).to.be.equal(input.isInvalid);
    }
});