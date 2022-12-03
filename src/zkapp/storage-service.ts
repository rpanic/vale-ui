import { PrivateKey } from "snarkyjs"

export interface DeployedWallet {
    name: String,
    signers: string[],
    k: number,
    address: string,
    pks: string[],
    deploymentTx: string
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
}