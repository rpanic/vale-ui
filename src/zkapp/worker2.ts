// type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

import {MultiSigContract} from "vale-core";
import {
    AccountUpdate,
    Bool,
    fetchAccount,
    Field,
    MerkleMapWitness,
    Mina,
    PrivateKey,
    PublicKey,
    Signature, UInt64
} from "snarkyjs";
import {ProveMethod} from "vale-core/build/src/utils";
import {Proposal, ProposalState} from "vale-core/build/src/multisigv2";
import {Networkprovider} from "@/zkapp/networkprovider";
import {tic, toc} from "@/zkapp/utils";

const state = {
    proofWithSignature: false as boolean,
    zkAppPk: undefined as string | undefined,
    vk: undefined as {hash: string, data: string} | undefined,
    verificationOutput: undefined as any | undefined
}

let snarky: {
    isReady,
}

export type ValeDeployArgs = {
    signerRoot: string,
    stateRoot: string,
    signersLength: number,
    k: number,
    deployer: string,
    auroDeployer: string
}

export type RollupArgs = { proposalState: any; receiver: string; signature: any; proposalWitness: any; walletAddress: any; vote: boolean; signerWitness: any; signer: string }

function getProveMethod() : ProveMethod{
    console.log("Prove Method: " + state.proofWithSignature ? "Signature" : "Proof")
    return state.proofWithSignature ? {
        zkappKey: PrivateKey.fromBase58(state.zkAppPk!)
    } : {
        verificationKey: state.vk
    }
}

const functions = {
    loadSnarkyJS: async (args: {}) => {

        snarky = {
            ...await import("snarkyjs")
        }
        await snarky.isReady;

        new Networkprovider().createNetwork()
    },

    initProveMethod: async (args: { proofWithSignature: boolean, zkAppPk: string }) => {

        state.proofWithSignature = args.proofWithSignature
        state.zkAppPk = args.zkAppPk

    },

    compile: async () => {

        if(!state.proofWithSignature){

            if(!state.vk){
                tic("Compiling contract in worker...")
                let vk = await MultiSigContract.compile()
                state.vk = vk.verificationKey
                state.verificationOutput = vk
                toc()
            }

        }
        return true

    },

    deployContract: async (args: ValeDeployArgs) => {

        let contractPk = PrivateKey.fromBase58(state.zkAppPk!)

        let proveMethod: ProveMethod = getProveMethod()

        let zkAppInstance = new MultiSigContract(contractPk.toPublicKey())
        let signerRoot = Field(args.signerRoot)
        let stateRoot = Field(args.stateRoot)
        let signersLength = Field(args.signersLength)
        let k = Field(args.k)

        let account = PrivateKey.fromBase58(args.deployer)

        console.log("zkapp: " + contractPk.toPublicKey().toBase58())
        console.log("deployer: " + account.toPublicKey().toBase58())

        let tx = await Mina.transaction({ feePayerKey: account, fee: 0.01 * 1e9 },() => { // { feePayerKey: account, fee: 0.01 * 1e9 },
            AccountUpdate.fundNewAccount(account);

            // TODO When sending with aurowallet
            // let au = AccountUpdate.create(account.toPublicKey())
            // au.balance.subInPlace(Mina.accountCreationFee())
            // au.

            zkAppInstance.deploy(proveMethod);
            zkAppInstance.setup(signerRoot, stateRoot, signersLength, k);

            console.log("Init with k = ", k);

            if(proveMethod.zkappKey){
                zkAppInstance.requireSignature()
            }
        });
        if(proveMethod.verificationKey){
            tic("Proving deploy transaction...")
            await tx.prove()
            toc()
        }
        tx.sign(proveMethod.zkappKey ? [proveMethod.zkappKey] : [])

        let txId = await tx.send()

        return txId.hash()
        // return tx.toJSON()

    },

    rollup: async (args: RollupArgs) => {

        await fetchAccount({ publicKey: PublicKey.fromBase58(args.receiver) })
        await fetchAccount({ publicKey: PublicKey.fromBase58(args.walletAddress) })

        let signature = Signature.fromJSON(args.signature)
        let vote = new Bool(args.vote)

        let p = new Proposal({
            amount: UInt64.from(args.proposalState.proposal.amount),
            receiver: PublicKey.fromBase58(args.proposalState.proposal.receiver)
        })
        let proposalState = new ProposalState({
            proposal: p,
            signerStateRoot: Field(args.proposalState.signerStateRoot),
            accountCreationFeePaid: Bool(args.proposalState.accountCreationFeePaid),
            index: Field(args.proposalState.index),
            votes: (args.proposalState.votes as string[]).map(x => Field(x)),
        })

        let deserializeWitness = (w: { isLefts: boolean[], siblings: string[] }) => {
            let isLefts = w.isLefts.map(b => Bool(b))
            let siblings = w.siblings.map(f => Field(f))
            return new MerkleMapWitness(isLefts, siblings)
        }

        let proposalWitness = deserializeWitness(args.proposalWitness)
        let signerWitness = deserializeWitness(args.signerWitness)

        let proveMethod = getProveMethod()

        let tx = await Mina.transaction(() => {

            let c = new MultiSigContract(PublicKey.fromBase58(args.walletAddress))

            c.doApproveSignature(PublicKey.fromBase58(args.signer), signature, vote, proposalState, proposalWitness, signerWitness)

            c.requireSignature()
        })
        if(proveMethod.verificationKey){
            tic("Proving rollup transaction...")
            await tx.prove()
            toc()
        }
        tx.sign(proveMethod.zkappKey ? [proveMethod.zkappKey] : [])

        return tx.toJSON()
    },

    sign: async(args: {pk: string, data: string[]}) => {

        let pk = PrivateKey.fromBase58(args.pk)
        let fields = args.data.map(x => Field(x))

        let signature = Signature.create(pk, fields)
        return Signature.toJSON(signature)

    }
};

export type WorkerFunctions = keyof typeof functions;

export type ZkappWorkerRequest = {
    id: number,
    fn: WorkerFunctions,
    args: string
}

export type ZkappWorkerReponse = {
    id: number,
    data: any
}
// if (process.browser) {
self.addEventListener('message', async (event: MessageEvent<ZkappWorkerRequest>) => {
    if(event.data.fn && event.data.args){
        try {

            const returnData = await functions[event.data.fn](JSON.parse(event.data.args));
            const message: ZkappWorkerReponse = {
                id: event.data.id,
                data: returnData,
            }
            postMessage(message)

        }catch(e){
            console.error(e)
            const message: ZkappWorkerReponse = {
                id: event.data.id,
                data: "Error"
            }
            postMessage(message)
        }


    }
});