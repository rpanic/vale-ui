<script lang="ts">

import { SimpleObservable } from '@/zkapp/models';
import { Config } from '@/zkapp/config';
import { defineComponent, PropType } from 'vue'
import GenericModal, { ModalDisplayParams } from './GenericModal.vue';
import Completable, { CompletableChanges } from './Completable.vue';
import type { TxSendResults } from '@/zkapp/zkapp-service';

export interface TxSendParams{
    method: Promise<TxSendResults>,
    onClose?: () => void
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
            closeable: false,
            onCloseReceiver: this.onClose,
            onCloseListener: () => {}
        }
    },
    mounted() {
        if(this.observable !== undefined){
            this.observable.subscribe(x => {
                this.modalObs.next({ show: true, closeable: false })
                this.changes.next({ status: "processing", link: "" })

                x.method.then(res => {

                    if(res.txhash){
                        this.changes.next({ status: "success", link: Config.EXPLORER_BASE_TX + res.txhash })
                    }
                    this.closeable = true
                    this.onCloseListener = x.onClose ?? (() => {})

                }).catch(err => {

                    console.log("2", err)
                    this.changes.next({
                        status: "error",
                        link: ""
                    })
                    this.closeable = true
                    this.onCloseListener = x.onClose ?? (() => {})
                })
            })
        }
    },
    methods: {
        closeModal(){
            // if(this.closeable){
            //     this.modalObs.next({show: false, closeable: true})
            // }
        },
        onClose(){
            this.onCloseListener()
            this.onCloseListener = () => {}
        }
    },
    components: { GenericModal, Completable }
})

</script>

<template>
    <GenericModal :id="'sendingModal'" :observable="modalObs" :on-close="onCloseReceiver" large>
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