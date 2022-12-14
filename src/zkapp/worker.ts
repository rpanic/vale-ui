import {AccountUpdate, fetchAccount, Field, isReady, Mina, PrivateKey, PublicKey, VerificationKey} from "snarkyjs"
import {ProveMethod} from "vale-core/build/src/utils";
import {MultiSigContract} from "vale-core";
import {Networkprovider} from "@/zkapp/networkprovider";

// var window = self;

(self as any).cache = {}

function getProveMethod() : ProveMethod{
    let pm = (self as any).cache["proveMethod"]
    return {
        zkappKey: pm.zkappKey ? PrivateKey.fromBase58(pm.zkappKey) : undefined,
        verificationKey: pm.verificationKey ? VerificationKey.fromJSON(pm.verificationKey) : undefined
    }
}

async function compileProgram(){
    //TODO
    return true
}

isReady.then(_ => {
    new Networkprovider().createNetwork()
})

self.addEventListener("message", async e => {

    console.log(e)
    if(e.data === "init"){

        console.log(e)

        await isReady;

        // let signers = [PrivateKey.random().toPublicKey(), PrivateKey.random().toPublicKey()]
        // let proposal = new Proposal(signers[0], Field(1000))
        // console.log(proposal.hash().toString())
        // let signerList = SignerList.constructFromSigners(signers)
        // console.log(signerList.hash().toString())

        // console.log(PrivateKey.random().toPublicKey().toBase58())

        self.postMessage("haha")

    } else if(typeof(e.data) === "string" && e.data.includes("\"operation\":")) {

        let o = JSON.parse(e.data)
        let op = o.operation

        await isReady

        if(op === "init"){

            ;(self as any).cache["proveMethod"] = o.proveMethod as ProveMethod

            self.postMessage(JSON.stringify({
                operation: "init_ret",
                data: "{}"
            }))

        }else if(op === "prove"){

            let proveParams = o.params
            
            console.log("Proving vote...")
            // tic()

            // let proposal = new Proposal(PublicKey.fromBase58(proveParams.proposal[0]), Field(proveParams.proposal[1]))
            // let signerList = new SignerList((proveParams.signerList as string[]).map(x => PublicKey.fromBase58(x)))
            // let previousProof = proveParams.multiSigProof ? MultiSigProof.fromJSON(proveParams.multiSigProof) : undefined
            // let alreadySigned = proveParams.alreadySigned.map(x => PublicKey.fromBase58(x))
            //
            // let proof = await prove(
            //     proposal,
            //     proveParams.votes,
            //     proveParams.vote,
            //     PrivateKey.fromBase58(proveParams.key),
            //     signerList,
            //     alreadySigned,
            //     previousProof
            // );
            // // toc()
            //
            // self.postMessage(JSON.stringify({
            //     operation: "prove_ret",
            //     data: proof.toJSON()
            // }))

        }else if(op === "compile"){

            if((self as any).cache["compiled_program"] !== true){
                console.log("Compiling....")
                await compileProgram()
            }else{
                console.log("Cached Program Compileoutput")
            }

            (self as any).cache["compiled_program"] = true

            self.postMessage(JSON.stringify({
                operation: "compile_ret",
                data: {success: true}
            }))

        }else if(op === "compileContract"){

            console.log("Compiling Smartcontract...")
            // tic() EKEVyMo3o44UqVYaFaHkRaXFfQDBdZcuf1jzaQ18BcjirBdyRhYt

            if(!getProveMethod().zkappKey) {
                let vk: any
                if (!(self as any).cache.multsig) {

                    if ((self as any).cache["compiled_program"] !== true) {
                        await compileProgram();
                        (self as any).cache["compiled_program"] = true
                    } else {
                        console.log("Cached Program Compileoutput")
                    }

                    if ((self as any).cache["compiled_contract"] !== true) {
                        let app = await MultiSigContract.compile()
                        ;(self as any).cache.multsig = app
                        ;(self as any).cache.compiled_contract = true
                        vk = app.verificationKey
                    } else {
                        console.log("Cached Contract Compileoutput")
                    }
                } else {
                    vk = (self as any).cache.multsig.verificationKey
                }
                getProveMethod().verificationKey = vk
            }

            self.postMessage(JSON.stringify({
                operation: "compileContract_ret",
                data: {success: true, proveMethod: getProveMethod()}
            }))

        }else if(op === "deployContract") {

            let params = o.payload

            let account = PrivateKey.fromBase58(params.deployer)
            let proveMethod = getProveMethod()

            let zkAppInstance = new MultiSigContract(proveMethod.zkappKey!.toPublicKey())
            let signerRoot = Field(params.signerRoot)
            let stateRoot = Field(params.stateRoot)
            let signersLength = Field(params.signersLength)
            let k = Field(params.k)

            console.log("zkapp: " + proveMethod.zkappKey!.toPublicKey().toBase58())
            console.log("deployer: " + account.toPublicKey().toBase58())

            // await fetchAccount({publicKey: account.toPublicKey()})

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
                await tx.prove()
            }
            tx.sign(proveMethod.zkappKey ? [proveMethod.zkappKey] : [])

            let txId = await tx.send()

            // console.log(ret)
            // let hash = ret.data.sendZkapp.zkapp.hash

            // console.log(tx.toJSON())

            self.postMessage(JSON.stringify({
                operation: "deployContract_ret",
                // data: {success: true, tx: tx.toJSON()}
                data: {success: true, txhash: txId.hash()}
            }))


        }else if(op === "proveContract") {

            // let params = o.params as RollupWorkerParams
            //
            // let zkAppAddress = PublicKey.fromBase58(params.walletAddress)
            //
            // let proposal = new Proposal(PublicKey.fromBase58(params.proposal.receiver), Field.fromString(params.proposal.amount))
            // let signerList = SignerList.constructFromSigners(params.signers.map(x => PublicKey.fromBase58(x)))
            // let votes1 = params.votes.before.map(x => Field.fromNumber(x))
            // let state1 = new ProposalState(proposal, votes1, signerList)
            //
            // let alreadySigned = params.alreadySigned.map(x => PublicKey.fromBase58(x))
            //
            // let votes2 = params.votes.before.map(x => Field.fromNumber(x))
            // let state2 = new ProposalState(proposal, votes2, signerList.cloneWithout(...alreadySigned))
            //
            // let proof = MultiSigProof.fromJSON(params.proof)
            // let account = PrivateKey.fromBase58(params.feePayer)
            //
            // console.log(state1.hash().toString())
            // console.log(state2.hash().toString())
            //
            // console.log(proof.publicInput.startProposalsHash.toString())
            // console.log(proof.publicInput.proposalsHash.toString())
            //
            // await fetchAccount(zkAppAddress)
            //
            // let tx = await Mina.transaction({feePayerKey: account, fee: 0.01 * 1e9}, () => {
            //     let zkApp = new MultiSigZkApp(zkAppAddress);
            //
            //     zkApp.approveWithProof(proof, state2, state1)
            //
            //     // zkApp.sign(zkAppPrivateKey);
            // });
            // try {
            //     await tx.prove()
            //     tx.sign()
            //
            //     let json = tx.toJSON()
            //
            //     self.postMessage(JSON.stringify({
            //         operation: "proveContract_ret",
            //         data: json
            //     }))
            // } catch (err) {
            //     console.log(err)
            //     self.postMessage(JSON.stringify({
            //         operation: "proveContract_ret",
            //         data: {error: err, success: false}
            //     }))
            // }

        }

    }

})

