import axios, {AxiosResponse} from "axios";
import { Config } from "./config";
import {DeployedWalletImpl} from "@/zkapp/viewmodel";
import {Transaction} from "@/components/TxListComponent.vue";
import {StorageService} from "@/zkapp/storage-service";

type GetEventResponse = {
    txid: string,
    auid: number,
    fields: string[]
}[]

type GetBlockResponse = {
    command_hash: string,
    balancechange: number,
    height: number,
    block_hash: string,
    fee: string,
    type: string
}[]

export interface WalletTransaction{
    command_hash: string,
    balancechange: number,
    height: number,
    block_hash: string,
    fee: string,
    type: string,
    fields: string[]
}

type GetCanonicalBlockResponse = {
    state_hash: string
}[]

export class GraphQlService {

    url = Config.GRAPHQL_URL

    resturl = "http://eu2.rpanic.com:3055/rpc"

    // async getBlockHashByNumber(n: number) : Promise<string> {

    //     const operationsDoc = `
    //         query MyQuery {
    //             block(height: ` + n + `) {
    //             stateHash
    //             }
    //         }`;

    //     let res = await axios.post(this.url, {
    //         query: operationsDoc
    //     })
    //     console.log(res.data)

    //     return ""

    // }

    async getMinedTransactions(address: string) : Promise<WalletTransaction[]>{

        let headers = {
            Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYXJjaGl2ZV9yZWFkZXJfcm9sZSJ9.CbjLkuif5Y14PCTX0MPgTx5ob2-V10CcBiXzB6Ruiw4"
        }

        let param = {
            input_pk: address
        }
        try {
            let events = await axios.post<GetEventResponse>(this.resturl + "/getevents", param, {headers: headers}) as AxiosResponse<GetEventResponse>

            let txinfo = await axios.post<GetBlockResponse>(this.resturl + "/getblock", param, {headers}) as AxiosResponse<GetBlockResponse>
            let blocktxs = txinfo.data as GetBlockResponse

            let grouped = {}
            blocktxs.forEach(x => {
                grouped[x.command_hash] = (grouped[x.command_hash] ?? []).concat([x])
            })

            //Filtering out inclusions which got orphaned
            for(let chash in grouped){
                if(grouped[chash].length > 1){

                    let heights = new Set(grouped[chash]!.map(x => x.height) as number[])

                    let heightToCanonical = {}

                    for(let height of heights){
                        let can = await axios.post<GetCanonicalBlockResponse>(this.resturl + "/getcanonicalblock", {height_input: height}, {headers}) as AxiosResponse<GetCanonicalBlockResponse>
                        heightToCanonical[height + ""] = can.data[0].state_hash
                    }

                    let canonicalTx = grouped[chash]
                        .filter(x => x.block_hash === heightToCanonical[x.height + ""])[0]

                    blocktxs = blocktxs.filter(x => x.command_hash === chash ? x.block_hash === canonicalTx.block_hash : true)

                }
            }

            let eventtxs = events.data.map(a => {
                let blocktx = blocktxs.find(b => b.command_hash === a.txid)
                return {...blocktx!, fields: a.fields} as WalletTransaction
            });
            eventtxs.forEach(tx => {

                switch (tx.fields[0]){
                    case "0": //init
                        tx.type = "DEPLOYMENT"
                        break;
                    case "1":
                        if(tx.balancechange > 0){
                            tx.type = "TRANSFER"
                        }else{
                            tx.type = "SIGNATURE"
                        }
                        break;
                }

            })

            let txs = blocktxs.filter(tx => tx.type === "USER_COMMAND") //since they don´t have events
                .map(tx => {
                    return {...tx, fields: []} as WalletTransaction
                })
            txs.push(...eventtxs)

            txs.sort((a, b) => a.height == b.height ? 0 : (a.height > b.height ? 1 : -1))

            return txs

        }catch (e){
            console.log(e)
            return []
        }
    }

    async getTransactions(wallet: DeployedWalletImpl) : Promise<Transaction[]>{

        let arr = [] as Transaction[]

        //Pending txs
        let storage = new StorageService()
        let pendings = storage.getPendingTxs()
        if(pendings[wallet.address] !== undefined && pendings[wallet.address].length > 0) {
            let pendingsP = await Promise.all(
                pendings[wallet.address].map(hash => this.getPendingTransaction(hash)) as Promise<boolean>[]
            )
            pendingsP.filter(x => x === true).map((b, i) => {
                return {
                    type: "PENDING",
                    txid: pendings[wallet.address][i],
                    successful: false,
                    address: wallet.address,
                    value: 0, //TODO
                    block: "",
                    blocknumber: 0
                } as Transaction
            })

            pendings[wallet.address] = pendingsP.filter(x => x === true)
            storage.savePendingTxs(pendings)
        }


        let minedtxs = (await this.getMinedTransactions(wallet.address)).map(tx => {

            let type = tx.type === "USER_COMMAND" ? "DEPOSIT" : tx.type

            return {
                address: wallet.address,
                blocknumber: tx.height,
                block: tx.block_hash,
                txid: tx.command_hash,
                successful: true,
                value: tx.balancechange,
                type: type
            } as Transaction
        })

        arr.push(...minedtxs)

        arr.sort((a, b) => -1 * a.blocknumber == b.blocknumber ? 0 : (a.blocknumber > b.blocknumber ? 1 : -1))

        return arr
    }

    async getPendingTransaction(hash: string) : Promise<boolean> { //whether the transaction is found in the mempool

        let query = `query MyQuery {
            pooledZkappCommands(hashes: "$hash") {
              hash
            }
            pooledUserCommands(hashes: "$hash") {
              hash
            }
          }`.replace("$hash", hash).replace("$hash", hash)

        let res = await axios.post(this.url, {
            query: query
        })

        let data = res.data.data

        console.log(res)
        console.log(res.data)
        let zkAppCommands = data.pooledZkappCommands as any[]
        let userCommands = data.pooledUserCommands as any[]

        return zkAppCommands.length > 0 || userCommands.length > 0

    }

}