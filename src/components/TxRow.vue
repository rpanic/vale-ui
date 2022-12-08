<script lang="ts">
import { Config } from '@/zkapp/config';
import { concatStringMiddle } from '@/zkapp/utils';
import { defineComponent, PropType } from 'vue';
import type { Transaction } from './TxListComponent.vue';

export default defineComponent({
    
    props: {
        tx: Object as PropType<Transaction>
    },
    computed: {
        color() {
            let color = "success"

            switch(this.tx!.type){
                case "SIGNATURE":
                    color = "warning";
                    break;
                case "TRANSFER":
                    color = "success";
                    break;
            }
            return color
        },
        text() : string {
            let text = "Other"
            switch(this.tx!.type){
                case "DEPLOYMENT": 
                    text = "Creation";
                    break;
                case "DEPOSIT":
                    text = "Deposit"
                    break;
                case "SIGNATURE":
                    text = "Signature"
                    break;
            }

            return text
        },
    },
    // mounted() {

    //     this.graphql!.getBlockHashByNumber(this.tx!.block).then(x => {
    //         console.log(x)
    //     })

    // },
    data() {
        return {
            config: Config,
        }
    },
    methods: {
        concatStringMiddle,
        formatMina(n: number) : string{
            return this.formatNumber(n / 1e9)
        },
        formatNumber(n: number) : string {
            let s = n.toString()
            let i = s.indexOf('.')
            let numAfterComma = 3
            return s.slice(0, i >= 0 ? i + numAfterComma + 1 : s.length)
        }
    }
})

</script>

<template>
        <tr style="line-height: 50px">
            <td>
                <a v-if="tx.block.length > 0" :href="config.EXPLORER_BASE_BLOCK + tx.block" target="_blank">{{ tx.blocknumber }}</a>
                <div v-if="tx.block.length === 0" class="badge text-warning border-warning" style="border: 1px solid;">Pending</div>
            </td>
            <td>
                <div class="btn btn-nohover " :class="'btn-outline-' + color" style="padding: 0.3rem 0.6rem;">
                    {{ text }}
                </div>
            </td>
            <td>
                <div class="d-flex align-items-center">
                    {{ formatMina(tx.value) }}
                    <img src="src/assets/Mina2.png" height="20" style="border-radius: 5px;" class="ms-1"/>
                </div>
            </td>
            <td>
                <a :href="config.EXPLORER_BASE_TX + tx.txid" target="_blank">
                    {{ concatStringMiddle(tx.txid, 30) }}
                    <font-awesome-icon icon="fa-solid fa-external-link-alt"></font-awesome-icon>
                </a>
            </td>
<!--            <td>-->
<!--                <a :href="config.EXPLORER_BASE_ADDRESS + tx.address">-->
<!--                    {{ concatStringMiddle(tx.address, 26) }}-->
<!--                    <font-awesome-icon icon="fa-solid fa-external-link-alt"></font-awesome-icon>-->
<!--                </a>-->
<!--            </td>-->
        </tr>

</template>

<style scoped>

tr:hover {
    background: rgba(0, 0, 0, 0.05)
}

.table > :not(caption) > * > * {
    padding: 0;
}

</style>