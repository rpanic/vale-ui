<script lang="ts">

import {StorageService} from '@/zkapp/storage-service';
import {defineComponent, inject} from 'vue';
import {WalletAccountData, ZkAppService} from '@/zkapp/zkapp-service';
import {UInt64} from 'snarkyjs';
import SendingForm from '@/components/SendingForm.vue';
import GenericModal, {ModalDisplayParams} from '@/components/GenericModal.vue';
import TransactionSendingComponent, {TxSendParams} from '@/components/TransactionSendingComponent.vue';
import WalletDashboard from '@/components/WalletDashboard.vue';
import {SimpleObservable} from '@/zkapp/models';
import {ApiService} from '@/zkapp/api-service';
import {DeployedWalletImpl, ViewModel} from "@/zkapp/viewmodel";
import PendingTxToast from "@/views/PendingTxToast.vue";

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
            service: inject<ZkAppService>("service")!,
            api: inject<ApiService>("api")!,
            viewModel: inject<ViewModel>("view")!,
            walletData: [] as DeployedWalletImpl[],
            selectedWallet: 0,
            view: 0,
            currentWallet: undefined as DeployedWalletImpl | undefined,
            modalObs: new SimpleObservable<ModalDisplayParams>(),
            modalView: 0,

            importForm: { name: "", address: "" },
            refreshWallet: 0,

            txSendObservable: undefined as SimpleObservable<TxSendParams> | undefined
        }
    },
    methods: {
        walletSelected(index: number) {
            this.selectedWallet = index;
            this.viewModel.setSelectedWallet(index)
            this.currentWallet = this.viewModel.selectedWallet

            if(this.view !== 0){
                this.switchView(0)
            }
        },
        formatMina(uint: UInt64 | bigint): number {
            if(typeof uint == "bigint"){
                return Number.parseInt((uint / 10000n).toString()) / 100000;
            }
            return Number.parseInt(uint.div(10000).toString()) / 100000;
        },
        switchView(mode: number) {
            this.view = mode;
        },
        loadWalletClicked(){
            this.modalView = 0
            this.modalObs.next({show: true, closeable: true})
        },
        importWallet(){

            //Load wallet by address
            console.log("Loading", this.importForm.address)
            // this.api.getProposalState(this.importForm.address).then(x => {
            //
            //     if(x){
            //
            //         let wallet = {
            //             name: this.importForm.name,
            //             signers: x.wallet.signers,
            //             k: x.wallet.k,
            //             address: this.importForm.address,
            //             pks: [],
            //             deploymentTx: ""
            //         } as DeployedWallet
            //
            //         this.storageService.pushWallet(wallet)
            //         this.refreshWallet++
            //
            //         this.modalObs.next({show: false, closeable: true})
            //     }else{
            //         console.error("Loading of wallet", this.importForm.address, "failed")
            //     }
            //
            // })

        },
        closeModal(){
            this.modalObs.next({show: false, closeable: true})
        },
        deleteWallet(index: number) {
            this.walletSelected(index)
            this.modalView = 1
            this.modalObs.next({
                show: true,
                closeable: true
            })
        },
        doDeleteWallet(){
            console.log("Doing deletion of wallet " + this.currentWallet!.name)

            this.modalObs.next({
                show: false,
                closeable: true
            })

            this.viewModel.delete(this.currentWallet!)
            this.currentWallet = this.viewModel.selectedWallet
        }
    },
    mounted() {
        (window as any).ss = this.viewModel;

        this.viewModel.getWallets().then(wallets => {
            this.walletData = this.viewModel.wallets
            if(wallets.length > 0){
                this.walletSelected(0)
            }
        });
    },
    provide() {

        let txSendObservable = new SimpleObservable<TxSendParams>()
        this.txSendObservable = txSendObservable

        return {
            txSendObservable
        }

    },
    components: {PendingTxToast, SendingForm, WalletDashboard, GenericModal, TransactionSendingComponent }
});

</script>

<template>

    <div class="row w-100 m-0"> <!--  bg-grayed -->

        <div class="col-3 ps-0">

            <div class="d-flex flex-column align-items-stretch flex-shrink-0 bg-white overflow-auto sticky-top" style="height: calc(100vh - 57px);; z-index: 0; box-shadow: rgb(40 54 61 / 18%) 0px 2px 4px 0px;">

                <a class="d-flex align-items-center flex-shrink-0 p-3 link-dark text-decoration-none border-bottom">
                    <!-- <svg class="bi pe-none me-2" width="30" height="24"><use xlink:href="#bootstrap"></use></svg> -->
                    <span class="fs-5 ms-2 fw-semibold">Wallets</span>
                </a>

                <!-- Wallet list -->
                <div class="list-group list-group-flush border-bottom scrollarea" v-if="walletData.length > 0" v-for="(wallet, index) in walletData">
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
                        <div class="row">
                            <div class="col-10 mb-1 small" v-if="walletData[index] !== undefined">Balance: {{ formatMina(walletData[index].balance) }} MINA</div>
                            <div class="col-10 mb-1 small" v-if="walletData[index] === undefined">Balance: 0 MINA</div>
                            <div class="col-2 text-secondary d-flex justify-content-end align-items-center" style="--bs-text-opacity: 0.43;" v-if="selectedWallet === index">
                                <font-awesome-icon icon="fa-solid fa-trash" @click="deleteWallet(index)"></font-awesome-icon>
                            </div>
                        </div>
                    </a>
                </div>

                <!-- No Wallets -->
                <div class="list-group list-group-flush border-bottom scrollarea" v-if="walletData.length === 0">
                    <a href="#" class="list-group-item list-group-item-action active py-3 lh-sm" aria-current="true">
                        <strong class="mb-1">No wallets imported</strong>
                    </a>
                </div>

                <!-- Load Wallet -->
<!--                TODO -->
<!--                <div class="d-flex align-self-center mt-auto mb-3">-->
<!--                    <button class="btn btn-outline-success" @click="loadWalletClicked()">-->
<!--                        <font-awesome-icon icon="fa-solid fa-circle-plus"></font-awesome-icon>-->
<!--                        Load Wallet-->
<!--                    </button>-->
<!--                </div>-->

                <div class="d-flex align-self-center mt-auto mb-4">
                    <router-link class="btn btn-outline-success" to="/create">
                        <font-awesome-icon icon="fa-solid fa-circle-plus"></font-awesome-icon>
                        Create Wallet
                    </router-link>
                </div>

            </div>

        </div>
        <div class="col-9" >
            <div class="container mt-5" v-if="view === 0">

                <WalletDashboard :wallet="currentWallet" @new-transaction-clicked="switchView(1)"></WalletDashboard>

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

                <SendingForm v-if="currentWallet !== undefined" :walletData="currentWallet"></SendingForm>

            </div>


        </div>
    </div>


    <GenericModal id="walletModal" :observable="modalObs" large>

        <template v-if="modalView === 0">
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
        </template>

        <template v-else-if="modalView === 1 && currentWallet !== undefined">

            <div class="modal-header">
                <h5 class="modal-title">Delete Wallet</h5>
            </div>
            <div class="modal-body">
                <div class="form-floating mb-3">
                    Do you really want to delete wallet {{currentWallet.name}}?
                    This action is not reversable!
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" @click="closeModal()">Cancel</button>
                <button type="button" class="btn btn-danger" @click="doDeleteWallet()">Delete</button>
            </div>

        </template>

    </GenericModal>

    <TransactionSendingComponent v-if="txSendObservable" :observable="txSendObservable">

    </TransactionSendingComponent>

    <PendingTxToast></PendingTxToast>

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