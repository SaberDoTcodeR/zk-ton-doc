import { toNano } from 'ton-core';
import { ZkSimple } from '../wrappers/ZkSimple';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const zkSimple = provider.open(ZkSimple.createFromConfig({}, await compile('ZkSimple')));

    await zkSimple.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(zkSimple.address);

    // run methods on `zkSimple`
}
