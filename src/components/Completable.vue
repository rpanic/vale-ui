<script lang="ts">

import { SimpleObservable } from '@/zkapp/models';
import { defineComponent, type PropType } from 'vue'

export interface CompletableChanges {
    status: string,
    link: string
}

export default defineComponent({
    props: {
        changes: Object as PropType<SimpleObservable<CompletableChanges>>,
    },
    data() {
        return {
            status: "open",
            link: ""
        }
    },
    emits: [],
    mounted() {
        if (this.changes !== undefined) {
            this.changes!.subscribe(x => {
                console.log("3", x.status)
                this.status = x.status
                this.link = x.link
            });
        }
    }
})

</script>

<template>
    <div class="card-body" :style="{ minHeight: '300px'}">
        <template v-if="status === 'open'">
            
            <!-- <ng-content></ng-content> -->

        </template>
        <template v-if="status === 'processing'">
            <div class="d-flex justify-content-center align-items-center checkAbsolute" style="top: 40%; min-height: 300px">
                <div class="lds-ripple" style="margin-top: 5px;"><div></div><div></div></div>
            </div>
        </template>
        <template v-if="status === 'success'">
            <div class="d-flex justify-content-center checkAbsolute" style="">

                <div class="swal2-icon swal2-success swal2-animate-success-icon" style="display: flex;">
                <div class="swal2-success-circular-line-left" style="background-color: rgb(255, 255, 255);"></div>
                <span class="swal2-success-line-tip"></span>
                <span class="swal2-success-line-long"></span>
                <div class="swal2-success-ring"></div>
                <div class="swal2-success-fix" style="background-color: rgb(255, 255, 255);"></div>
                <div class="swal2-success-circular-line-right" style="background-color: rgb(255, 255, 255);"></div>
                </div>
            </div>
            <div class="row">
                <div class="col-12 feedback-subheading">
                    <h3>Transaction submitted</h3>
                    <h5>It will be complete shortly</h5>
                    <a :href="link" target="_blank">View on Block Explorer <font-awesome-icon icon="fa-solid fa-external-link-alt"></font-awesome-icon></a>
                </div>
            </div>

        </template>
        <template v-if="status === 'error'">
            <div class="justify-content-center checkAbsolute" style="width:98%">

                <div class="swal2-icon swal2-error swal2-animate-error-icon" style="display: flex;"><span class="swal2-x-mark"><span class="swal2-x-mark-line-left"></span><span class="swal2-x-mark-line-right"></span></span></div>

            </div>
            
            <div class="row">
                <div class="col-12 feedback-subheading">
                    <h3>Canceled Transaction</h3>
                </div>
            </div>
        </template>
    </div>

</template>

<style scoped>
    .feedback-subheading{
        text-align: center;
    }
</style>