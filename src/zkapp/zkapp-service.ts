import {
    AccountUpdate,
    fetchAccount,
    isReady,
    Mina,
    PrivateKey,
    PublicKey,
    setGraphqlEndpoint,
    UInt64, Signature, Bool, MerkleMapWitness, Field, CircuitString, Types
} from "snarkyjs"
import { MultiSigContract } from "vale-core";
import { ApiService, JsonProof } from "./api-service";
import { GraphQlService } from "./graphql";
import { StorageService } from "./storage-service";
import type { WalletProvider } from "./walletprovider";
import "./worker"
import {tic, toc} from 'tictoc'
import { ProposalState} from "vale-core/build/src/multisigv2";
import {DeployedWalletImpl} from "@/zkapp/viewmodel";
import {ProveMethod} from "vale-core/build/src/utils";
import {Networkprovider} from "@/zkapp/networkprovider";

export interface TxSendResults {
    txhash: string
}

export interface DeployResults extends TxSendResults {
    address: PublicKey
}

export interface WalletAccountData {
    address: string
    network: string
    balance: bigint,
    live: boolean,
    deploymentPending: boolean
}

export interface QueuedOperation {
    signer: PublicKey,
    signature: Signature,
    vote: Bool,
    proposalState: ProposalState,
    proposalWitness: MerkleMapWitness,
    signerWitness: MerkleMapWitness
}

export interface RollupWorkerParams {
    walletAddress: string,
    proposal: {
        receiver: string,
        amount: string
    },
    signers: string[],
    alreadySigned: string[],
    proof: JsonProof,
    votes: {
        before: [number, number]
        after: [number, number]
    },
    feePayer: string
}

export class ZkAppService {

    connected: Boolean = false
    // MultiSigZkApp: any

    isReady2: Promise<any>
    res: (value: any) => void = () => {}

    public apiService = new ApiService()

    programCompiled = false

    constructor(){
        this.initWindow()
        
        this.isReady2 = new Promise((res) => {
            this.res = res
        })
    }

    initWindow(){
        (window as any).service = this;
        (window as any).PrivateKey = PrivateKey;
        (window as any).PublicKey = PublicKey;
        (window as any).graphql = new GraphQlService();
        (window as any).Field = Field;
        (window as any).CircuitString = CircuitString;
        (window as any).Signature = Signature;

        (window as any).test = async () => {
            let au = await fetchAccount({publicKey: "B62qk44Js1KXcCeabogSD5XH3UEVTNY3E85mrWtBM1v8tYqSUZEXY9D"});
            console.log("asd")
            console.log(au.account)
        }
    }

    init(){
        isReady.then(async x => {

            let r = new Networkprovider().createNetwork()

            if(r.fundedAccount){
                new StorageService().setTempDeployerAccount(PrivateKey.fromBase58(r.fundedAccount))
            }
            this.connected = true
            this.res({})

        })

    }

    async test(){
        // let signers = [PrivateKey.random().toPublicKey(), PrivateKey.random().toPublicKey()]
        // let proposal = new Proposal(signers[0], Field.fromNumber(1000))
        // console.log(proposal.hash().toString())
        // let signerList = SignerList.constructFromSigners(signers)
        // console.log(signerList.hash().toString())

        // console.log(new URL(".").toString())

        let worker = new Worker(new URL("./worker.ts", import.meta.url), {type: "module"})
        worker.addEventListener("message", e => {
            console.log("msg", e.data)
        })
        worker.addEventListener("error", e => {
            console.log(e)
        })
        worker.postMessage("init")

    }

    workerInstance: Worker = new Worker(new URL("./worker.ts", import.meta.url), {type: "module"})

    worker(request: any & {operation: string}, resOp: string) : Promise<any>{
        return new Promise<any>(res => {
            
            this.workerInstance.postMessage(JSON.stringify(request))
            let listener = (e: MessageEvent<any>) => {
                
                if(e.data.startsWith("{")){
                    let o = JSON.parse(e.data)
                    if(Object.keys(o).includes("operation")){
                        if(o.operation === resOp){
                            res(o.data)
                            this.workerInstance.removeEventListener("message", listener)
                            // this.workerInstance.terminate()
                        }
                    }
                }

            }
            this.workerInstance.addEventListener("message", listener)
        })
    }

    async signProposal(key: PublicKey, signature: Signature, vote: boolean, wallet: DeployedWalletImpl) : Promise<QueuedOperation>{

        (window as any).state = {key, vote, wallet}

        if(!this.programCompiled){
            await this.worker({operation: "compile", params: {}}, "compile_ret")
            this.programCompiled = true
        }

        console.log(key.toBase58(), vote)

        let proposalState = wallet.getProposalState()!

        let stateMap = wallet.getStateMerkleMap()
        let signerMap = wallet.getSignerMerkleMap()

        let o = {
            signer: key,
            signature,
            vote: Bool(vote),
            proposalState,
            proposalWitness: stateMap.getWitness(proposalState.index),
            signerWitness: signerMap.getWitness(key.x),
        }

        let newAccount = Mina.hasAccount(proposalState.proposal.receiver)

        wallet.simulateApproval(key, vote, newAccount)

        return o

    }

