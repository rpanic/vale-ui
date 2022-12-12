<script lang="ts">

import { SimpleObservable } from '@/zkapp/models';
import { defineComponent, PropType } from 'vue'
import {Modal} from "bootstrap";

export interface ModalDisplayParams {
    show: boolean,
    closeable: boolean
}

export default defineComponent({

    props: {
        observable: Object as PropType<SimpleObservable<ModalDisplayParams>>,
        onClose: Function,
        id: {
            type: String,
            default: "genericModal"
        },
        large: {
            type: Boolean,
            default: false
        }
    },
    data(){
        return {
            closeable: true
        }
    },
    emits: [],
    mounted(){
        if(this.observable !== undefined){
            this.observable!.subscribe(x => {
                this.closeable = x.closeable
                if(x.show === true){
                    let options = {
                        backdrop: x.closeable ? true : 'static' as 'static' | boolean,
                        keyboard: x.closeable
                    }   
                    new Modal("#" + this.id, options).show()
                }else{
                    console.log("asd")
                    Modal.getOrCreateInstance("#" + this.id).hide()
                }
            })
        }
        document.getElementById(this.id)!.addEventListener("hide.bs.modal", (e) => {
            this.onClose!();
        })
    }

})

</script>

<template>
    <div class="modal fade" :id="id" tabindex="-1">
        <div class="modal-dialog" :class="{'modal-lg': large}">
            <div class="modal-content">
                <slot></slot>
            </div>
        </div>
    </div>
</template>