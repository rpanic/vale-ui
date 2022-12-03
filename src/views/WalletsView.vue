<script lang="ts">

import { StorageService, type DeployedWallet } from '@/zkapp/storage-service';
import { defineComponent, inject } from 'vue';
import * as blockies from 'blockies-ts';
import { ZkAppService, type WalletAccountData } from '@/zkapp/zkapp-service';
import { UInt64 } from 'snarkyjs';
import SendingForm from '@/components/SendingForm.vue';
import GenericModal, { type ModalDisplayParams } from '@/components/GenericModal.vue';
import TransactionSendingComponent, { type TxSendParams } from '@/components/TransactionSendingComponent.vue';
import WalletDashboard, { type DashboardDTO } from '@/components/WalletDashboard.vue';
import { SimpleObservable } from '@/zkapp/models';
import { ApiService } from '@/zkapp/api-service';

export interface UIWalletAccountData extends WalletAccountData {
    name: string
    blockie: string
    signers: string[],
    k: number,
    pks: string[]
}

export default defineComponent({
    data() {
        return {
            storageService: new StorageService(),
            selectedWallet: 0,
            service: inject<ZkAppService>("service")!,
            api: inject<ApiService>("api")!,
            walletData: [] as UIWalletAccountData[],
            view: 0,
            currentWalletData: undefined as UIWalletAccountData | undefined,
            dashboardDto: undefined as DashboardDTO | undefined,
            modalObs: new SimpleObservable<ModalDisplayParams>(),

            importForm: { name: "", address: "" },
            refreshWallet: 0,

            txSendObservable: undefined as SimpleObservable<TxSendParams> | undefined
        }
    },
    computed: {
        wallets() {
            this.refreshWallet
            return this.storageService.getWallets();
        },
    },
    methods: {
        walletSelected(index: number) {
            this.selectedWallet = index;
            this.currentWalletData = this.walletData[index]
            this.updateProposalState()
        },
        formatMina(uint: UInt64): number {
            return Number.parseInt(uint.div(10000).toString()) / 100000;
        },
        switchView(mode: number) {
            this.view = mode;
        },
        updateProposalState(){

            if(this.currentWalletData){
                this.service.apiService.constructWalletWithState(this.wallets[this.selectedWallet]).then(x => {

                    this.dashboardDto = { wallet: x, walletData: this.currentWalletData! }

                })
            }
        },
        loadWalletClicked(){
            this.modalObs.next({show: true, closeable: true})
        },
        importWallet(){

            //Load wallet by address
            console.log("Loading", this.importForm.address)
            this.api.getProposalState(this.importForm.address).then(x => {

                if(x){

                    let wallet = {
                        name: this.importForm.name,
                        signers: x.wallet.signers,
                        k: x.wallet.k,
                        address: this.importForm.address,
                        pks: [],
                        deploymentTx: ""
                    } as DeployedWallet

                    this.storageService.pushWallet(wallet)
                    this.refreshWallet++

                    this.modalObs.next({show: false, closeable: true})
                }else{
                    console.error("Loading of wallet", this.importForm.address, "failed")
                }

            })

        },
        closeModal(){
            this.modalObs.next({show: false, closeable: true})
        }
    },
    mounted() {
        (window as any).ss = this.storageService;

        let wallets = this.storageService.getWallets();
        this.walletData = new Array(wallets.length);

        wallets.forEach((wallet, index) => {
            this.service.getWalletData(wallet.address, wallet.deploymentTx).then(accountData => {
                let blockie = blockies.create({ seed: wallet.address, scale: 8 }).toDataURL();
                if (accountData === undefined) {
                    // this.walletData = 
                }
                else {
                    let walletData = {
                        name: wallet.name,
                        blockie: blockie,
                        address: accountData.address,
                        network: accountData.network,
                        balance: accountData.balance,
                        deploymentPending: accountData.deploymentPending,
                        live: accountData.live,
                        signers: wallet.signers,
                        k: wallet.k,
                        pks: wallet.pks
                    } as UIWalletAccountData;
                    this.walletData[index] = walletData;
                    console.log("Read wallet", index);
                    console.log(walletData)
                    
                    if(index === this.selectedWallet){
                        this.currentWalletData = walletData
                        this.updateProposalState()
                    }
                }
            });
        });
    },
    provide() {

        let txSendObservable = new SimpleObservable<TxSendParams>()
        this.txSendObservable = txSendObservable

        return {
            txSendObservable
        }

    },
    components: { SendingForm, WalletDashboard, GenericModal, TransactionSendingComponent }
});

</script>

