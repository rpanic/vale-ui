<script lang="ts">
import {defineComponent, inject} from "vue";
import {PendingTxService, RichPendingTx} from "@/zkapp/pendingtx";
import {Toast} from "bootstrap";
import {GraphQlService} from "@/zkapp/graphql";
import {StorageService} from "@/zkapp/storage-service";
import {Config} from "@/zkapp/config";

interface VeryRichPendingTx extends RichPendingTx{
    success: boolean
}

export default defineComponent({

    data() {
        return {
            pendingtxs: inject<PendingTxService>("pendingtxservice")!,
            graphql: inject<GraphQlService>("graphql")!,
            txPendingDropdownFlipped: true,

            transactions: [] as VeryRichPendingTx[],
            storage: new StorageService(),
            tx_explorer_base: Config.EXPLORER_BASE_TX
        }
    },
    methods: {
        openToast(){
            if(this.transactions.length > 0){ //TODO > 0
                const toast = new Toast('#liveToast', {
                    autohide: false
                })
                toast.show()
            }
        },
        flipTransactionPendingDropdown(){
            this.txPendingDropdownFlipped = !this.txPendingDropdownFlipped
        },
        walletName(wallet: string) : string{
            return this.storage.getWallets().find(x => x.address === wallet)?.name ?? "Unknown"
        },
        goToWallet(wallet: string){

        }
    },
    mounted() {

        this.pendingtxs!.ready.then(x => {
            this.pendingtxs.getAllPendingTxs(this.graphql).then(txs => {
                this.transactions = txs.map(x => {
                    return {
                        ...x,
                        success: false
                    }
                })

                this.pendingtxs.onChange((t: string, added: boolean) => {
                    if(!added){
                        let tx = this.transactions.find(x => x.hash === t)
                        if(tx){
                            tx.success = true
                        }else{
                            console.log("Tx not found in list...")
                        }
                    }else{
                        this.pendingtxs.getRichTx(this.graphql, t).then(rich => {
                            this.transactions.push({
                                ...rich,
                                success: false
                            })
                            this.openToast()
                        })
                    }
                })

                this.openToast()

            })
        })

    }

})
</script>

<template>
    <div class="toast-container position-fixed bottom-0 end-0 p-3">
        <div id="liveToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-body m-1">

                <div class="d-flex py-1" style="line-height: 120%">

                    <div class="spinner-border spinner-border-sm text-success" role="status" v-if="transactions.filter(x => !x.success).length > 0">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <font-awesome-icon icon="fa-solid fa-check" v-if="transactions.filter(x => !x.success).length === 0" class="text-success"></font-awesome-icon>

                    <div class="ms-2">{{transactions.filter(x => !x.success).length}} transaction pending</div>

                    <a class="ms-auto text-dark pe-1" @click="flipTransactionPendingDropdown"
                       data-bs-toggle="collapse" href="#tx-collapse" role="button" aria-expanded="false"
                       aria-controls="tx-collapse">
                        <font-awesome-icon icon="fa-solid fa-chevron-down"
                                           :class="{'flipped': txPendingDropdownFlipped, 'unflipped': !txPendingDropdownFlipped}"></font-awesome-icon>
                    </a>
                </div>

                <div class="collapse" id="tx-collapse">
                    <hr class="mb-2 mt-3 pb-1">
                    <!-- Row -->
                    <div class="d-flex justify-content-between" v-for="(transaction, index) in transactions">

                        <div :class="{'mb-2': index < transactions.length - 1}">

                            <font-awesome-icon icon="fa-solid fa-check" v-if="transaction.success" class="text-success"></font-awesome-icon>
                            {{ transaction.type.charAt(0) + transaction.type.toLowerCase().substr(1) }}
                            to

                            <div @click="goToWallet(transaction.wallet)" class="text-success d-inline">
                                <font-awesome-icon icon="fa-solid fa-wallet" class="text-success"></font-awesome-icon>
                                {{ walletName(transaction.wallet) }}
                            </div>
                        </div>

                        <a :href="tx_explorer_base + transaction.hash" class="text-success" target="_blank">Explorer
                            <font-awesome-icon icon="fa-solid fa-up-right-from-square"></font-awesome-icon>
                        </a>
                    </div>

<!--                    <div class="d-flex justify-content-between">-->
<!--                        <div>-->
<!--                            <font-awesome-icon icon="fa-solid fa-check" class="text-success"></font-awesome-icon>-->
<!--                            Deposit to-->
<!--                            <a href="abc.html" class="text-success">-->
<!--                                <font-awesome-icon icon="fa-solid fa-wallet" class="text-success"></font-awesome-icon>-->
<!--                                My Wallet-->
<!--                            </a></div>-->
<!--                        <a href="asd" class="text-success" target="_blank">Explorer-->
<!--                            <font-awesome-icon icon="fa-solid fa-up-right-from-square"></font-awesome-icon>-->
<!--                        </a>-->
<!--                    </div>-->
                </div>
            </div>
        </div>
    </div>
</template>

