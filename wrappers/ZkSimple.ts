import {Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode} from 'ton-core';

export type ZkSimpleConfig = {};

export function zkSimpleConfigToCell(config: ZkSimpleConfig): Cell {
  return beginCell().endCell()
}
export const Opcodes = {
  verify: 0x3b3cca17,
};
export class ZkSimple implements Contract {
  constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
  }

  static createFromAddress(address: Address) {
    return new ZkSimple(address);
  }

  cellFromInputList(list: bigint[]): Cell {
    var builder = beginCell();
    builder.storeUint(list[0], 256);
    if (list.length > 1) {
      builder.storeRef(
        this.cellFromInputList(list.slice(1))
      );
    }
    return builder.endCell()
  }

  static createFromConfig(config: ZkSimpleConfig, code: Cell, workchain = 0) {
    const data = zkSimpleConfigToCell(config);
    const init = {code, data};
    return new ZkSimple(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }
  async sendVerify(
    provider: ContractProvider,
    via: Sender,
    opts: {
      pi_a: Buffer;
      pi_b: Buffer;
      pi_c: Buffer;
      pubInputs: bigint[];
      value: bigint;
      queryID?: number;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.verify, 32)
        .storeUint(opts.queryID ?? 0, 64)
        .storeRef(
          beginCell()
            .storeBuffer(opts.pi_a)
            .storeRef(
              beginCell()
                .storeBuffer(opts.pi_b)
                .storeRef(
                  beginCell()
                    .storeBuffer(opts.pi_c)
                    .storeRef(
                      this.cellFromInputList(opts.pubInputs)
                    )
                )
            )
        )
        .endCell(),
    });
  }
  async getRes(provider: ContractProvider) {
    const result = await provider.get('get_res', []);
    return result.stack.readNumber();
  }

}