<template>

    <div class="row w-100 m-0 bg-grayed">

        <div class="col-3 ps-0">

            <div class="d-flex flex-column align-items-stretch flex-shrink-0 bg-white overflow-auto sticky-top" style="height: 90vh; z-index: 0; box-shadow: rgb(40 54 61 / 18%) 0px 2px 4px 0px;">

                <a href="/" class="d-flex align-items-center flex-shrink-0 p-3 link-dark text-decoration-none border-bottom">
                    <!-- <svg class="bi pe-none me-2" width="30" height="24"><use xlink:href="#bootstrap"></use></svg> -->
                    <span class="fs-5 ms-2 fw-semibold">Wallets</span>
                </a>

                <!-- Wallet list -->
                <div class="list-group list-group-flush border-bottom scrollarea" v-if="wallets.length > 0" v-for="(wallet, index) in wallets">
                    <a href="#" class="list-group-item list-group-item-action py-3 lh-sm" aria-current="true" :class="{'bg-active': index === selectedWallet}" @click="walletSelected(index)">
                        <div class="d-flex w-100 align-items-center justify-content-between">
                            <div class="mb-2 d-flex">
                                <div class="strong fw-bolder"> 
                                    {{ wallet.name }} 
                                </div>
                                <div v-if="walletData.length >= index && walletData[index] !== undefined" class="d-flex">
                                    <div class="dot align-self-center ms-2" 
                                        :class="{'bg-success': walletData[index].live, 'bg-warning': walletData[index].deploymentPending, 'bg-danger': !walletData[index].live && !walletData[index].deploymentPending}">
                                    </div>
                                    <small class="d-flex ms-1 align-self-center ">{{ walletData[index].live ? 'Live' : (walletData[index].deploymentPending ? 'Pending' : 'Error') }}</small>
                                </div>
                                <div v-if="walletData.length >= index && walletData[index] === undefined" class="d-flex">
                                    <small class="ms-1 align-self-center ">Loading...</small>
                                </div>
                            </div>
                            

                            <small>{{wallet.k}} of {{wallet.signers.length}}</small>
                        </div>
                        <div class="col-10 mb-1 small" v-if="walletData[index] !== undefined">Balance: {{ formatMina(walletData[index].balance) }} MINA</div>
                        <div class="col-10 mb-1 small" v-if="walletData[index] === undefined">Balance: 0 MINA</div>
                    </a>
                </div>

                <!-- No Wallets -->
                <div class="list-group list-group-flush border-bottom scrollarea" v-if="wallets.length === 0">
                    <a href="#" class="list-group-item list-group-item-action active py-3 lh-sm" aria-current="true">
                        <strong class="mb-1">No wallets imported</strong>
                    </a>
                </div>
                
                <!-- Load Wallet -->
                <div class="d-flex align-self-center mt-auto mb-3">
                    <button class="btn btn-outline-success" @click="loadWalletClicked()">
                        <font-awesome-icon icon="fa-solid fa-circle-plus"></font-awesome-icon>
                        Load Wallet
                    </button>
                </div>

            </div>
            
        </div>
        <div class="col-9" >
            <div class="container mt-5" v-if="view === 0">

                <WalletDashboard :wallet="dashboardDto" @new-transaction-clicked="switchView(1)"></WalletDashboard>

                <!-- <h4 class="">
                    <div class="d-flex align-items-center">
                        <font-awesome-icon icon="fa-solid fa-wallet" class="ms-1 me-3 p-3 circle bg-success text-white"/>
                        Receive MINA
                    </div>
                </h4> -->

            </div>

            <div class="container mt-5" v-if="view === 1">

                <button class="btn btn-success" @click="switchView(0)">
                    <font-awesome-icon icon="fa-solid fa-chevron-left"></font-awesome-icon>
                    Back
                </button>

                <SendingForm v-if="dashboardDto !== undefined" :walletData="dashboardDto!"></SendingForm>

            </div>


        </div>
    </div>

    
    <GenericModal id="walletModal" :observable="modalObs" large>
                        
        <div class="modal-header">
            <h5 class="modal-title">Load Wallet</h5>
        </div>
        <div class="modal-body">
            <div class="form-floating mb-3">
                <input class="form-control" type="text" id="i1" placeholder="Type in a name you like" v-model="importForm.name"/>
                <label for="i1">Name</label>
            </div>
            <div class="form-floating">
                <input class="form-control" type="text" id="i2" placeholder="Type in address.." v-model="importForm.address"/>
                <label for="i2">Address</label>
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeModal()">Close</button>
            <button type="button" class="btn btn-primary" @click="importWallet()">Load</button>
        </div>
    </GenericModal>

    <TransactionSendingComponent v-if="txSendObservable" :observable="txSendObservable">
        
    </TransactionSendingComponent>

</template>

<style>
.bg-active{
    background-color: var(--bs-gray-400);
}

.circle {
    border-radius: 8px;
}

.bg-grayed{
    background-color: var(--bs-gray-100); 
    /* z-index: -4 */
}

.card {
    border: none;
    box-shadow: rgb(40 54 61 / 18%) 0px 1px 2px 0px;
}

.assetRow:hover {
    background-color: var(--bs-gray-100);
}

.dot {
    display: inline-block;
    height: 8px;
    width: 8px;
    border-radius: 5px;
}

</style>