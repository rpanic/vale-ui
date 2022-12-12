<script lang="ts">
import {defineComponent, inject, PropType} from 'vue';
import TxRow from './TxRow.vue';
import {GraphQlService} from "@/zkapp/graphql";
import {DeployedWalletImpl} from "@/zkapp/viewmodel";
import {Config} from "@/zkapp/config";
import {concatStringMiddle} from "@/zkapp/utils";
import {PendingTxService, RichPendingTx} from "@/zkapp/pendingtx";

export interface Transaction {
    type: String,
    txid: string,
    successful: boolean,
    address: string,
    value: number,
    block: string,
    blocknumber: number,
    timestamp: number
}

export default defineComponent({
    props: {
        walletData: Object as PropType<DeployedWalletImpl>
    },
    data() {
        return {
            transactions: [
                // {
                //     type: "DEPLOYMENT",
                //     txid: "qw09fh2194hfcn90128z54890c214zn59c824",
                //     successful: true,
                //     address: "B62qkdnDUJQvg5SC7xKQb5tW5wuEWa3AvPAdPKtq3zNuUNhydp3Qti8",
                //     value: 63.7458738,
                //     block: "3NK4haHA9pgvUiE6D1cFiwHkotNLoTqHsecVDbPuBHZhuidXCR9E",
                //     blocknumber: 5163
                // },
                // {
                //     type: "TRANSFER",
                //     txid: "qw09fh2194hfcn90128z54890c214zn59c824",
                //     successful: true,
                //     address: "B62qkdnDUJQvg5SC7xKQb5tW5wuEWa3AvPAdPKtq3zNuUNhydp3Qti8",
                //     value: 63.7458738,
                //     block: "",
                //     blocknumber: 0
                // }
            ] as Transaction[],
            pendingTransactions: [] as Transaction[],
            config: Config,
            concatStringMiddle: concatStringMiddle,
            graphql: inject<GraphQlService>("graphql")!,
            pendingTxService: inject<PendingTxService>("pendingtxservice")!
        };
    },
    methods: {
        reloadTransactions(next: DeployedWalletImpl | undefined){
            this.transactions = []
            if (next) {
                this.graphql.getTransactions(next!).then(txs => {
                    console.log(txs)
                    this.transactions = txs
                })
                this.reloadPendingTxs(next)
            }
        },
        reloadPendingTxs(next: DeployedWalletImpl) {
            let pendingtxs = this.pendingTxService.getPendingTxs()[next.address]
            let txs: Promise<RichPendingTx>[] = []
            for(let txhash of pendingtxs){
                txs.push(this.pendingTxService.getRichTx(this.graphql, txhash))
            }
            Promise.all(txs).then(txsResolved => {
                this.pendingTransactions = txsResolved.map(tx => {
                    return {
                        txid: tx.hash,
                        type: tx.type,
                        timestamp: new Date().getTime(),
                        blocknumber: 0,
                        block: "",
                        value: 0, //TODO
                        successful: false,
                        address: next.address
                    } as Transaction
                })
            })
        }
    },
    watch: {
        walletData(next, pre) {
            this.reloadTransactions(next)
        }
    },
    mounted() {
        this.reloadTransactions(this.walletData!)

        this.pendingTxService.onChange((txhash: string, success: boolean) => {
            this.reloadTransactions(this.walletData!)
        })
    },
    components: {TxRow}
})

</script>

<template>

    <div class="card mt-3 p-3">
        <div class="card-body">

            <h5>Transaction history</h5>


            <table class="table mt-3" v-if="transactions.length > 0 || pendingTransactions.length > 0">
                <tr class="p-0">
                    <th scope="col">Block</th>
                    <th scope="col">Type</th>
                    <th scope="col">Value</th>
                    <th scope="col">TxId</th>
                    <th scope="col">Time</th>
                    <!--                    <th scope="col"><div>Address</div></th>-->
                </tr>
                <div class="mt-2"></div>
                <template v-for="transaction in pendingTransactions.concat(transactions)" v-if="transactions.length > 0|| pendingTransactions.length > 0">
                    <TxRow :tx="transaction"></TxRow>

                </template>
            </table>

            <template v-if="transactions.length === 0 && pendingTransactions.length === 0">
                <div class="text-center">
                    No transactions found
                </div>
            </template>

            <!--            <div class="d-flex align-items-center py-3" style="justify-content: space-between;" >-->

            <!--                <div class="d-flex align-items-center">-->
            <!--                    <div class="me-3">Block 12502</div>-->

            <!--                    <div class="btn btn-outline-warning btn-nohover py-1">Pending</div>-->
            <!--                </div>-->
            <!--                <div class="badge-new badge-success p-2">-->
            <!--                    Creation-->
            <!--                </div>-->

            <!--                <a :href="config.EXPLORER_BASE_TX">-->
            <!--                    B23160789woihj234f3pj-->
            <!--                </a>-->

            <!--                <div>-->
            <!--                    <div class="btn btn-outline-primary py-1">-->
            <!--                        View <font-awesome-icon icon="fa-solid fa-external-link-alt"></font-awesome-icon>-->
            <!--                    </div>-->
            <!--                </div>-->

            <!--            </div>-->

        </div>
    </div>

</template>

<style>

.btn-nohover:hover, .btn-nohover:active, .btn-nohover:focus-visible {

    color: var(--bs-btn-color);
    background-color: var(--bs-btn-bg);
    border-color: var(--bs-btn-border-color);

}

.btn-nohover {
    cursor: auto;
}

</style>