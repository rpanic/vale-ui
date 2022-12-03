<script lang="ts">

import type { ApiService, ProposalDto, SignatureProof } from '@/zkapp/api-service';
import { ZkAppService } from '@/zkapp/zkapp-service';
import { PrivateKey, PublicKey, UInt64 } from 'snarkyjs';
import { defineComponent, inject, type PropType } from 'vue';
import type { DashboardDTO } from './WalletDashboard.vue';
import ProposalForm from './ProposalForm.vue';
import type { WalletProvider } from '@/zkapp/walletprovider';
import { MultiSigProof } from 'vanir-contracts/build/src/multisig-recursive';
import { SimpleObservable } from '@/zkapp/models';
import type { TxSendParams } from './TransactionSendingComponent.vue';
import { StorageService } from '@/zkapp/storage-service';


export interface SignerStatus {
    address: string,
    vote: boolean | undefined,
    pk: string
}

export default defineComponent({

    props: {
        walletData: Object as PropType<DashboardDTO>,
        // proposal: {
        //     type: Object as PropType<ProposalState>
        // }
    },
    components: {
        ProposalForm
    },
    mounted() {
        this.signerStatus = this.walletData!.walletData.signers.map((signer, index) => {
            let vote: boolean | undefined = undefined
            let state = this.walletData!.wallet.state
            if(state !== undefined){
                let signature = state.signatures.find(y => y.address.toBase58() === signer)
                vote = signature ? signature.vote : undefined
            }
            return {
                address: signer,
                vote: vote,
                pk: this.walletData!.walletData.pks[index]
            }
        })
        this.k = this.walletData!.wallet.wallet.k
        this.signaturesQueue = this.walletData!.wallet.state?.signatures ?? []
    },
    methods: {
        formatMina(uint: UInt64): number {
            return Number.parseInt(uint.div(10000).toString()) / 100000;
        },
        proposalSet(proposal: ProposalDto) {
            this.proposalDto = proposal;
            this.walletData!.wallet.state = {
                proposal: proposal,
                signatures: [],
                votes: [0,0],
                wallet: {
                    k: this.walletData!.wallet.wallet.k,
                    signers: this.walletData!.wallet.wallet.signers,
                }
            }
        },
        sign(vote: boolean, signer: string) {

            let signerIndex = this.walletData!.walletData.signers.indexOf(signer)
            this.signingInProgress = signerIndex
            
            if(signerIndex >= 0){

                let pkStr = this.walletData!.walletData.pks[signerIndex]

                if(pkStr !== undefined && pkStr.length > 0){

                    let pk = PrivateKey.fromBase58(pkStr)

                    console.log(this.signaturesQueue);
                    console.log()

                    let sig = this.signaturesQueue[this.signaturesQueue.length - 1] 
                    this.service!.signProposal(pk, vote, this.walletData!.wallet, sig).then(signature => {

                        console.log("proof result: ", signature.proof.proof)

                        this.signaturesQueue.push(signature)
                        
                        let proposal = this.walletData!.wallet.state?.proposal
                        if(proposal !== undefined){
                            let signerStatus = this.signerStatus.find(x => x.address === signer)
                            signerStatus!.vote = vote

                            //Send to api
                            let apiSignature = this.api!.generateApiSignature(proposal, pk)

                            this.api!.pushSignature(this.walletData!.wallet.wallet, proposal, signature, apiSignature).then(x => console.log("Signature pushed to Api:", x))

                            this.walletData!.wallet.state!.signatures.push(signature)
                            
                        }
                        this.signingInProgress = -1

                    }).catch(err => {
                        console.error(err)
                        this.signingInProgress = -1
                    })

                }


            }else {
                console.error("asdsad")
            }


        },
        submitToChain() {

            this.wallet?.accounts().then(account => {

                let proof = this.signaturesQueue[this.signaturesQueue.length - 1]
                let promise = this.service!.rollup(MultiSigProof.fromJSON(proof.proof), this.walletData!.wallet, new StorageService().getDeployerAccount(), this.wallet)

                this.txSendObservable!.next({method: promise})

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
            signaturesQueue: [] as SignatureProof[],
            service: inject<ZkAppService>("service"),
            proposalDto: this.walletData?.wallet?.state?.proposal, // TODO Check if that works
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
                <ProposalForm :proposal="proposalDto" :balance="walletData?.walletData.balance" @proposal-set="proposalSet"></ProposalForm>

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
                            <div class="btn btn-outline-secondary" v-if="signer.vote === undefined && signer.pk.length === 0">Pending</div>
                            <div class="btn btn-outline-warning" v-if="signer.vote === undefined && signer.pk.length > 0">Pending, Key available</div>
                        </div>

                        <div class="col-3 d-flex">
                            <template v-if="signer.vote === undefined && signingInProgress !== index">
                                <button class="btn btn-primary ms-auto" type="button" @click="sign(true, signer.address)" :disabled="signingInProgress >= 0">Sign</button>
                                <button class="btn btn-danger ms-2" type="button" @click="sign(false, signer.address)" :disabled="signingInProgress >= 0">Decline</button>
                            </template>
                            <button class="btn btn-primary ms-auto" type="button" v-if="signingInProgress === index">
                                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                Calculating proof...
                            </button>
                            <div style="width: 110px;" v-if="signer.vote !== undefined"></div>
                        </div>
                    </div>

                </div>

                <div class="h6 mt-3 mb-2 "> <!--d-flex justify-content-center-->
                    <div class="me-auto mt-1">{{ getSignaturesLeftForApproval() }} of {{ walletData?.wallet.wallet.signers.length }} signatures left</div>
                    <button class="btn btn-success mt-3" v-if="signaturesQueue.length >= k" @click="submitToChain()">
                        Submit to chain
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