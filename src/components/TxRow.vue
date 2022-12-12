<script lang="ts">
import { Config } from '@/zkapp/config';
import { concatStringMiddle } from '@/zkapp/utils';
import { defineComponent, PropType } from 'vue';
import type { Transaction } from './TxListComponent.vue';
import TimeAgo from 'javascript-time-ago'

export default defineComponent({
    
    props: {
        tx: {
          type: Object as PropType<Transaction>,
          required: true
        }
    },
    computed: {
        color() {
            let color = "success"

            switch(this.tx.type){
                case "SIGNATURE":
                    color = "primary";
                    break;
                case "TRANSFER":
                    color = "danger";
                    break;

            }
            return color
        },
        text() : string {
            let text = "Other"
            switch(this.tx.type){
                case "DEPLOYMENT": 
                    text = "Creation";
                    break;
                case "DEPOSIT":
                    text = "Deposit"
                    break;
                case "TRANSFER":
                    text = "Payment"
                    break;
                case "SIGNATURE":
                    text = "Signature"
                    break;
            }

            return text
        },
    },
    data() {
        return {
            config: Config,
            timeago: new TimeAgo("en-US")
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
        },
        formatDate(date: number) : string {
            return this.timeago.format(new Date(date))
        }
    }
})

</script>

<template>
        <tr style="line-height: 50px">
            <td>
                <a v-if="tx.block.length > 0" :href="config.EXPLORER_BASE_BLOCK + tx.block" target="_blank">{{ tx.blocknumber }}</a>
                <div v-if="tx.block.length === 0" class="text-warning me-2" style="">Pending</div>
            </td>
            <td>
                <div class="btn btn-nohover " :class="'btn-outline-' + color" style="padding: 0.3rem 0.6rem;">
                    {{ text }}
                </div>
            </td>
            <td>
                <div class="d-flex align-items-center justify-content-end" style="width: 50px">
                    {{ formatMina(tx.value) }}
                    <img src="../assets/Mina2.png" height="20" style="border-radius: 5px;" class="ms-1"/>
                </div>
            </td>
            <td style="width: 52%;">
                <a :href="config.EXPLORER_BASE_TX + tx.txid" target="_blank">
                    {{ concatStringMiddle(tx.txid, 70) }}
                    <font-awesome-icon icon="fa-solid fa-external-link-alt"></font-awesome-icon>
                </a>
            </td>
            <td>
                <div>
                    {{formatDate(tx.timestamp)}}
                </div>
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