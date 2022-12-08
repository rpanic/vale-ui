<script lang="ts">

import type { ApiService, ProposalDto } from '@/zkapp/api-service';
import {QueuedOperation, ZkAppService} from '@/zkapp/zkapp-service';
import {Bool, PrivateKey, PublicKey, Signature, UInt64} from 'snarkyjs';
import { defineComponent, inject, PropType } from 'vue';
import ProposalForm from './ProposalForm.vue';
import type { WalletProvider } from '@/zkapp/walletprovider';
import { SimpleObservable } from '@/zkapp/models';
import type { TxSendParams } from './TransactionSendingComponent.vue';
import {DeployedWalletImpl} from "@/zkapp/viewmodel";

export interface SignerStatus {
    address: string,
    vote: boolean | undefined,
    pk: string | null
}

export default defineComponent({

    props: {
        walletData: Object as PropType<DeployedWalletImpl>,
        // proposal: {
        //     type: Object as PropType<ProposalState>
        // }
    },
    components: {
        ProposalForm
    },
    mounted() {
        this.signerStatus = this.walletData!.signers.map((signer, index) => {
            let signature = this.walletData!.alreadySigned.find(y => y.signer === signer)
            let vote = signature ? signature.vote : undefined
            return {
                address: signer,
                vote: vote,
                pk: this.walletData!.pks[index]
            }
        })
        this.k = this.walletData!.k
        this.signaturesQueue = []//this.walletData!.wallet.state?.signatures ?? []
    },
    methods: {
        formatMina(uint: UInt64): number {
            return Number.parseInt(uint.div(10000).toString()) / 100000;
        },
        proposalSet(proposal: ProposalDto) {
            this.proposalDto = proposal;
            this.walletData!.proposal = proposal

            // this.walletData!.wallet.state = {
            //     proposal: proposal,
            //     signatures: [],
            //     votes: [0,0],
            //     wallet: {
            //         k: this.walletData!.wallet.wallet.k,
            //         signers: this.walletData!.wallet.wallet.signers,
            //     }
            // }
        },
        sign(vote: boolean, signer: string) {

            let signerIndex = this.walletData!.signers.indexOf(signer)
            this.signingInProgress = signerIndex

            let pubKey = PublicKey.fromBase58(signer)
            
            if(signerIndex >= 0){

                let pkStr = this.walletData!.pks[signerIndex]

                let signaturePromise: Promise<Signature> | undefined = undefined

                if(pkStr !== null && pkStr !== undefined && pkStr.length > 0){

                    let pk = PrivateKey.fromBase58(pkStr)

                    console.log(this.signaturesQueue);
                    console.log()

                    let signature = Signature.create(pk, this.walletData!.getSignatureData(Bool(vote)))

                    signaturePromise = new Promise((res) => {
                        res(signature)
                    })

                }else{

                    // signaturePromise = new Promise<Signature>((res, rej) => {
                    //     this.wallet.accounts().then(accounts => {
                    //         if(accounts.length > 0 && accounts[0].equals(pubKey)){
                    //
                    //
                    //             // let signature = this.wallet.signMessage()
                    //
                    //         }else{
                    //             rej()
                    //         }
                    //     })
                    // })
                    //TODO
                    console.log("Signing with aurowallet: TODO")

                }

                console.log("Signature created")

                signaturePromise?.then(signature => {

                    this.service!.signProposal(pubKey, signature, vote, this.walletData!).then(signature => {

                        this.signaturesQueue.push(signature)

                        let proposal = this.walletData!.proposal
                        if (proposal !== undefined) {
                            let signerStatus = this.signerStatus.find(x => x.address === signer)
                            signerStatus!.vote = vote

                            //Send to api
                            // let apiSignature = this.api!.generateApiSignature(proposal, pk)
                            //
                            // this.api!.pushSignature(this.walletData!.wallet.wallet, proposal, signature, apiSignature).then(x => console.log("Signature pushed to Api:", x))

                        }
                        this.signingInProgress = -1

                    }).catch(err => {
                        console.error(err)
                        this.signingInProgress = -1
                    })

                })


            }else {
                console.error("asdsad")
            }

        },
        submitToChain() {

            this.wallet?.accounts().then(account => {

                // let proof = this.signaturesQueue[this.signaturesQueue.length - 1]
                // let promise = this.service!.rollup(MultiSigProof.fromJSON(proof.proof), this.walletData!.wallet, new StorageService().getDeployerAccount(), this.wallet)

                let first = this.signaturesQueue[0]!
                let promise = this.service!.rollup(first, this.walletData!, this.wallet)

                this.txSendObservable!.next({method: promise})

                promise.then(r => {
                    let s = this.signaturesQueue.pop()!

                    this.walletData!.simulateApproval(s.signer, s.vote.toBoolean(), false, true)
                    this.walletData!.save()

                })

            })

        },
        getSignaturesLeftForApproval() : number {
            return this.signerStatus.filter(x => x.vote === true).length
        }
    },
    data() {
        return {
            selectedValue: null,
            amount: 0.0,
            signingInProgress: -1,
            submitInProgress: false,
            signaturesQueue: [] as QueuedOperation[],
            service: inject<ZkAppService>("service"),
            proposalDto: this.walletData?.proposal, // TODO Check if that works
            api: inject<ApiService>("api"),
            signerStatus: [] as SignerStatus[],
            k: 100,
            wallet: inject<WalletProvider>("wallet")!,
            txSendObservable: inject<SimpleObservable<TxSendParams>>("txSendObservable")
        };
    }
})

