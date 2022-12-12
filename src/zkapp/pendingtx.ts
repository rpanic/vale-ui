import {StorageService} from "@/zkapp/storage-service";
import {GraphQlService} from "@/zkapp/graphql";

export interface TxDict {
    [index: string]: string[];
}

export interface RichPendingTx {hash: string, type: string, wallet: string}

export class PendingTxService {

    pending: TxDict = {}
    storage = new StorageService()

    retrievedTypes = {}

    listeners: ((string, boolean) => void)[] = [];
    ready: Promise<boolean>
    res: (boolean) => void = () => {}

    constructor() {

        this.ready = new Promise<boolean>((res) => {
            this.res = res
        })

    }

    async init(graphql: GraphQlService){

        this.pending = this.storage.getPendingTxs()
        await this.checkTxsStillPending(graphql, true)

        this.res(true)

        setInterval(() => {
            this.checkTxsStillPending(graphql, false)
            console.log("Tx Pending check complete")
        }, 10000)
    }

    async checkTxsStillPending(graphql: GraphQlService, first: boolean = false) : Promise<void>{

        let pending = this.pending

        for(let key in pending){

            let txs: string[] = []
            for(let txhash of pending[key]){

                let res = await graphql.getPendingTransaction(txhash)
                if(res.pending) {
                    this.retrievedTypes[txhash] = res.type
                    txs.push(txhash)
                    if(first){
                        this.listeners.forEach(l => l(txhash, true))
                    }
                }else{
                    this.listeners.forEach(l => l(txhash, false))
                }
            }
            pending[key] = txs
        }

        this.storage.savePendingTxs(pending)

    }

    addPendingTx(wallet: string, o: string){

        let exists = (this.pending[wallet] ?? []).indexOf(o) > -1

        if(!exists){
            console.log("Adding pending tx " + o)

            this.pending[wallet] = (this.pending[wallet] ?? []).concat([o])
            this.storage.savePendingTxs(this.pending)
            this.listeners.forEach(x => x(o, true))
        }
    }

    getPendingTxs() : TxDict {
        return this.pending
    }

    async getRichTx(graphql: GraphQlService, tx: string) : Promise<RichPendingTx>{
        //Find wallet
        let foundWallet = ""
        for(let wallet in this.pending){
            if(this.pending[wallet]?.findIndex(x => x === tx) > -1){
                foundWallet = wallet
            }
        }
        return {
            hash: tx,
            wallet: foundWallet,
            type: await this.getTxType(tx, graphql)
        }
    }

    async getTxType(tx: string, graphql: GraphQlService) : Promise<string>{
        let type = this.retrievedTypes[tx]

        if(!type){
            //Retrieve type
            let ptx = await graphql.getPendingTransaction(tx)
            type = ptx.type
            this.retrievedTypes[tx] = ptx.type
        }
        return type
    }

    async getAllPendingTxs(graphql: GraphQlService) : Promise<RichPendingTx[]>{
        let arr: RichPendingTx[] = []
        for(let key in this.pending){
            let x = this.pending[key as string]
            let y: RichPendingTx[] = []

            for(let tx of x){
                y.push({
                    hash: tx,
                    type: await this.getTxType(tx, graphql),
                    wallet: key
                })
            }

            arr.push(...y)
        }
        return arr
    }

    resolveTx(wallet: string, tx: string){
        let index = (this.pending[wallet] ?? []).indexOf(tx)
        if(index > -1){
            this.pending[wallet].splice(index, 1)
            this.storage.savePendingTxs(this.pending)
            this.listeners.forEach(x => x(tx, false))
        }
    }

    onChange(f: (string, boolean) => void) : number{
        return this.listeners.push(f) - 1
    }

}