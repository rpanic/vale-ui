import { PublicKey } from "snarkyjs";
import type { AuroMina } from "./auro";

export interface SignedData {
    publicKey: string,
    payload: string,
    signature: {
        field: string,
        scalar: string
    }
}

export interface WalletProvider {

    isActive() : Promise<boolean>
    enabled() : Promise<boolean>
    accounts() : Promise<PublicKey[]>
    sendTransaction(tx: any) : Promise<string> //Hash
    // network(): Promise<string>
    sendPayment(amount: number, receiver: string): Promise<string>
    signMessage(msg: string) : Promise<SignedData>
    onAccountsChanged(listener: (newAccount: string) => void) : void

}

export class AuroWalletProvider implements WalletProvider {

    listeners: ((a: string) => void)[] = []

    activated = false

    async isActive() : Promise<boolean>{
        return this.activated
    }
    async enabled() : Promise<boolean>{
        return this.mina() !== undefined
    }

    private mina() : AuroMina | undefined {
        let mina = (window as any).mina
        if(mina){
            this.activated = true
            return mina as AuroMina
        }else{
            return undefined
        }
    }

    async accounts(): Promise<PublicKey[]> {

        let accounts: string[] = []
        // data.result is an array that contains approve account's address
        try {
            accounts = await this.mina()!.requestAccounts()
        } catch(error: any) {
            // if user reject, requestAccounts will throw an error with code and message filed
            console.log(error.message, error.code)
        }
        return accounts.map(a => PublicKey.fromBase58(a))
    }

    async sendTransaction(txBody: any): Promise<string> {

        console.log(txBody)
        try{
            const { hash } = await this.mina()!.sendTransaction({
                transaction: txBody,
                feePayer: {
                  fee: 0.01,
                  memo: "Vale Multisig mina.rpanic.com"
                }
            })
            console.log(hash)
            return hash
        } catch (error: any) {
            console.log(error.message, error.code)
            throw error
        }
    }

    async sendPayment(amount: number, receiver: string): Promise<string>{

        console.log("Sending " + amount + " to " + receiver)
        try{
            const { hash } = await this.mina()!.sendLegacyPayment({
                to: receiver,
                amount,
                memo: "Vale Deposit -> mina.rpanic.com",
                fee: 0.01
            })
            console.log(hash)
            return hash
        } catch (error: any) {
            console.log(error.message, error.code)
            throw error
        }
    }

    async signMessage(msg: string): Promise<SignedData> {
        try {

            let signResult = await this.mina()!.signMessage({
              message: msg,
            })
            console.log(signResult)
            return signResult

        } catch(error: any) {
            console.log(error.message, error.code)
            throw error
        }
    }
    
    onAccountsChanged(listener: (newAccount: string) => void) : void {
        if(this.listeners.length === 0){
            this.mina()?.on("accountsChanged", (accounts) => {
                console.log("accountschanged: ", accounts)
                this.listeners.forEach(x => x(accounts[0]))
            })
        }
        this.listeners.push(listener)
    }

}