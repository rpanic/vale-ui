<script lang="ts">

import { defineComponent } from 'vue';

export default defineComponent({

    props: {
        showChevron: Boolean,
        title: String,
        amount: String,
    },
    components: {
    },
    data() {
        return {
            selectedValue: null
        };
    }

})

</script>

<template>

    <div class="d-flex mx-3 my-2 align-items-center" style="justify-content: space-between">
        <div class="d-flex align-items-center">
            <img src="src/assets/Mina2.png" height="32" style="border-radius: 5px;"/>
            
            <div class="text-normal ms-3">
                <div style="font-weight: 500;">{{title}}</div>
                <div>{{amount}}</div>
            </div>
        </div>
        <font-awesome-icon icon="fa-solid fa-chevron-down" v-if="showChevron"></font-awesome-icon>
    </div>

</template>