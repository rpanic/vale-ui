<script lang="ts">


</script>

<template>

  <div class="d-flex container align-items-center h-100 ">

    <div class="flex-grow-1">
      <div class="row mb-5">

        <div class="col-2">
        </div>
        <div class="col-8">
          <h2 class="mb-3">Welcome to Vale Multisig</h2>
          <h5>Vale is a platform for creating secure and private multisig wallets.</h5>
            <h5>Here is how to get started:</h5>
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
                  <p class="card-text">Create a new multisig-wallet directly in the browser.</p>
                  <router-link to="/create" class="btn btn-success mt-3 btn-medium">Create new wallet</router-link>
                </div>

              </div>
              <div class="col-6">
                
                <div class="card-body m-3">
                  <h5 class="card-title">View Wallets</h5>
                  <p class="card-text">Visit your created wallets or load existing wallets into this browser.</p>
                  <router-link to="/wallets"  class="btn btn-success mt-3 btn-medium">View wallets</router-link>
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
