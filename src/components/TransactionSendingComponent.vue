<script lang="ts">

import { SimpleObservable } from '@/zkapp/models';
import { Config } from '@/zkapp/config';
import { defineComponent, type PropType } from 'vue'
import GenericModal, { type ModalDisplayParams } from './GenericModal.vue';
import Completable, { type CompletableChanges } from './Completable.vue';
import type { TxSendResults } from '@/zkapp/zkapp-service';

export interface TxSendParams{
    method: Promise<TxSendResults>
}

export default defineComponent({
    props: {
        observable: Object as PropType<SimpleObservable<TxSendParams>>
    },
    emits: {
    },
    data(){
        return {
            changes: new SimpleObservable<CompletableChanges>(),
            modalObs: new SimpleObservable<ModalDisplayParams>(),
            closeable: false
        }
    },
    mounted() {
        if(this.observable !== undefined){
            this.observable.subscribe(x => {
                this.modalObs.next({show: true, closeable: false})
                this.changes.next({ status: "processing", link: "" })

                x.method.then(res => {

                    if(res.txhash){
                        this.changes.next({ status: "success", link: Config.EXPLORER_BASE_TX + res.txhash })
                    }
                    this.closeable = true

                })
            })
        }
    },
    methods: {
        closeModal(){
            // if(this.closeable){
            //     this.modalObs.next({show: false, closeable: true})
            // }
        }
    },
    components: { GenericModal, Completable }
})

</script>

<template>
    <GenericModal :id="'sendingModal'" :observable="modalObs" large>
        <div class="modal-header">
            <h5 class="modal-title">Submitting Transaction</h5>
            <!-- <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" :disabled="!closeable"></button> -->
        </div>
        <div class="modal-body">
            <Completable :changes="changes"></Completable>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-primary" data-bs-dismiss="modal" :disabled="!closeable">Close</button>
            <!-- <button type="button" class="btn btn-primary" @click="closeModal()" :disabled="!closeable">Close</button> -->
        </div>
    </GenericModal>
</template>