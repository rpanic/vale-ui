import {Mina, PrivateKey, setGraphqlEndpoint} from "snarkyjs";
import {Config} from "@/zkapp/config";

export class Networkprovider {

    static local: boolean = false

    static graphqlEndpoint = Config.GRAPHQL_URL;
    // static graphqlEndpoint = 'https://berkeley.peak-pool.com/graphql';

    createNetwork() : { fundedAccount?: string, success: boolean }{

        if(!Networkprovider.local){

            // create Berkeley connection
            setGraphqlEndpoint(Networkprovider.graphqlEndpoint);
            let Berkeley = Mina.Network(Networkprovider.graphqlEndpoint);
            Mina.setActiveInstance(Berkeley);

            return { success: true, fundedAccount: "EKEQFx6aNo9q11f1MTHoMy9LBbfgemsfDrBS8sDeGG6ScmjLRwUw" }

        }else{

            throw Error("TODO")
            //TODO Implement right, so that privatekeys are the same and it is actually the same network

            let mock = Mina.LocalBlockchain()
            Mina.setActiveInstance(mock);

            let pk = mock.testAccounts[0].privateKey

            return { success: true, fundedAccount: pk.toBase58() }
        }


    }

}