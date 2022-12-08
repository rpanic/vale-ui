<script lang="ts">

import type { UIWalletAccountData } from '@/views/WalletsView.vue';
import { ApiService, DeployedWalletState, SignatureProof } from '@/zkapp/api-service';
import { Config } from '@/zkapp/config';
import { roundNumber } from '@/zkapp/utils';
import type { WalletProvider } from '@/zkapp/walletprovider';
import {Field, UInt64} from 'snarkyjs';
import { defineComponent, inject, PropType } from 'vue';
import AssetOption from './AssetOption.vue';
import TxListComponent from './TxListComponent.vue';
import {DeployedWalletImpl} from "@/zkapp/viewmodel";
import {SimpleObservable} from "@/zkapp/models";
import {TxSendParams} from "@/components/TransactionSendingComponent.vue";
import {TxSendResults} from "@/zkapp/zkapp-service";

// export interface DashboardDTO{
//     walletData: UIWalletAccountData,
//     wallet: DeployedWalletState
// }

export default defineComponent({

    props: {
        wallet: Object as PropType<DeployedWalletImpl>
    },
    components: {
    AssetOption,
    TxListComponent
},
    methods: {
        formatMina(uint: bigint | string): number {
            if(typeof uint === "string"){
                uint = Field(uint).toBigInt()
            }
            return Number.parseInt((uint / 10000n).toString()) / 100000;
        },
        depositMina() {
            if(this.depositSwitch === 1){
                let promise = this.walletProvider!.sendPayment(this.depositValue, this.wallet!.address)

                this.txSendObservable!.next({
                    method: new Promise<TxSendResults>((res, rej) => {
                        promise
                            .then(txhash => res({ txhash }))
                            .catch(err => {console.log("1", err); rej(err)})
                    })
                })

                this.depositSwitch = 0
            }else{
                this.depositSwitch = 1
            }
        }
    },
    emits: {
        newTransactionClicked(){
            return true
        }
    },
    mounted() {
        this.api!.getMinaPriceUsd().then(x => this.price = x)
    },
    data() {
        return {
            selectedValue: null,
            signingInProgress: false,
            signaturesToBroadcast: [] as SignatureProof[],
            linkBaseAddress: Config.EXPLORER_BASE_ADDRESS,
            api: inject<ApiService>("api"),
            walletProvider: inject<WalletProvider>("wallet"),
            txSendObservable: inject<SimpleObservable<TxSendParams>>("txSendObservable"),
            price: 0,
            depositSwitch: 0,
            depositValue: 0,
            roundNumber: roundNumber
        };
    }
})

</script>

<template>

    <div class="row">
        <h3>Your wallet</h3>
        <div class="col-12">
            <div class="card mt-3 p-3">
                <div class="card-body" v-if="wallet !== undefined">

                    <img :src="wallet.blockie()" class="circle" height="50"/>
                    <h5 class="mt-2">{{wallet.name}}</h5>

                    <p class="mt-2">{{wallet.address}} <a class="ms-1" :href="linkBaseAddress + wallet.address" target="_blank"><font-awesome-icon icon="fa-solid fa-external-link-alt"></font-awesome-icon></a></p>

                </div>
            </div>
        </div>

        <div class="col-6">
            <div class="card mt-3 p-3">
                <div class="card-body">

                    <h5>Assets</h5>

                    <div class="d-flex assetRow align-items-strech" style="justify-content: space-between;" v-if="wallet !== undefined" >

                        <div class="d-flex align-items-center">
                            <img src="src/assets/Mina2.png" height="20" style="border-radius: 5px;"/>
                            <div class="h6 d-inline m-0 ms-2">{{ formatMina(wallet.balance) }} MINA </div>
                            <div class="h6 d-inline m-0 ms-2">{{ roundNumber(formatMina(wallet.balance) * price, 2) }}$ </div>
                        </div>
                        <button class="btn btn-success ms-3" @click="depositMina()" v-if="depositSwitch === 0">
                            <font-awesome-icon icon="fa-solid fa-arrow-right-from-bracket"></font-awesome-icon>
                            Deposit
                        </button>

                        <div v-if="depositSwitch === 1" class="d-flex">
                            <a @click="depositSwitch = 0" href="javascript:void(0)" class="d-flex">
                                <font-awesome-icon icon="fa-solid fa-xmark" class="me-2 text-muted align-self-center"></font-awesome-icon>
                            </a>

                            <input class="form-control d-inline-block" style="width: 100px" type="number" min="0" v-model="depositValue"/>
                            <button class="btn btn-success ms-3" @click="depositMina()">
                                <font-awesome-icon icon="fa-solid fa-arrow-right-from-bracket"></font-awesome-icon>
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
        
        <div class="col-6">
            <div class="card mt-3 p-3">
                <div class="card-body">

                    <h5 v-if="wallet !== undefined && wallet.proposal === undefined">Pending Transaction</h5>
                    <h5 v-else-if="wallet !== undefined">Pending Transaction</h5>

                    <button class="btn btn-success" @click="$emit('newTransactionClicked')" v-if="wallet !== undefined && wallet.proposal === undefined">
                        <font-awesome-icon icon="fa-solid fa-plus" class="me-1"></font-awesome-icon>
                         Send new transaction

                    </button>

                    <div v-if="wallet !== undefined && wallet.proposal !== undefined" class="border-card py-3 px-3 d-flex flex-row align-items-center" style="justify-content: space-between;">

                        <div style="width: fit-content;">
                            <h6>{{wallet.votes[0]}} from {{wallet.k}} signed</h6>
                            <h5 class="d-flex align-items-center mb-0">{{ formatMina(wallet.proposal.amount) }} <img src="src/assets/Mina2.png" height="22" style="border-radius: 5px;" class="ms-1"/></h5>
                        </div>
                        <div style="width: fit-content;">
                            <button @click="$emit('newTransactionClicked')" to="/create" class="btn btn-success">
                                Continue
                                <font-awesome-icon icon="fa-solid fa-chevron-right"></font-awesome-icon>
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>
    
    <!-- <div class="row">
        <div class="col-12">
            <div class="card mt-3 p-3">
                <div class="card-body">

                    <h5 class="mb-3">Signers</h5>

                    <div class="h6" v-if="wallet !== undefined" v-for="signer in wallet.wallet.wallet.signers">{{signer}}</div>

                </div>
            </div>
        </div>
    </div> -->
    
    <div class="row">
        <div class="col-12">
            <TxListComponent :wallet-data="wallet"></TxListComponent>
        </div>
    </div>

</template>

<style scoped>
.border-card {
    border: 1px solid #ced4da;
    border-radius: 0.375rem;
}
</style>