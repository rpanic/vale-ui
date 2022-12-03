import { Account, AccountUpdate, Bool, Circuit, Experimental, fetchAccount, Field, isReady, Mina, Poseidon, PrivateKey, Proof, PublicKey, SelfProof, setGraphqlEndpoint, Sign, Signature, UInt64, Permissions } from "snarkyjs"
import { MultiSigContract } from "vale-core";
import { ApiService, type DeployedWalletState, type JsonProof, type ProposalDto, type SignatureProof} from "./api-service";
import { GraphQlService } from "./graphql";
import { StorageService } from "./storage-service";
import type { WalletProvider } from "./walletprovider";
import "./worker"
import {tic, toc} from 'tictoc'
import {Proposal} from "vale-core/build/src/multisigv2";

export interface TxSendResults {
    txhash: string
}

export interface DeployResults extends TxSendResults {
    address: PublicKey
}

export interface WalletAccountData {
    address: string
    network: string
    balance: UInt64,
    live: boolean,
    deploymentPending: boolean
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

    static local = false

    connected: Boolean = false
    // MultiSigZkApp: any

    isReady2: Promise<any>
    res: (value: any) => void = () => {}

    public apiService = new ApiService()

    programCompiled = false

    graphqlEndpoint = 'https://proxy.berkeley.minaexplorer.com/graphql';

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
        (window as any).graphql = new GraphQlService()
    }

    init(){
        isReady.then(async x => {

            if(!ZkAppService.local){

                // create Berkeley connection
                // const graphqlEndpoint = 'https://berkeley.peak-pool.com/graphql';
                setGraphqlEndpoint(this.graphqlEndpoint);
                let Berkeley = Mina.BerkeleyQANet(this.graphqlEndpoint);
                Mina.setActiveInstance(Berkeley);

                //TODO Remove
                new StorageService().setTempDeployerAccount(PrivateKey.fromBase58("EKEtJGswMGySVaKpz3ydTjt3jGEPeJLQCqw8PEAFRDbbQ2GCz45W"))

                this.connected = true
                this.res({})

            }else{

                let mock = Mina.LocalBlockchain()
                Mina.setActiveInstance(mock);

                let pk = mock.testAccounts[0].privateKey
                new StorageService().setTempDeployerAccount(pk)

                this.connected = true
                this.res({})
            }
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

    worker(request: any, resOp: string) : Promise<any>{
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

    async signProposal(key: PrivateKey, vote: boolean, wallet: DeployedWalletState, previousProof: SignatureProof | undefined = undefined) : Promise<SignatureProof>{

        (window as any).state = {key, vote, wallet}

        if(!this.programCompiled){
            await this.worker({operation: "compile", params: {}}, "compile_ret")
            this.programCompiled = true
        }

        console.log(key.toPublicKey().toBase58(), vote)

        let proposal = new Proposal(wallet.state!.proposal.receiver, UInt64.from(wallet.state!.proposal.amount.toString()))
        let signerList = SignerList.constructFromSigners(wallet.wallet.signers.map(x => PublicKey.fromBase58(x)))

        console.log(proposal.receiver.toBase58(), proposal.amount.toString())
        console.log(wallet.wallet.signers)

        let multiSigProof: MultiSigProof | undefined = undefined
        if(previousProof){
            multiSigProof = MultiSigProof.fromJSON(previousProof!.proof)
        }

        console.log(multiSigProof?.publicInput.proposalsHash.toString())
        console.log(multiSigProof?.publicInput.startProposalsHash.toString())

        let votes = [wallet.state!.votes[0], wallet.state!.votes[1]]
        console.log("votes:", votes)
        console.log("signerList:", signerList.signers.map(x => x.toBase58()))

        let alreadySigned = wallet.state!.signatures.map(x => x.address.toBase58())

        let proofParams = {
            proposal: [proposal.receiver.toBase58(), proposal.amount.toString()],
            votes: wallet.state!.votes,
            vote: vote,
            key: key.toBase58(),
            signerList: wallet.wallet.signers,
            alreadySigned,
            multiSigProof: multiSigProof?.toJSON()
        }

        let proofRes = await this.worker({operation: "prove", params: proofParams}, "prove_ret")

        let proof = MultiSigProof.fromJSON(proofRes)

        console.log("prove received")
        
        return {
            address: key.toPublicKey(),
            proof: proof.toJSON(), //""" as any as JsonProof,//
            vote: vote
        }

    }

    async rollup(proof: MultiSigProof, wallet: DeployedWalletState, account: PrivateKey, walletProvider: WalletProvider) : Promise<TxSendResults>{

        let votes = [0, 0]
        wallet.state?.signatures.map(x => x.vote).forEach(a => votes[a ? 0 : 1]++)
        let alreadySigned = wallet.state!.signatures.map(x => x.address.toBase58())

        let params = {
            alreadySigned,
            feePayer: account.toBase58(),
            proof: proof.toJSON(),
            proposal: {
                receiver: wallet.state!.proposal.receiver.toBase58(),
                amount: wallet.state!.proposal.amount.toString()
            },
            signers: wallet.wallet.signers,
            walletAddress: wallet.wallet.address,
            votes: {
                before: [0, 0],
                after: votes
            }
        } as RollupWorkerParams

        console.log("Compiling Smartcontract & Program...")
        await this.worker({operation: "compileContract", params: {}}, "compileContract_ret")

        let txJson = await this.worker({operation: "proveContract", params: params}, "proveContract_ret")
        let txAny = JSON.parse(txJson)

        console.log("Tx received from worker")

        if(txAny.success === false){
            throw txAny.error
        }else{
            let query = this.sendZkAppQuery(txJson)
            let ret = await this.sendGraphQL(this.graphqlEndpoint, query)

            console.log(ret)
            let hash = ret.data.sendZkapp.zkapp.hash
            return {
                txhash: hash
            }
        }

    }

    async rollup_old(proof: MultiSigProof, wallet: DeployedWalletState, account: PrivateKey, walletProvider: WalletProvider) : Promise<TxSendResults>{

        let zkAppAddress = PublicKey.fromBase58(wallet.wallet.address)

        let proposal = new Proposal(wallet.state!.proposal.receiver, Field.fromString(wallet.state!.proposal.amount.toString()))
        let signerList = SignerList.constructFromSigners(wallet.wallet.signers.map(x => PublicKey.fromBase58(x)))
        let state1 = new ProposalState(proposal, [Field.zero, Field.zero], signerList)

        let votes = [0, 0]
        wallet.state?.signatures.map(x => x.vote).forEach(a =>  votes[a ? 0 : 1]++)
        let alreadySigned = wallet.state!.signatures.map(x => x.address)

        let state2 = new ProposalState(proposal, votes.map(x => Field.fromNumber(x)), signerList.cloneWithout(...alreadySigned))

        console.log(state1.hash().toString())
        console.log(state2.hash().toString())

        console.log(proof.publicInput.startProposalsHash.toString())
        console.log(proof.publicInput.proposalsHash.toString())

        console.log("Compiling Smartcontract & Program...")
        tic()

        MultiSigZkProgram.compile()
        MultiSigZkApp.compile()

        toc()

        let tx = await Mina.transaction({feePayerKey: account, fee: 0.01 * 1e9}, () => {
            let zkApp = new MultiSigZkApp(zkAppAddress);
    
            zkApp.approveWithProof(proof, state2, state1)
    
            // zkApp.sign(zkAppPrivateKey);
        });
        try {
            await tx.prove()
            tx.sign()

            let json = tx.toJSON()
            console.log(json)

            let hash = await tx.send().hash()
            // let res = await walletProvider.sendTransaction(json)

            return { txhash: hash }
        } catch (err) {
            console.log(err)
            throw err
        }

    }

    async getWalletData(address: string, deploymentTx: string) : Promise<WalletAccountData | undefined>{

        await this.isReady2

        console.log("asd")

        if(ZkAppService.local){
            return {
                address: address,
                network: "Berkeley",
                balance: UInt64.fromNumber(0.1 * 1e9),
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
                balance: account.account.balance,
                live,
                deploymentPending: false
            }
        } else {

            //Check deployment tx
            let pending = await new GraphQlService().getPendingTransaction(deploymentTx)
            return {
                address: address,
                network: "Berkeley",
                balance: UInt64.zero,
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
        signers: PublicKey[],
        k: number,
        walletProvider: WalletProvider
    ) : Promise<DeployResults>{

        console.log("Deploying new zkapp")

        let pk = PrivateKey.random()
        // pk = PrivateKey.fromBase58("EKDvDvuP9bq9jVGABp1oTbYyA3NKaNiqYkiWerui6CHiAxpdmETv")
        let second = false

        console.log(pk.toBase58())

        console.log("Compiling App...")
        // let vk = await this.worker({operation: "compileContract", params: {}}, "compileContract_ret")
        await MultiSigZkProgram.compile()
        let vk = (await MultiSigRecApp.compile()).verificationKey

        let pubKey = pk.toPublicKey()
        pubKey = PublicKey.fromBase58("B62qqsc4Msf91dG4B9oWTphuQJ2TaGT5se7NVJEKcKfLbFkwEGCJSEb")

        let signerList = SignerList.constructFromSigners(signers)

        console.log(vk)

        console.log("Creating transaction")

        let workerPayload = {
            signers: signers.map(x => x.toBase58()),
            deployer: deployer.toBase58(),

        }

        // if(second === true){
        //     let tx = await Mina.transaction(
        //     { feePayerKey: deployer, fee: UInt64.fromNumber(0.01 * 1e9) },
        //     () => {
        //         let zkapp = new MultiSigRecApp(pubKey);
        //         zkapp.init(signerList, Field.fromNumber(signers.length), Field.fromNumber(k))
        //     })
        //     tx.sign()
        //     await tx.prove()
        //     console.log(tx.toJSON())
        //     let id = tx.send()
        //     return {
        //         txhash: (await id.hash()),
        //         address: pk.toPublicKey()
        //     }
        // }

        let hash2
        if(false){
            //TODO In Worker
            let tx = await Mina.transaction(
                { feePayerKey: deployer, fee: UInt64.fromNumber(0.01 * 1e9) },
                () => {
                    let zkapp = new MultiSigRecApp(pubKey);
                    zkapp.deploy({ verificationKey: vk });
                    zkapp.setPermissions({
                        ...Permissions.default(),
                        editState: Permissions.proof(),
                        send: Permissions.proof()
                    });
                    // zkapp.sign()
                    AccountUpdate.fundNewAccount(deployer)

                    // zkapp.self.body.preconditions.account.nonce.isSome = Bool(false);
                    // zkapp.self.body.incrementNonce = Bool(false);
                    // zkapp.self.body.useFullCommitment = Bool(true);

                    // zkapp.init(signerList, Field.fromNumber(signers.length), Field.fromNumber(k))
                }
            );
            
            tx.sign() //[pk]
            await tx.prove()
            let json = tx.toJSON();
            console.log(json);
            (window as any).json = json

            // let hash = await walletProvider.sendTransaction(json)
            let query = this.sendZkAppQuery(json)
            let ret = await this.sendGraphQL(this.graphqlEndpoint, query)

            console.log(ret)
            let hash = ret.data.sendZkapp.zkapp.hash
            hash2 = hash
        }

        console.log("tx2")

        let tx2 = await Mina.transaction(
            { feePayerKey: deployer, fee: UInt64.fromNumber(0.01 * 1e9) },
            () => {
                let zkapp = new MultiSigRecApp(pubKey);
                zkapp.init(signerList, Field.fromNumber(signers.length), Field.fromNumber(k))

                // zkapp.self.body.preconditions.account.nonce.isSome = Bool(false);
                // zkapp.self.body.incrementNonce = Bool(false);
                // zkapp.self.body.useFullCommitment = Bool(true);
            })

        tx2.sign()
        await tx2.prove()
        console.log(tx2.toJSON())
        hash2 = await tx2.send().hash()
        console.log(hash2)

        return {
            txhash: hash2,
            address: pk.toPublicKey()
        }
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

    async sendMina(
        sender: PrivateKey,
        receiver: PublicKey
    ){
        let tx = await Mina.transaction({feePayerKey: sender, fee: 0.01 * 1e9}, () => {
            AccountUpdate.createSigned(sender).send({to: receiver, amount: 0.1 * 1e9})
        })
        await tx.sign()
        await tx.send().wait()
        // await sendTo(sender, receiver)
    }

    sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    

}