    async rollup(op: QueuedOperation, wallet: DeployedWalletImpl, walletProvider: WalletProvider) : Promise<TxSendResults> {

        // console.log(Mina.hasAccount(wallet.proposal!.receiver))
        // await Mina.getAccount(wallet.proposal!.receiver)
        await fetchAccount({ publicKey: wallet.proposal!.receiver })

        let tx = await Mina.transaction(() => {

            let c = new MultiSigContract(PublicKey.fromBase58(wallet.address))

            c.doApproveSignature(op.signer, op.signature, op.vote, op.proposalState, op.proposalWitness, op.signerWitness)

            c.requireSignature()
        })
        tx.sign([PrivateKey.fromBase58(wallet.contractPk)])

        let hash = await walletProvider.sendTransaction(tx.toJSON())
        return {
            txhash: hash
        }

    }

    // async rollup(proof: MultiSigProof, wallet: DeployedWalletState, account: PrivateKey, walletProvider: WalletProvider) : Promise<TxSendResults>{
    //
    //     let votes = [0, 0]
    //     wallet.state?.signatures.map(x => x.vote).forEach(a => votes[a ? 0 : 1]++)
    //     let alreadySigned = wallet.state!.signatures.map(x => x.address.toBase58())
    //
    //     let params = {
    //         alreadySigned,
    //         feePayer: account.toBase58(),
    //         proof: proof.toJSON(),
    //         proposal: {
    //             receiver: wallet.state!.proposal.receiver.toBase58(),
    //             amount: wallet.state!.proposal.amount.toString()
    //         },
    //         signers: wallet.wallet.signers,
    //         walletAddress: wallet.wallet.address,
    //         votes: {
    //             before: [0, 0],
    //             after: votes
    //         }
    //     } as RollupWorkerParams
    //
    //     console.log("Compiling Smartcontract & Program...")
    //     await this.worker({operation: "compileContract", params: {}}, "compileContract_ret")
    //
    //     let txJson = await this.worker({operation: "proveContract", params: params}, "proveContract_ret")
    //     let txAny = JSON.parse(txJson)
    //
    //     console.log("Tx received from worker")
    //
    //     if(txAny.success === false){
    //         throw txAny.error
    //     }else{
    //         let query = this.sendZkAppQuery(txJson)
    //         let ret = await this.sendGraphQL(this.graphqlEndpoint, query)
    //
    //         console.log(ret)
    //         let hash = ret.data.sendZkapp.zkapp.hash
    //         return {
    //             txhash: hash
    //         }
    //     }
    //
    // }
    //
    // async rollup_old(proof: MultiSigProof, wallet: DeployedWalletState, account: PrivateKey, walletProvider: WalletProvider) : Promise<TxSendResults>{
    //
    //     let zkAppAddress = PublicKey.fromBase58(wallet.wallet.address)
    //
    //     let proposal = new Proposal(wallet.state!.proposal.receiver, Field.fromString(wallet.state!.proposal.amount.toString()))
    //     let signerList = SignerList.constructFromSigners(wallet.wallet.signers.map(x => PublicKey.fromBase58(x)))
    //     let state1 = new ProposalState(proposal, [Field.zero, Field.zero], signerList)
    //
    //     let votes = [0, 0]
    //     wallet.state?.signatures.map(x => x.vote).forEach(a =>  votes[a ? 0 : 1]++)
    //     let alreadySigned = wallet.state!.signatures.map(x => x.address)
    //
    //     let state2 = new ProposalState(proposal, votes.map(x => Field.fromNumber(x)), signerList.cloneWithout(...alreadySigned))
    //
    //     console.log(state1.hash().toString())
    //     console.log(state2.hash().toString())
    //
    //     console.log(proof.publicInput.startProposalsHash.toString())
    //     console.log(proof.publicInput.proposalsHash.toString())
    //
    //     console.log("Compiling Smartcontract & Program...")
    //     tic()
    //
    //     MultiSigZkProgram.compile()
    //     MultiSigZkApp.compile()
    //
    //     toc()
    //
    //     let tx = await Mina.transaction({feePayerKey: account, fee: 0.01 * 1e9}, () => {
    //         let zkApp = new MultiSigZkApp(zkAppAddress);
    //
    //         zkApp.approveWithProof(proof, state2, state1)
    //
    //         // zkApp.sign(zkAppPrivateKey);
    //     });
    //     try {
    //         await tx.prove()
    //         tx.sign()
    //
    //         let json = tx.toJSON()
    //         console.log(json)
    //
    //         let hash = await tx.send().hash()
    //         // let res = await walletProvider.sendTransaction(json)
    //
    //         return { txhash: hash }
    //     } catch (err) {
    //         console.log(err)
    //         throw err
    //     }
    //
    // }

