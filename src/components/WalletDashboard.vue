<script lang="ts">

import type { UIWalletAccountData } from '@/views/WalletsView.vue';
import { ApiService, type DeployedWalletState, type SignatureProof } from '@/zkapp/api-service';
import { Config } from '@/zkapp/config';
import { roundNumber } from '@/zkapp/utils';
import type { WalletProvider } from '@/zkapp/walletprovider';
import { UInt64 } from 'snarkyjs';
import { defineComponent, inject, type PropType } from 'vue';
import AssetOption from './AssetOption.vue';
import TxListComponent from './TxListComponent.vue';

export interface DashboardDTO{
    walletData: UIWalletAccountData,
    wallet: DeployedWalletState
}

export default defineComponent({

    props: {
        wallet: Object as PropType<DashboardDTO>
    },
    components: {
    AssetOption,
    TxListComponent
},
    methods: {
        setMaxValue() {
            this.amount = this.formatMina(this.wallet!.walletData.balance)
        },
        formatMina(uint: UInt64): number {
            return Number.parseInt(uint.div(10000).toString()) / 100000;
        },
        sign(vote: boolean) {
            this.signingInProgress = true

        },
        submitToChain() {

        },
        depositMina() {
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
            amount: 0.0,
            signingInProgress: false,
            signaturesToBroadcast: [] as SignatureProof[],
            linkBaseAddress: Config.EXPLORER_BASE_ADDRESS,
            api: inject<ApiService>("api"),
            // wallet: inject<WalletProvider>("wallet"),
            price: 0,
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

                    <img :src="wallet.walletData.blockie" class="circle" height="50"/> 
                    <h5 class="mt-2">{{wallet.walletData.name}}</h5>

                    <p class="mt-2">{{wallet.walletData.address}} <a class="ms-1" :href="linkBaseAddress + wallet.walletData.address"><font-awesome-icon icon="fa-solid fa-external-link-alt"></font-awesome-icon></a></p> 

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
                            <div class="h6 d-inline m-0 ms-2">{{ formatMina(wallet.walletData.balance) }} MINA </div>
                            <div class="h6 d-inline m-0 ms-2">{{ roundNumber(formatMina(wallet.walletData.balance) * price, 2) }}$ </div>
                        </div>
                        <button class="btn btn-success ms-3" @click="depositMina()">
                            <font-awesome-icon icon="fa-solid fa-arrow-right-from-bracket"></font-awesome-icon>
                            Deposit
                        </button>

                    </div>
                </div>
            </div>
        </div>
        
        <div class="col-6">
            <div class="card mt-3 p-3">
                <div class="card-body">

                    <h5>Pending Transaction</h5>

                    <button class="btn btn-success" @click="$emit('newTransactionClicked')" v-if="wallet !== undefined && wallet!.wallet.state === undefined">
                        <font-awesome-icon icon="fa-solid fa-plus" class="me-1"></font-awesome-icon>
                         Send new transaction

                    </button>

                    <div v-if="wallet !== undefined && wallet!.wallet.state !== undefined" class="border-card py-3 px-3 d-flex flex-row align-items-center" style="justify-content: space-between;">

                        <div style="width: fit-content;">
                            <h6>{{wallet!.wallet.state!.votes[0]}} from {{wallet!.walletData.k}} signed</h6>
                            <h5 class="d-flex align-items-center mb-0">{{ formatMina(wallet!.wallet.state.proposal.amount) }} <img src="src/assets/Mina2.png" height="22" style="border-radius: 5px;" class="ms-1"/></h5>
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
            <TxListComponent></TxListComponent>
        </div>
    </div>

</template>

<style scoped>
.border-card {
    border: 1px solid #ced4da;
    border-radius: 0.375rem;
}
</style>