</script>

<template>

    <div class="row mt-3 ms-0">
        <div class="card">
            <div class="card-body">
                <ProposalForm :proposal="proposalDto" :balance="walletData?.balanceWrapper()" @proposal-set="proposalSet"></ProposalForm>

            </div>
        </div>

        <div class="card mt-3" v-if="proposalDto !== undefined">
            <div class="card-body">

                <h5 class="mt-2 mb-3">Signatures</h5>

                <div class="w-100 tableborder"></div>

                <div class="tableborder py-2" v-if="proposalDto" v-for="(signer, index) in signerStatus">

                    <div class="row align-items-center" style="justify-content: space-between">

                        <div class="col-6">
                            <font-awesome-icon icon="fa-solid fa-check" class="text-success" v-if="signer.vote === true"></font-awesome-icon>
                            <font-awesome-icon icon="fa-solid fa-xmark" class="text-danger" v-if="signer.vote === false"></font-awesome-icon>
                            {{ signer.address }}
                        </div>

                        <div class="col-3">
                            <div class="btn btn-outline-success" v-if="signer.vote === true">Accepted</div>
                            <div class="btn btn-outline-danger" v-if="signer.vote === false">Declined</div>
                            <div class="btn btn-outline-secondary" v-if="signer.vote === undefined && signer.pk === null">Pending</div>
                            <div class="btn btn-outline-warning" v-if="signer.vote === undefined && signer.pk !== null">Pending, Key available</div>
                        </div>

                        <div class="col-3 d-flex">
                            <template v-if="signer.vote === undefined && signingInProgress !== index">
                                <button class="btn btn-primary ms-auto" type="button" @click="sign(true, signer.address)" :disabled="signingInProgress >= 0">Sign</button>
                                <button class="btn btn-danger ms-2" type="button" @click="sign(false, signer.address)" :disabled="signingInProgress >= 0">Decline</button>
                            </template>
                            <button class="btn btn-primary ms-auto" type="button" v-if="signingInProgress === index">
                                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                Creating proof...
                            </button>
                            <div style="width: 110px;" v-if="signer.vote !== undefined"></div>
                        </div>
                    </div>

                </div>

                <div class="h6 mt-3 mb-2 "> <!--d-flex justify-content-center-->
                    <div class="me-auto mt-1">{{ getSignaturesLeftForApproval() }} of {{ walletData?.signers.length }} signatures left</div>
                    <button class="btn btn-success mt-3" v-if="signaturesQueue.length >= 1" @click="submitToChain()">
                        Submit 1 signature to chain
                    </button>
                </div>

            </div>
        </div>
    </div>

</template>

<style scoped>

input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}
input[type="number"] {
    -moz-appearance: textfield;
}

.tableborder{
    border-bottom: 1px solid var(--bs-card-border-color);
}

</style>