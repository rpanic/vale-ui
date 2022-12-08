<script lang="ts">
import SignerRow, { NewKeyPayload } from '../components/SignerRow.vue'
import FormRow from '../components/FormRow.vue'
import ContinueButtonRow from '../components/ContinueButtonRow.vue'

import { PrivateKey, PublicKey } from 'snarkyjs'
import { defineComponent, inject, PropType } from 'vue';
import { ZkAppService } from '@/zkapp/zkapp-service';
import { StorageService, DeployedWallet } from '@/zkapp/storage-service';
import GenericModal from '@/components/GenericModal.vue';
import { SimpleObservable } from '@/zkapp/models';
import TransactionSendingComponent, { TxSendParams } from '@/components/TransactionSendingComponent.vue';
import { concatStringMiddle } from '@/zkapp/utils';
import type { WalletProvider } from '@/zkapp/walletprovider';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import {DeployedWalletData, ViewModel} from "@/zkapp/viewmodel";

export interface PKList{
    list: ({ pub: PublicKey, pk: PrivateKey | undefined } | undefined)[]
}

export default defineComponent({

    // props: {
    //     name: String
    // },

    data() {
        return {
            pks: { list: [undefined] } as PKList,
            select: 1,
            name: "",
            service: new ZkAppService(),
            storageService: new StorageService(),
            txSendObservable: new SimpleObservable<TxSendParams>(),
            walletProvider: inject<WalletProvider>("wallet"),
            viewModel: inject<ViewModel>("view")
        }
    },

    mounted() {
        setTimeout(() => {
            eval("new bootstrap.Collapse('#collapse1', {toggle: false}).show()")
            eval("new bootstrap.Collapse('#collapse2', {toggle: false}).hide()")
            eval("new bootstrap.Collapse('#collapse3', {toggle: false}).hide()")
        }, 300)
        this.service.init();

        (window as any).PrivateKey = PrivateKey;
        (window as any).PublicKey = PublicKey
    },

    methods: {
        handleNewKey(event: NewKeyPayload) {
            console.log(event)
            let obj = { pub: event.pub, pk: event.pk };
            if(this.pks.list.length > event.index){
                this.pks.list[event.index.valueOf()] = obj
            }else{
                console.error("Error 1235")
            }
        },
        addAddress() {
            this.pks.list.push(undefined)
        },
        concatStringMiddle,
        nextClicked(index: number, back: boolean = false) {
            let nextItem = index + (back ? -1 : 1)
            console.log("emit2", nextItem)
            for(let i = 1 ; i <= 3 ; i++){
                if(i !== nextItem){
                    // eval("$('#collapse" + i + "').collapse('hide')");
                    // document.querySelector()
                    eval("new bootstrap.Collapse('#collapse" + i + "', {toggle: false}).hide()")
                    // ((window as any).$('#collapse1') as any).collapse('hide')
                }
            }
            eval("new bootstrap.Collapse('#collapse" + nextItem + "', {toggle: false}).show()")
        },
        cancelClicked(){
            this.$router.push("/")
        },
        createClicked(){

            let deployer = this.storageService.getDeployerAccount()

            let signerKeys = this.pks.list.map(x => x!.pub)
            let k = this.select

            let pk = PrivateKey.random()

            let wallet: DeployedWallet = {
                contractPk: pk.toBase58(),
                address: pk.toPublicKey().toBase58(),
                accountNew: false,
                deploymentTx: "",
                k: k,
                name: this.name,
                signers: signerKeys.map(x => x.toBase58()),
                alreadySigned: [],
                pks: this.pks.list.map(x => x!.pk !== undefined ? x!.pk.toBase58() : null),
                proposal: undefined,
                votes: [0, 0]
            }

            this.viewModel!.getImplFromDeployedWallet([wallet]).then(impls => {

                let deployOperation = this.service.deploy(deployer, impls[0], this.walletProvider!)

                this.txSendObservable.next({
                    method: deployOperation,
                    onClose: () => {
                        this.$router.push("/wallets").then(() => {})
                    }
                })

                deployOperation.then(result => {

                    this.storageService.pushWallet(wallet)

                })

            })

        }
    },

    components: {
        SignerRow,
        FormRow,
        ContinueButtonRow,
        GenericModal,
        TransactionSendingComponent
    }
});

</script>

