<script lang="ts">
import TheWelcome from '../components/TheWelcome.vue'

import { isReady, PrivateKey } from 'snarkyjs'
import { defineComponent, type PropType } from 'vue';



</script>

<template>

  <div class="d-flex container align-items-center h-100 ">

    <div class="flex-grow-1">
      <div class="row mb-5">

        <div class="col-2">
        </div>
        <div class="col-8">
          <h2 class="mb-3">Welcome to MinaSig</h2>
          <h5>Safe is the most trusted platform to manage digital assets.<br>
            Here is how to get started:</h5>
        </div>
        <div class="col-2">
        </div>

      </div>

      <div class="row">
        <div class="col-2">

        </div>
        <div class="col-8">
          <div class="card" style="box-shadow: rgb(40 54 61 / 18%) 1px 2px 10px 0px; border: none">
            <div class="row">
              <div class="col-6" style="border-right: var(--bs-card-border-width) solid rgb(00 14 28 / 15%)"> <!--var(--bs-card-border-color);-->

                <div class="card-body m-3">
                  <h5 class="card-title">Create Wallet</h5>
                  <p class="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
                  <router-link to="/create" class="btn btn-success mt-3 btn-medium">Create new wallet</router-link>
                </div>

              </div>
              <div class="col-6">
                
                <div class="card-body m-3">
                  <h5 class="card-title">Load existing Wallet</h5>
                  <p class="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
                  <router-link to="/wallets"  class="btn btn-success mt-3 btn-medium">Load wallet</router-link>
                </div>

              </div>
            </div>
          </div>
        </div>
        <div class="col-2">
          
        </div>
      </div>
    </div>
  </div>

</template>