    async getWalletData(address: string, deploymentTx: string) : Promise<WalletAccountData | undefined>{

        await this.isReady2

        if(Networkprovider.local){
            return {
                address: address,
                network: "Berkeley",
                balance: UInt64.from(0.1 * 1e9).toBigInt(),
                live: true,
                deploymentPending: false
            }
        }

        // let account = await fetchAccount({ publicKey: PublicKey.fromBase58("B62qmSQJSTTsaLyrPDqa93KMWyGq9YcAfUQwNSqvaXyYbByrPUEhs5Y") })
        let account = await fetchAccount({ publicKey: PublicKey.fromBase58(address)})

        console.log("Account", address, account.account)
        if(account.account){

            let appState = account.account.appState
            let live = appState !== undefined && appState[0].toBigInt() > 0

            ;
            return {
                address: address,
                network: "Berkeley",
                balance: account.account.balance.toBigInt(),
                live,
                deploymentPending: false
            }
        } else {

            //Check deployment tx
            let pending = await new GraphQlService().getPendingTransaction(deploymentTx)
            return {
                address: address,
                network: "Berkeley",
                balance: 0n,
                live: false,
                deploymentPending: pending
            }
        }

    }

    async getZkAppInfo(address: string) : Promise<any>{

        let info = await fetchAccount({publicKey: address})
        console.log(info)
        return info

    }

    async deploy(
        deployer: PrivateKey,
        contract: DeployedWalletImpl,
        walletProvider: WalletProvider
    ) : Promise<DeployResults>{

        console.log("Deploying new zkapp")

        let contractpk = PrivateKey.fromBase58(contract.contractPk)

        let proveMethod = {
            zkappKey: contractpk.toBase58()
        }
        await this.worker({operation: "init", proveMethod: proveMethod}, "init_ret")

        console.log(contractpk.toBase58())

        await this.worker({operation: "compileContract"}, "compileContract_ret")
        this.programCompiled = true

        let pubKey = contractpk.toPublicKey()
        // pubKey = PublicKey.fromBase58("B62qqsc4Msf91dG4B9oWTphuQJ2TaGT5se7NVJEKcKfLbFkwEGCJSEb")

        let signerMap = contract.getSignerMerkleMap()
        let stateMap = contract.getStateMerkleMap()

        console.log("Creating transaction")

        let auroDeployer = (await walletProvider.accounts())[0]

        let workerPayload = {
            signerRoot: signerMap.getRoot().toString(),
            stateRoot: stateMap.getRoot().toString(),
            signersLength: contract.signers.length,
            k: contract.k,
            deployer: deployer.toBase58(),
            auroDeployer
        }

        let txObj = await this.worker({operation: "deployContract", payload: workerPayload}, "deployContract_ret")

        //TODO Aurowallet doesn´t sign the first accountupdate...
        // let txJson = txObj.tx
        // let hash2 = await walletProvider.sendTransaction(txJson)

        // let tx = Types.ZkappCommand.fromJSON(txJson)

        return {
            txhash: txObj.txhash,
            // txhash: hash2,
            address: pubKey
        }
    }

    async sendMina(
        sender: PrivateKey,
        receiver: PublicKey
    ){
        let tx = await Mina.transaction({feePayerKey: sender, fee: 0.01 * 1e9}, () => {
            AccountUpdate.createSigned(sender).send({to: receiver, amount: 0.1 * 1e9})
        })
        await tx.sign()
        await tx.send()
        // await sendTo(sender, receiver)
    }

    sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async sendGraphQL(graphQLEndpoint, query) {
        const controller = new AbortController();
        const timer = setTimeout(() => {
            controller.abort();
        }, 20000); // Default to use 20s as a timeout
        let response;
        try {
            let body = JSON.stringify({ operationName: null, query, variables: {} });
            response = await fetch(graphQLEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
                signal: controller.signal,
            });
            const responseJson = await response.json();
            if (!response.ok || responseJson?.errors) {
                return {
                    kind: 'error',
                    statusCode: response.status,
                    statusText: response.statusText,
                    message: responseJson.errors,
                };
            }
            return responseJson;
        } catch (error) {
            clearTimeout(timer);
            return {
                kind: 'error',
                message: error,
            };
        }
    }

    sendZkAppQuery(acountUpdatesJson) {
        return `
        mutation {
          sendZkapp(input: {
            zkappCommand: ${this.removeJsonQuotes(acountUpdatesJson)}
          }) { zkapp
            {
              id
              hash
              failureReason {
                index
                failures
              }
            }
          }
        }`;
    }

    removeJsonQuotes(json) {
        // source: https://stackoverflow.com/a/65443215
        let cleaned = JSON.stringify(JSON.parse(json), null, 2);
        return cleaned.replace(/^[\t ]*"[^:\n\r]+(?<!\\)":/gm, (match) =>
            match.replace(/"/g, '')
        );
    }


}