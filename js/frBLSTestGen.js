// node js/frBLSTestGen.js > tmp/output.txt

const fs = require("fs");
const path = require("path");
const rootsOfUnity4096 = require("./rootsOfUnity4096.json");
const { F1Field } = require("ffjavascript");

const FrBLS12_381 = new F1Field(52435875175126190479447740508185965837690552500527637822603658699938581184513n);

const ops = ["add", "sub", "mul", "square", "inv", "reduce", "expBy4096", "polEval"];
const nArithTests = 10;
const blobSize = 4096n;
const invOf4096Fr = 0x73e66878b46ae3705eb6a46a89213de7d3686828bfce5c19400fffff00100001n;
const usePrevPol = true;
const saveFile = false;

function genRandomInOut(opname) {
    const x = FrBLS12_381.random();
    const y = FrBLS12_381.random();
    let z;
    switch (opname) {
        case "add":
            z = FrBLS12_381.add(x, y);
            console.log(`\t${x}n => A\n\t${y}n => C\n\t:CALL(${opname}FrBLS12381)\n\tC => A\n\t${z}n\t:ASSERT\n`);
            break;
        case "sub":
            z = FrBLS12_381.sub(x, y);
            console.log(`\t${x}n => A\n\t${y}n => C\n\t:CALL(${opname}FrBLS12381)\n\tC => A\n\t${z}n\t:ASSERT\n`);
            break;
        case "mul":
            z = FrBLS12_381.mul(x, y);
            console.log(`\t${x}n => A\n\t${y}n => B\n\t:CALL(${opname}FrBLS12381)\n\tC => A\n\t${z}n\t:ASSERT\n`);
            break;
        case "square":
            z = FrBLS12_381.square(x);
            console.log(`\t${x}n => A\n\t:CALL(${opname}FrBLS12381)\n\t${z}n\t:ASSERT\n`);
            break;
        case "inv":
            z = FrBLS12_381.inv(x);
            console.log(`\t${x}n => A\n\t:CALL(${opname}FrBLS12381)\n\t${z}n\t:ASSERT\n`);
            break;
        case "reduce":
            z = FrBLS12_381.mod(x, FrBLS12_381.p);
            console.log(`\t${x}n => A\n\t:CALL(${opname}FrBLS12381)\n\t${z}n\t:ASSERT\n`);
            break;
        case "expBy4096":
            z = FrBLS12_381.exp(x, 4096n);
            console.log(`\t${x}n => A\n\t:CALL(${opname}FrBLS12381)\n\t${z}n\t:ASSERT\n`);
            break;
        case "polEval":
            console.log(`\t${x}n\t:MSTORE(${opname}FrBLS12381_z)`);

            const pathFile = path.join(__dirname, 'polEvals.json');
            let pol = [];
            if (usePrevPol === false) {
                for (let i = 0; i < blobSize; i++) {
                    const evali = FrBLS12_381.random();
                    console.log(`${i}n => RR\n${evali}n\t:MSTORE(${opname}FrBLS12381_pol_eval + RR)`);
                    pol.push(evali);
                }
            } else {
                const polFile = JSON.parse(fs.readFileSync(pathFile, 'utf8'));
                pol = polFile.map(x => BigInt(x));
            }

            if (saveFile === true) {
                const polFile = JSON.stringify(pol.map(x => x.toString()), null, 2)

                fs.writeFileSync(pathFile, polFile, 'utf8', (err) => {
                    if (err) {
                      console.error('Error writing the polynomial:', err);
                      return;
                    }
                    console.log('Polynomial has been saved!');
                  });
            }

            // f(z) = fᵢ, z = ωⁱ
            // if pointZ is any of the rootUnity, return the blobData on index i
            for (let i = 0; i < blobSize; i++) {
                const rooti = FrBLS12_381.e(rootsOfUnity4096[i]);
                if (FrBLS12_381.eq(x, rooti)) {
                    throw new Error(`Point ${x} is a root of unity`);
                }
            }

            // Compute f(x) = (x⁴⁰⁹⁶-1)/4096·∑ᵢ fᵢ·ωⁱ/(x-ωⁱ)
            let a = FrBLS12_381.exp(x, blobSize);
            a = FrBLS12_381.sub(a, 1n);
            a = FrBLS12_381.mul(a, invOf4096Fr);

            let accum = FrBLS12_381.zero;
            for (let i = 0; i < blobSize; i++) {
                const rooti = FrBLS12_381.e(rootsOfUnity4096[i])
                const num = FrBLS12_381.mul(pol[i], rooti);
                const den = FrBLS12_381.sub(x, rooti);
                let termi = FrBLS12_381.inv(den);
                termi = FrBLS12_381.mul(num, termi);
                accum = FrBLS12_381.add(accum, termi);
            }
            const result = FrBLS12_381.mul(a, accum);

            console.log(`\t:CALL(${opname}FrBLS12381)\n\t${result}n\t:MLOAD(${opname}FrBLS12381_y)\n`);
            break;
        default:
            throw new Error("Invalid opname");
    }
}

for (const opname of ops) {
    if (opname !== "polEval") {
        for (let i = 0; i < nArithTests; i++) {
            genRandomInOut(opname);
        }
    } else {
        if (usePrevPol === true && saveFile === false) {
            for (let i = 0; i < nArithTests; i++) {
                genRandomInOut(opname);
            }
        } else if (usePrevPol === false){
            genRandomInOut(opname);
        }
    }
}