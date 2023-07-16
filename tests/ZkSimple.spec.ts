import {Blockchain, SandboxContract} from '@ton-community/sandbox';
import {Cell, toNano} from 'ton-core';
import {ZkSimple} from '../wrappers/ZkSimple';
import '@ton-community/test-utils';
import {compile} from '@ton-community/blueprint';
import * as snarkjs from "snarkjs";
import path from "path";
import {buildBls12381, utils} from "ffjavascript";

const {unstringifyBigInts} = utils;

const wasmPath = path.join(__dirname, "../build/circuits", "circuit.wasm");
const zkeyPath = path.join(__dirname, "../build/circuits", "circuit_final.zkey");

describe('ZkSimple', () => {
  let code: Cell;

  beforeAll(async () => {
    code = await compile('ZkSimple');
  });

  let blockchain: Blockchain;
  let zkSimple: SandboxContract<ZkSimple>;

  beforeEach(async () => {
    blockchain = await Blockchain.create();

    zkSimple = blockchain.openContract(ZkSimple.createFromConfig({}, code));

    const deployer = await blockchain.treasury('deployer');

    const deployResult = await zkSimple.sendDeploy(deployer.getSender(), toNano('0.05'));

    expect(deployResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: zkSimple.address,
      deploy: true,
      success: true,
    });
  });

  it('should deploy', async () => {
    // the check is done inside beforeEach
    // blockchain and zkSimple are ready to use
  });

  it('should verify', async () => {
    let input = {
      "a": "123",
      "b": "456",
    }
    let {proof, publicSignals} = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);
    console.log(publicSignals)
    let curve = await buildBls12381();
    let proofProc = unstringifyBigInts(proof);
    var pi_aS = g1Compressed(curve, proofProc.pi_a);
    var pi_bS = g2Compressed(curve, proofProc.pi_b);
    var pi_cS = g1Compressed(curve, proofProc.pi_c);
    var pi_a = Buffer.from(pi_aS, "hex");
    var pi_b = Buffer.from(pi_bS, "hex");
    var pi_c = Buffer.from(pi_cS, "hex");

    const verifier = await blockchain.treasury('verifier');
    const verifyResult = await zkSimple.sendVerify(verifier.getSender(), {
      pi_a: pi_a,
      pi_b: pi_b,
      pi_c: pi_c,
      pubInputs: publicSignals,
      value: toNano('0.15'),
    });
    expect(verifyResult.transactions).toHaveTransaction({
      from: verifier.address,
      to: zkSimple.address,
      success: true,
    });

    const res = await zkSimple.getRes();

    expect(res).not.toEqual(0);

    return;

  });

  function g1Compressed(curve, p1Raw) {
    let p1 = curve.G1.fromObject(p1Raw);

    let buff = new Uint8Array(48);
    curve.G1.toRprCompressed(buff, 0, p1);
    // convert from ffjavascript to blst format
    if (buff[0] & 0x80) {
      buff[0] |= 32;
    }
    buff[0] |= 0x80;
    return toHexString(buff);
  }

  function g2Compressed(curve, p2Raw) {
    let p2 = curve.G2.fromObject(p2Raw);

    let buff = new Uint8Array(96);
    curve.G2.toRprCompressed(buff, 0, p2);
    // convert from ffjavascript to blst format
    if (buff[0] & 0x80) {
      buff[0] |= 32;
    }
    buff[0] |= 0x80;
    return toHexString(buff);
  }

  function toHexString(byteArray) {
    return Array.from(byteArray, function (byte: any) {
      return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join("");
  }
});
