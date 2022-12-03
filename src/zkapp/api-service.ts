import { PrivateKey, PublicKey, Signature, UInt64 } from "snarkyjs"
import axios from 'axios'
import type { DeployedWallet } from "./storage-service"

export interface ProposalDto {
    receiver : PublicKey
    amount : UInt64
}

export interface JsonProof {
    publicInput: string[];
    maxProofsVerified: 0 | 1 | 2;
    proof: string;
}

export interface SignatureProof {
    address: PublicKey,
    proof: JsonProof,
    vote: boolean
}

export interface APIWalletState {
    proposal: ProposalDto,
    signatures: SignatureProof[],
    votes: [number, number],
    wallet: {
        signers: string[],
        k: number
    }
}

export interface DeployedWalletState {
    wallet: DeployedWallet,
    state: APIWalletState | undefined
}

export interface ApiSchema {
    address: string,
    wallet: {
        signers: string[],
        k: number
    }
    votes: { signer: string, vote: boolean, proof: JsonProof }[],
    proposal: any,
    signature: {
        signature: string,
        publickey: string
    }
}

export class ApiService {

    url = "http://localhost:3000/"

    async constructWalletWithState(wallet: DeployedWallet) : Promise<DeployedWalletState> {

        let state = await this.getProposalState(wallet)

        return {
            wallet,
            state
        }

    }

    async getProposalState(deployedWallet: DeployedWallet) : Promise<APIWalletState | undefined>{

        let wallet = deployedWallet.address
        let res = await axios.get<ApiSchema>(this.url + wallet)

        console.log(wallet)
        console.log(res.data)

        let data = res.data

        if(data === undefined || data.wallet === undefined){
            return undefined
        }

        let proposalDto = data.proposal
        let proposal = {
            amount: UInt64.fromString(proposalDto["amount"]),
            receiver: PublicKey.fromBase58(proposalDto["receiver"])
        } as ProposalDto

        let signatures = [] as SignatureProof[]
        let votes = [0, 0]

        res.data.votes.forEach(x => {

            //Filter out signatures from non-signer wallets
            if(deployedWallet.signers.includes(x.signer)){

                console.log(x)
                let signatureProof = {
                    address: PublicKey.fromBase58(x.signer),
                    proof: x.proof,
                    vote: x.vote
                }
                signatures.push(signatureProof)
                let index = signatureProof.vote === true ? 0 : 1
                votes[index] = votes[index] + 1
            }
        })

        return {
            proposal,
            signatures,
            votes,
            wallet: data.wallet
        } as APIWalletState

    }

    generateApiSignature(proposal: ProposalDto, pk: PrivateKey) : Signature {
        return Signature.create(pk, [...proposal.receiver.toFields(), ...proposal.amount.toFields()])
    }

    async pushSignature(wallet: DeployedWallet, proposal: ProposalDto, proof: SignatureProof, signature: Signature) : Promise<boolean> {

        return (await axios.post(this.url + wallet.address, {
            wallet: {
                signers: wallet.signers,
                k: wallet.k
            },
            votes: [
                {
                    signer: proof.address.toBase58(),
                    vote: proof.vote,
                    proof: proof.proof
                }
            ],
            proposal: this.getApiProposal(proposal),
            signature: {
                publickey: proof.address,
                signature: signature.toJSON()
            }
        })).status < 300

    }

    private getApiProposal(proposal: ProposalDto) : {amount: string, receiver: string} {
        return {
            amount: proposal.amount.toString(),
            receiver: proposal.receiver.toBase58()
        }
    }

    coingecko_url = "https://api.coingecko.com/api/v3/simple/price?ids=mina-protocol&vs_currencies=usd"

    minaPrice = 0.0

    async getMinaPriceUsd() : Promise<number>{

        if(this.minaPrice > 0.0){
            return this.minaPrice
        }

        let ret = await axios.get(this.coingecko_url)
        let price = ret.data["mina-protocol"]["usd"]
        this.minaPrice = price
        return price

    }

}