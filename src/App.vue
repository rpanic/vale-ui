<script lang="ts">
import { isReady } from 'snarkyjs';
import { defineComponent } from 'vue';
import { ApiService } from './zkapp/api-service';
import { GraphQlService } from './zkapp/graphql';
import { concatStringMiddle } from './zkapp/utils';
import { AuroWalletProvider, WalletProvider } from './zkapp/walletprovider';
import { ZkAppService } from './zkapp/zkapp-service';
import {ViewModel} from "@/zkapp/viewmodel";
import {Popover, Toast} from "bootstrap";
import {PendingTxService} from "@/zkapp/pendingtx";

export default defineComponent({

  props: {
  },

  data() {
    return {
      snarkyjsReady: false,
      wallet: undefined as WalletProvider | undefined,
      address: undefined as string | undefined,
      concatStringMiddle: concatStringMiddle,
      route: "/"
    }
  },

    provide(){

        //Dependencies

        let pendingtxservice = new PendingTxService()

        let graphql = new GraphQlService(pendingtxservice)

        let service = new ZkAppService(graphql);
        service.init()

        pendingtxservice.init(graphql).then(() => {})

        console.log("1")
        let wallet = new AuroWalletProvider() as WalletProvider;
        this.wallet = wallet

        let api = new ApiService();

        let view = new ViewModel(service, graphql)

        return {
              service,
              graphql,
              wallet,
              api,
              view,
              pendingtxservice
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
  watch: {
    $route (to, from){
      this.route = to.fullPath
    }
  },
  mounted() {

      this.route = this.$route.fullPath

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

  const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]')
  const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new Popover(popoverTriggerEl, {
      placement: "top",
      // template: '<div class="popover" role="popover"><div class="popover-arrow"></div><div class="popover-inner"></div></div>'
  }))

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
        <div class="container" style="max-width: 95%">
<!--          <img alt="Vue logo" class="logo me-2" src="@/assets/logo.svg" height="25"/>-->
          <router-link class="navbar-brand" to="/">Vale Multisig</router-link>
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

    <div class="rowf content" :class="{'bg-grayed-image': route === '/', 'bg-grayed-image-2': route !== '/'}"> <!-- bg-grayed -->
      <router-view />
    </div>

<!--    <div class="rowf footer justify-content-center" style="font-weight: 600; box-shadow: rgb(40 54 61 / 18%) 0px -2px 4px 0px;">-->
<!--      <div class="d-flex justify-content-center" style="border-top: var(&#45;&#45;bs-card-border-width) solid rgb(0 14 28 / 15%)">-->
<!--          <div class="align-self-center pt-1 mb-1">-->
<!--              Made by <a href="https://github.com/rpanic" class="ms-2">rpanic</a>-->
<!--          </div>-->
<!--      </div>-->
<!--    </div>-->

      <div class="position-fixed bottom-0 start-50 translate-middle-x mb-2" :class="{'start-sidebar': route === '/wallets'}" style="background-color: rgba(0, 0, 0, 0%)">
          <a class="text-light h3" href="https://github.com/rpanic/vale-ui" target="_blank" tabindex="0" data-bs-toggle="popover" data-bs-trigger="hover focus" data-bs-content="UI Repository">
              <font-awesome-icon icon="fa-brands fa-github"></font-awesome-icon>
          </a>
          <a class="text-light h3 ms-3" href="https://github.com/rpanic/vale-contracts" target="_blank" tabindex="0" data-bs-toggle="popover" data-bs-trigger="hover focus" data-bs-content="Contract Repository">
              <font-awesome-icon icon="fa-brands fa-github"></font-awesome-icon>
          </a>
      </div>


  </div>
</template>

<style>

.popover-body{
    padding: 0.5rem !important;
}

.start-sidebar {
    left: 62.5% !important;
}

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

@keyframes flipped {
  from { transform: rotate(0deg); }
  to { transform: rotate(180deg); }
}
@-webkit-keyframes flipped {
  from { -webkit-transform: rotate(0deg); }
  to { -webkit-transform: rotate(180deg); }
}

@keyframes flipped-out {
  to { transform: rotate(0deg); }
  from { transform: rotate(180deg); }
}
@-webkit-keyframes flipped-out {
  to { -webkit-transform: rotate(0deg); }
  from { -webkit-transform: rotate(180deg); }
}


.unflipped {
  animation: flipped-out 0.4s ease;
  transform: rotate(0deg);
  -webkit-transform: rotate(0deg);
}

.flipped {
  animation: flipped 0.4s ease;
  transform: rotate(180deg);
  -webkit-transform: rotate(180deg);
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
  animation: auro-trans 0.8s ease-in-out;
  background-position-x: -40px;
}

.bg-grayed-image{
    /*background-image: url("src/assets/layered-waves-haikei.svg");*/
    background-image: url("./assets/wave-haikei-2.svg");
    background-size: cover;
    background-position-y: bottom;
}
.bg-grayed-image-2{
    /*background-image: url("src/assets/layered-waves-haikei.svg");*/
    background-image: url("./assets/wave-haikei-3.svg") !important;
    background-size: cover;
    background-position-y: bottom;
}

</style>