<script lang="ts">
    
import { defineComponent } from 'vue'

export default defineComponent({

    props: {
        backText: {
            type: String,
            default: "Back"
        },
        nextText: {
            type: String,
            default: "Continue"
        }
    },
    data() {
        return {
        //     backText: "Back",
        //     nextText: "Continue"
        }
    },
    emits: ['next-clicked', 'back-clicked'],

})

</script>

<template>
    <div class="d-flex justify-content-center py-3" style="border-top: 1px solid var(--bs-card-border-color);">
        <button class="btn btn-light w-auto px-4 me-4" @click="$emit('back-clicked')">{{backText}}</button>
        <button class="btn btn-success w-auto px-4" @click="$emit('next-clicked')">{{nextText}}</button>
    </div>
</template>