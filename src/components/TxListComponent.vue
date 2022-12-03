<script lang="ts">
import { defineComponent } from 'vue';
import TxRow from './TxRow.vue';

export interface Transaction {
    type: String,
    txid: string,
    successful: boolean,
    address: string,
    value: number,
    block: string,
    blocknumber: number
}

export default defineComponent({
    // props: {},
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
            ] as Transaction[]
        };
    },
    components: { TxRow }
})

</script>

<template>

    <div class="card mt-3 p-3">
        <div class="card-body">

            <h5>Transaction history</h5>


            <table class="table" v-if="transactions.length > 0">
                <tr class="p-2">
                    <th scope="col"><div>Block</div></th>
                    <th scope="col"><div>Type</div></th>
                    <th scope="col"><div>TxId</div></th>
                    <th scope="col"><div>Value</div></th>
                    <th scope="col"><div>Address</div></th>
                </tr>
                <template v-for="transaction in transactions">
                    <TxRow :tx="transaction"></TxRow>

                </template>
            </table>
            
            <template v-if="transactions.length === 0">
                <div class="text-center">
                    No transactions found
                </div>
            </template>

            <!-- <div class="d-flex align-items-center py-3" style="justify-content: space-between;" >

                <div class="badge-new badge-success p-2">
                    Creation
                </div>

                <div class="btn btn-outline-warning py-1">Pending</div>

                <div>
                    <div class="btn btn-outline-primary py-1">
                        View <font-awesome-icon icon="fa-solid fa-external-link-alt"></font-awesome-icon>
                    </div>
                </div>

            </div> -->

        </div>
    </div>

</template>