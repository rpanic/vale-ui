<script lang="ts">
import type { ProposalDto } from '@/zkapp/api-service';
import {Field, PublicKey, UInt64} from 'snarkyjs';
import { defineComponent, PropType } from 'vue';
import AssetOption from './AssetOption.vue';

export interface BigIntWrapper {
    v: bigint
}

export default defineComponent({

    props:{
        proposal: Object as PropType<ProposalDto>,
        balance: Object as PropType<BigIntWrapper>
    },
    data() {
        return {
            shownProposal: {
                receiver: "",
                amount: 0.0
            },
            editable: true
        }
    },
    mounted() {

        if(this.proposal !== undefined){
            this.editable = false
            this.shownProposal = {
                receiver: this.proposal.receiver,
                amount: parseFloat(this.proposal.amount) / 1e9
            }
        }

    },
    methods: {
        setMaxValue() {
            if(this.editable){
                this.shownProposal.amount = this.formatMina(this.balance!.v)
            }
        },
        formatMina(uint: UInt64 | bigint | undefined): number {
            if(!uint){
                return 0.0
            }
            if(typeof uint === "bigint"){
                return Number.parseInt((uint / 10000n).toString()) / 100000;
            }
            return Number.parseInt(uint.div(10000).toString()) / 100000;
        },
        submit (){
            let recPub = PublicKey.fromBase58(this.shownProposal.receiver.trim())
            let amountUint = Math.round(this.shownProposal.amount * 1e9)
            let dto = {
                receiver: recPub.toBase58(),
                amount: amountUint + "",
                index: 0 //TODO Add support for multiple proposals
            }
            this.$emit('proposalSet', dto)
            this.editable = false
        },
    },
    emits: {
        proposalSet(payload: ProposalDto){
            return true
        }
    },
    components: {
        AssetOption
    }

})

</script>

<template>
    <h5 class="mt-2">Send assets</h5>

    <label>Receiver</label>
    <input type="text" class="form-control" placeholder="Receiver Address" :disabled="!editable" v-model="shownProposal.receiver"/>

    <label>Asset</label>

    <div class="dropdown w-50">
        <div class="disabled" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false" style="border: 1px solid #ced4da; border-radius: 0.375rem;">
            <AssetOption show-chevron title="Mina Protocol" :amount="formatMina(balance.v) + ' Mina'"></AssetOption>
        </div>
        <ul class="dropdown-menu w-100">
            <li><a class="dropdown-item" href="#">
                <AssetOption title="Mina Protocol" amount="0.3613 Mina"></AssetOption></a>
            </li>
        </ul>
    </div>

    <label>Amount</label>

    <div class="input-group mb-3 w-50">
        <input type="number" class="form-control" :placeholder="formatMina(balance.v).toString()" aria-describedby="button-addon2" v-model="shownProposal.amount" :disabled="!editable">
        <button class="btn btn-outline-secondary" type="button" id="button-addon2" @click="setMaxValue">Max</button>
    </div>

    <div class="btn btn-success mb-3" v-if="editable" @click="submit">Submit proposal</div>
</template>

<style scoped>

.dropdown > .disabled {
    background-color: var(--bs-gray-200);
}

</style>