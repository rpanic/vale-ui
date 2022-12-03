<script lang="ts">

import { defineComponent, type PropType } from 'vue'

export default defineComponent({

    props: {
        index: Number,
        heading: String,
        showCollapse: Boolean
    },
    methods: {
    },

})

</script>

<template>
    <div>
    <div class="row mt-3 mb-2">
        <div>
            <div class="square bg-success me-2 d-inline-block"><div>{{ index }}</div></div>
            <div class="d-inline h5">{{ heading }}</div>
        </div>
    </div>
    <div class="row collapse" :class="{ show: showCollapse }" :id="'collapse' + index">
        <div>
            <div class="d-inline-block ps-2 line-left mt-2 w-100"><div style="padding-left: 12px">
                <div class="card">
                    <slot></slot>
                </div>
            </div></div>
        </div>
    </div>
</div>
</template>
<!--  class="collapse" id="collapse1" -->