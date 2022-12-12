import { PrivateKey } from "snarkyjs"
import {ProposalDto} from "@/zkapp/api-service";
import {TxDict} from "@/zkapp/pendingtx";

export interface DeployedWallet {

    name: string,
    signers: string[],
    k: number,
    address: string,
    pks: (string | null)[],
    deploymentTx: string,
    proofBySignature: boolean

    alreadySigned: { signer: string, vote: boolean}[]
    proposal: ProposalDto | undefined

    contractPk: string,
    accountNew: boolean

}

export class StorageService{

    key = "deployed_wallets"

    pushWallet(wallet: DeployedWallet){

        let wallets = this.getWallets()
        wallets.push(wallet)

        localStorage.setItem(this.key, JSON.stringify(wallets))

    }

    getWallets() : DeployedWallet[]{
        let l = localStorage.getItem(this.key)
        if(l === null){
            return []
        }else {
            return JSON.parse(l) as DeployedWallet[]
        }
    }

    saveWallets(wallets: DeployedWallet[]) {
        localStorage.setItem(this.key, JSON.stringify(wallets))
    }

    static tempAccount: PrivateKey | undefined = undefined 

    setTempDeployerAccount(key: PrivateKey) {
        StorageService.tempAccount = key
    }

    getDeployerAccount() : PrivateKey {

        if(StorageService.tempAccount){
            return StorageService.tempAccount
        }

        let s = localStorage.getItem("privatekey")!
        return PrivateKey.fromBase58(s)

    }

    getPendingTxs() : TxDict{

        return JSON.parse(localStorage.getItem("pendingtxs") ?? "{}")

    }

    savePendingTxs(o: TxDict) {

        localStorage.setItem("pendingtxs", JSON.stringify(o))

    }


}