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
import {tic, toc} from 'tictoc'
import { ProposalState} from "vale-core/build/src/multisigv2";
import {DeployedWalletImpl} from "@/zkapp/viewmodel";
import {Networkprovider} from "@/zkapp/networkprovider";
import {WorkerClient} from "@/zkapp/workerclient";
import {RollupArgs, ValeDeployArgs} from "@/zkapp/worker2";
import {Config} from "@/zkapp/config";

export interface TxSendResults {
    txhash: string
    wallet?: string
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

    isReady2: Promise<any>
    res: (value: any) => void = () => {}

    public apiService = new ApiService()

    programCompiled = false

    graphql: GraphQlService;

    constructor(graphql: GraphQlService){
        this.initWindow()
        
        this.isReady2 = new Promise((res) => {
            this.res = res
        })
        this.graphql = graphql
    }

    initWindow(){
        (window as any).service = this;
        (window as any).PrivateKey = PrivateKey;
        (window as any).PublicKey = PublicKey;
        (window as any).graphql = this.graphql;
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

            this.workerInstance.init().then(x => {
                console.log("Worker ready")
            })

        })

    }

    async signData(key: PrivateKey, data: Field[]){
        let d = await this.workerInstance.sign({pk: key.toBase58(), data: data.map(x => x.toString())})
        return Signature.fromJSON(d)
    }

    workerInstance = new WorkerClient()

    async signProposal(key: PublicKey, signature: Signature, vote: boolean, wallet: DeployedWalletImpl) : Promise<QueuedOperation>{

        (window as any).state = {key, vote, wallet}

        if(!this.programCompiled){
            // Not needed anymore since we don´t use recursion anymore
            // await this.worker({operation: "compile", params: {}}, "compile_ret")
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

        await this.workerInstance.initProveMethod({
            proofWithSignature: wallet.proofBySignature,
            zkAppPk: wallet.contractPk
        })

        let serializeWitness = (w: MerkleMapWitness) => {
            return {
                isLefts: w.isLefts.map(x => x.toBoolean()),
                siblings: w.siblings.map(x => x.toString())
            }
        }

        let rollupArgs: RollupArgs = {
            signer: op.signer.toBase58(),
            proposalState: ProposalState.toJSON(op.proposalState),
            vote: op.vote.toBoolean(),
            signerWitness: serializeWitness(op.signerWitness),
            proposalWitness: serializeWitness(op.proposalWitness),
            signature: Signature.toJSON(op.signature),
            walletAddress: wallet.address,
            receiver: wallet.proposal!.receiver,
        }

        console.log(rollupArgs)

        let json = await this.workerInstance.rollup(rollupArgs)
        let hash = await walletProvider.sendTransaction(json)

        return {
            txhash: hash,
            wallet: wallet.address
        }

    }

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
            let pending = await this.graphql.getPendingTransaction(deploymentTx)
            console.log("Pending: ", pending)
            return {
                address: address,
                network: "Berkeley",
                balance: 0n,
                live: false,
                deploymentPending: pending.pending
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
            proofWithSignature: contract.proofBySignature,
            zkAppPk: contractpk.toBase58()
        }
        await this.workerInstance.initProveMethod(proveMethod)

        console.log(contractpk.toBase58())

        await this.workerInstance.compile()
        this.programCompiled = true

        let pubKey = contractpk.toPublicKey()
        // pubKey = PublicKey.fromBase58("B62qqsc4Msf91dG4B9oWTphuQJ2TaGT5se7NVJEKcKfLbFkwEGCJSEb")

        let signerMap = contract.getSignerMerkleMap()
        let stateMap = contract.getStateMerkleMap()

        console.log("Creating transaction")

        let auroDeployer = (await walletProvider.accounts())[0]?.toBase58()

        let workerPayload: ValeDeployArgs = {
            signerRoot: signerMap.getRoot().toString(),
            stateRoot: stateMap.getRoot().toString(),
            signersLength: contract.signers.length,
            k: contract.k,
            deployer: deployer.toBase58(),
            auroDeployer
        }

        let txHash = await this.workerInstance.deployContract(workerPayload)

        //TODO Aurowallet doesn´t sign the first accountupdate...
        // let txJson = txObj.tx
        // let hash2 = await walletProvider.sendTransaction(txJson)

        // let tx = Types.ZkappCommand.fromJSON(txJson)

        // let txJson = txHash
        // let res = await this.sendGraphQL(Config.GRAPHQL_URL, this.sendZkAppQuery(txJson))

        // console.log("REs")
        // console.log(res)

        return {
            txhash: txHash,
            // txhash: hash2,
            address: pubKey,
            wallet: contract.address
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