<template>

    <div class="d-flex container align-items-center h-100 ">

        <div class="flex-grow-1 mt-5">
            <div class="row mb-5">

            <div class="col-2"></div>
            <div class="col-8">

                <div class="h3 mb-5">Create a new wallet</div>
                
                <FormRow :index="1" heading="Name" show-collapse>
                    <div class="card-body m-3">
                        <h5 class="card-title">Configure wallet</h5>
                        <p class="card-text">Set a name for your wallet.</p>

                        <form class="form">
                            <label for="name">Enter a new name</label>
                            <input type="text" class="form-control mb-2 mt-1 mr-sm-2" style="width: 50%" id="name" placeholder="Wallet 1" v-model="name">
                        </form>
                    </div>

                    <ContinueButtonRow @next-clicked="nextClicked(1)" @back-clicked="cancelClicked" back-text="Cancel"/>
                </FormRow>

                <FormRow :index="2" heading="Signers">
                    
                    <div class="card-body m-3">
                        <h5 class="card-title">Add signers</h5>
                        <p class="card-text">Set a name for your wallet2</p>
                        <SignerRow v-for="(value, index) in pks.list" :index="index" @new-key="handleNewKey"></SignerRow>

                        <div class="mt-3">
                            <a href="#" class="text-success" @click="addAddress">+ Add Address</a>
                        </div>

                        <div class="mt-3">
                            <div class="small mb-2">Any transaction requires the confirmation of:</div>
                            <select class="form-select d-inline" style="width: fit-content;" v-model="select">
                                <option v-for="value in pks.list.length" :value="value">{{value}}</option>
                            </select>
                            <div class="d-inline small ms-2">out of {{pks.list.length}} signers</div>
                        </div>
                    </div>
                    <ContinueButtonRow @next-clicked="nextClicked(2)" @back-clicked="nextClicked(2, true)"></ContinueButtonRow>
                </FormRow>

                <FormRow :index="3" heading="Confirmation" title="Confirm creation" description="Check your options, signers and the create the wallet!">

                    <div class="row">

                        <div class="col-8" style="border-right: solid 1px var(--bs-card-border-color);">
                            <div class="card-body m-2 ps-2 pt-2">
                                <p class="card-text pb-3 mb-0 m-1" style="border-bottom: solid 1px var(--bs-card-border-color);">{{pks.list.length}} Signers</p>

                                <template v-for="pk in pks.list">
                                    <div v-if="pk !== undefined" class="py-2 ps-2 text-monospace" style="border-bottom: solid 1px var(--bs-card-border-color);">
                                        {{ pk !== undefined ? concatStringMiddle(pk.pub.toBase58(), 40) : "--" }}
                                        <a :href="'https://berkeley.minaexplorer.com/wallet/' + pk.pub.toBase58()" target="_blank">
                                            <font-awesome-icon icon="fa-solid fa-arrow-up-right-from-square" class="ms-1"/>
                                        </a>
                                    </div>
                                </template>
                            </div>
                            
                        </div>
                        <div class="col-4">
                            <div class="card-body m-2 ps-0 pt-2">
                                <div class="m-1">
                                <p class="card-text pb-1">Details</p>

                                <div class="small">
                                    Name of Safe: 
                                    <div style="font-size: 16px;" class="pt-1">{{ name }}</div>
                                </div>

                                <div class="small mt-3">
                                    Number of signers required to sign any transaction: 
                                    <div style="font-size: 16px;" class="pt-1">
                                        {{ select }} out of {{ pks.list.length }} signers
                                    </div>
                                </div>
                            </div>
                            </div>
                        </div>

                    </div>

                    <div class="" style="border-top: 1px solid var(--bs-card-border-color);">
                        <div class="card-body">
                            <div class="alert alert-info text-center">
                                By confirming, you are creating a wallet on the network Berkeley, consuming 1.10 MINA tokens to pay the transaction fees. 
                            </div>
                            <ContinueButtonRow @back-clicked="nextClicked(3, true)" next-text="Create" @next-clicked="createClicked()"></ContinueButtonRow>
                        </div>
                    </div>
                </FormRow>
                

            </div>
            <div class="col-2">
            </div>

            </div>

        </div>
    </div>

    <TransactionSendingComponent :observable="txSendObservable">
        
    </TransactionSendingComponent>

</template>

<style>
.square {
    width: 24px;
    height: 24px;
    /* display: flex;
    justify-content: center; */
    border-radius: 12px;
}
.square div {
    color: #fff;
    margin: auto;
    width: min-content
}
.line-left {
    margin-left: 12px; 
    border-left: 1px solid #B2B5B2; 
    margin-top: 5px;
}
</style>