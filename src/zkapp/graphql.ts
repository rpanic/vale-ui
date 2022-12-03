import axios from "axios";
import { Config } from "./config";

export class GraphQlService {

    url = Config.GRAPHQL_URL

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

    async getPendingTransaction(hash: string) : Promise<boolean> { //wheater the transaction is found in the mempool

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