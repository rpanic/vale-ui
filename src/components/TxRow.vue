<script lang="ts">
import { Config } from '@/zkapp/config';
import { GraphQlService } from '@/zkapp/graphql';
import { concatStringMiddle } from '@/zkapp/utils';
import { faGrinTongueSquint } from '@fortawesome/free-solid-svg-icons';
import { defineComponent, inject, type PropType } from 'vue';
import type { Transaction } from './TxListComponent.vue';

export default defineComponent({
    
    props: {
        tx: Object as PropType<Transaction>
    },
    computed: {
        color() {
            return "success"
        },
        text() : string {
            let text = "None"
            switch(this.tx!.type){
                case "DEPLOYMENT": 
                    text = "Creation";
                    break;
                case "TRANSFER":
                    text = "Transfer"
                    break;
                case "SIGNATURE":
                    text = "Signatures"
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
        <tr>
            <td>
                <a v-if="tx!.block.length > 0" :href="config.EXPLORER_BASE_BLOCK + tx!.block">{{ tx!.blocknumber }}</a>
                <div v-if="tx!.block.length === 0" class="badge text-warning border-warning" style="border: 1px solid;">Pending</div>
            </td>
            <td>
                <div class="badge " :class="'text-bg-' + color">
                    {{ text }}
                </div>
            </td>
            <td>
                <a :href="config.EXPLORER_BASE_TX + tx!.txid">
                    {{ concatStringMiddle(tx!.txid, 20) }}
                    <font-awesome-icon icon="fa-solid fa-external-link-alt"></font-awesome-icon>
                </a>
            </td>
            <td>
                <div class="d-flex align-items-center">
                    {{ formatNumber(tx!.value) }}
                    <img src="src/assets/Mina2.png" height="24" style="border-radius: 5px;" class="ms-1"/>
                </div>
            </td>
            <td>
                <a :href="config.EXPLORER_BASE_ADDRESS + tx!.address">
                    {{ concatStringMiddle(tx!.address, 26) }}
                    <font-awesome-icon icon="fa-solid fa-external-link-alt"></font-awesome-icon>
                </a>
            </td>
        </tr>

</template>

<style scoped>

tr:hover {
    background: rgba(0, 0, 0, 0.05)
}

</style>