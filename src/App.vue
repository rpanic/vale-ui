<script lang="ts">
import { isReady, Mina, setGraphqlEndpoint } from 'snarkyjs';
import { defineComponent, inject, provide } from 'vue';
import { RouterLink, RouterView } from 'vue-router'
import { ApiService } from './zkapp/api-service';
import { GraphQlService } from './zkapp/graphql';
import { concatStringMiddle } from './zkapp/utils';
import { AuroWalletProvider, type WalletProvider } from './zkapp/walletprovider';
import { ZkAppService } from './zkapp/zkapp-service';

export default defineComponent({

  props: {
  },

  data() {
    return {
      snarkyjsReady: false,
      wallet: undefined as WalletProvider | undefined,
      address: undefined as string | undefined,
      concatStringMiddle: concatStringMiddle
    }
  },

  provide(){
    //Dependencies
    let service = new ZkAppService();
    service.init()

    let graphql = new GraphQlService()

    console.log("1")
    let wallet = new AuroWalletProvider() as WalletProvider;
    this.wallet = wallet

    let api = new ApiService();

    return {
      service,
      graphql,
      wallet,
      api
    }
  },

  methods:{
    connectAuro(){
      this.connectWallet()
    },
    connectWallet(){
      this.wallet!.accounts().then(accounts => {
        if(accounts.length > 0){
          let account1 = accounts[0]
          this.address = account1.toBase58()
        }
      })
    }
  },

  mounted() {

    isReady.then(() => {

      console.log("SnarkyJS loaded and connected!")
      this.snarkyjsReady = true

      this.connectWallet()

      this.wallet!.onAccountsChanged((acc) => {
        this.address = acc
        if(!acc){
          this.connectWallet()
        }
      })

    });

    // let offset = 0
    // setInterval(function(){
    //   eval("$('.fa-spinner').css('transform', 'rotate(" + offset + "deg)')")
    //   offset += 5
    //   if(offset > 365){
    //     offset -= 365
    //   }
    // }, 10, 0)

  }

})

</script>

<template>
  <div class="box">
    <div class="rowf header">

      <nav class="navbar navbar-expand-lg navbar-light bg-white border-bottom" style="font-weight: 600; box-shadow: rgb(40 54 61 / 18%) 0px 2px 4px 0px; z-index: 1">
        <div class="container">
          <img alt="Vue logo" class="logo me-2" src="@/assets/logo.svg" height="25"/>
          <router-link class="navbar-brand" to="/">Vanir</router-link>
          <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarsExample07" aria-controls="navbarsExample07" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
          </button>


          <div class="collapse navbar-collapse" style="flex-direction: row-reverse;" id="navbarsExample07">
            <ul class="navbar-nav mr-auto">
                <div class="me-3" v-if="!snarkyjsReady">
                  <!-- <font-awesome-icon icon="fa-solid fa-spinner" class="align-self-center text-primary" />  -->
                    <div class="loading"></div>
                  Loading Snarkyjs
                </div>
                <div class="me-3" v-if="snarkyjsReady && !address" @click="connectAuro()">
                  <button class="btn btn-auro">Connect AuroWallet</button>
                </div>
                <div class="me-3" v-if="snarkyjsReady && address">
                  <font-awesome-icon icon="fa-solid fa-check" class="align-self-center text-success" /> 
                  Connected
                </div>

                <!-- <div style="border-right: 2px solid rgb(232, 231, 230); margin: -15px 0;"></div> -->

                <div class="me-3 text-muted" v-if="address">
                  {{ concatStringMiddle(address, 20) }}
                </div>

                <div style="border-right: 2px solid rgb(232, 231, 230); margin: -15px 0;"></div>

                <span class="badge-new badge-info ms-3 my-auto">Berkeley Testnet</span>
                <!-- <font-awesome-icon icon="fa-solid fa-chevron-down" class="align-self-center ms-2" />  -->
                
            </ul>

          </div>

        </div>
      </nav>
    </div>
  
    <div class="rowf content bg-grayed">
      <router-view />
    </div>
    <div class="rowf footer justify-content-center">
      <div class="flex-grow-0" style="width: fit-content;">
        Footer
      </div>
    </div>

  </div>
</template>

<style>
  
.loading {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(33, 37, 41,.3); /*#212529*/
  border-radius: 50%;
  border-top-color: var(--bs-body-color);;
  animation: spin 1s ease-in-out infinite;
  -webkit-animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { -webkit-transform: rotate(360deg); }
}
@-webkit-keyframes spin {
  to { -webkit-transform: rotate(360deg); }
}

.btn-auro {
  font-weight: 600;
  color: #fff;
  background: linear-gradient(70deg,rgba(215,123,209,1) 25%,rgba(138,87,222,1) 55%);
  background-position-x: -3px;
  background-size: 150%;
  animation: auro-trans-out 0.2s ease-in-out;
}

@keyframes auro-trans {
  from {
    background-position-x: -3px;
  }
  to {
    background-position-x: -40px;
  }
}
@keyframes auro-trans-out {
  from {
    background-position-x: -40px;
  }
  to {
    background-position-x: -3px;
  }
}

.btn-auro:hover {
  color: #fff;
  animation: auro-trans 0.2s ease-in-out;
  background-position-x: -40px;
}

</style>