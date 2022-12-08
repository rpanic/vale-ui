<script lang="ts">

import { PrivateKey, PublicKey } from 'snarkyjs';
import { defineComponent } from 'vue'

export interface NewKeyPayload{ pk: PrivateKey | undefined, pub: PublicKey, index: Number }

export default defineComponent({

    props: {
        index: Number,
        pk: PrivateKey
    },
    data() {
        return {
            pubKey: "",
            generatedPk: undefined as PrivateKey | undefined
        }
    },
    methods: {
        generateKey(){
            console.log("emit" + this.pubKey)

            let pk: PrivateKey = PrivateKey.random()
            this.pubKey = pk.toPublicKey().toBase58()
            this.generatedPk = pk
            
        }
    },
    watch: {
        pubKey: function(val, oldVal) {
            console.log("Change", val, oldVal)

            let regex = new RegExp("B62[0-9a-zA-Z]{52}")
            if(!regex.test(this.pubKey)){
                return
            }

            let obj: NewKeyPayload
            if(this.generatedPk === undefined || this.generatedPk.toPublicKey().toBase58() !== this.pubKey){
                obj = { pub: PublicKey.fromBase58(this.pubKey), pk: undefined, index: this.index! }
            }else{
                obj = { pub: this.generatedPk.toPublicKey(), pk: this.generatedPk, index: this.index! }
            }
            this.$emit("newKey", obj)
        }
    },
    computed: {
    },
    emits: {
        newKey(payload: NewKeyPayload) {
            return true
        }
    }

})

</script>

<template>
    <form class="form">
        <div class="row">
            <div class="col-8">
                <!-- <label for="name">Publickey</label> -->
                <input type="text" class="form-control mt-1" id="name" :placeholder="'Wallet ' + (index + 1)" v-model="pubKey">
            </div>
            <div class="col-4 position-relative">
                <button class="btn btn-success position-absolute bottom-0" type="button" href="#" @click="generateKey()">
                    Generate new Wallet
                </button>
            </div>
            <!-- <div class="col-1"></div> -->
        </div>
    </form>
</template>