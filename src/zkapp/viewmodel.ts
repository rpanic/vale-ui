import {DeployedWallet, StorageService} from "@/zkapp/storage-service";
import {Bool, Field, isReady, MerkleMap, Mina, PublicKey, UInt64} from "snarkyjs";
import {inject} from "vue";
import {ZkAppService} from "@/zkapp/zkapp-service";
import {ProposalDto} from "@/zkapp/api-service";
import {Proposal, ProposalState, SignerState, VotedEvent} from "vale-core/build/src/multisigv2";
import * as blockies from "blockies-ts";
import {BigIntWrapper} from "@/components/ProposalForm.vue";
import {GraphQlService} from "@/zkapp/graphql";

export class ViewModel {

    storageService = new StorageService()
    service: ZkAppService
    graphql: GraphQlService

    constructor(service: ZkAppService, graphql: GraphQlService) {
        this.service = service;
        this.graphql = graphql
    }

    wallets: DeployedWalletImpl[] = []
    selectedWallet: DeployedWalletImpl | undefined = undefined

    async getWallets() : Promise<DeployedWalletImpl[]>{

        await isReady
        if(this.wallets.length == 0) {

            let wallets = this.storageService.getWallets()

            this.wallets = await this.getImplFromDeployedWallet(wallets)

        }

        console.log(this.wallets)
        return this.wallets
    }

    delete(wallet: DeployedWalletImpl) {

        let index = this.wallets.indexOf(wallet)
        this.wallets.splice(index, 1)
        this.selectedWallet = this.wallets[Math.min(this.wallets.length - 1, index)]

        this.save()

    }

    save() {
        this.storageService.saveWallets(this.wallets.map(x => x.toDeployedWallet()))
    }

    async getImplFromDeployedWallet(wallets: DeployedWallet[]) : Promise<DeployedWalletImpl[]>{

        let blockchainData = await Promise.all(
            wallets.map(w => this.service.getWalletData(w.address, w.deploymentTx))
        )

        let events = await Promise.all(
            wallets.map(w => this.graphql.getMinedTransactions(w.address))
        )

        let impls = wallets.map((w, i) => {

            let signed: { signer: string, vote: boolean }[] = []

            let proposal: Proposal | undefined = undefined
            let votes = [0, 0] as [number, number]

            events[i].forEach(e => {
                if(e.fields[0] === "1"){

                    let event = VotedEvent.fromFields(e.fields.slice(1).map(x => Field(x)))

                    votes[event.vote.toBoolean() ? 0 : 1]++
                    if(votes[0] >= w.k || votes[1] > w.signers.length - w.k){ //Proposal passed
                        signed = []
                        proposal = undefined
                        votes = [0, 0]
                    }else{
                        if(proposal === undefined){
                            proposal = new Proposal(event.proposal)
                        }
                        signed.push({
                            signer: event.signer.toBase58(),
                            vote: event.vote.toBoolean()
                        })
                    }

                }
            })

            w.alreadySigned = signed
            let pexists = proposal !== undefined
            if(pexists){
                w.proposal = {
                    amount: proposal!.amount.toString(),
                    receiver: proposal!.receiver.toBase58(),
                    index: 0
                }
            }else{
                w.proposal = undefined
            }

            let b = blockchainData[i] ?? {
                balance: 0n,
                network: "Berkeley",
                live: false,
                deploymentPending: false,
            }
            let x = {
                ...w,
                ...b,
                votes: votes
            }
            return new DeployedWalletImpl(x, this)

        })
        return impls

    }

    updated(){
        this.storageService.saveWallets(this.wallets)
    }

    setSelectedWallet(index: number) {
        this.selectedWallet = this.wallets[index]
    }

}

type MutableProxy<T> = T & { setTarget: (t: T) => void }

function mutableProxy<T>(t: T){

    let f = mutableProxyFactory(t ?? {})
    let o = f.proxy as T
    o["setTarget"] = (t: T) => f.setTarget(t ?? {})
    console.log(o)
    console.log(f)
    return o as MutableProxy<T>

}

const mutableProxyFactory = (mutableTarget, mutableHandler = Reflect) => ({
    setTarget(target) {
        new Proxy(target, {});  // test target validity
        mutableTarget = target;
    },
    setHandler(handler) {
        new Proxy({}, handler);  // test handler validity
        Object.keys(handler).forEach(key => {
            const value = handler[key];
            if (Reflect[key] && typeof value !== 'function') {
                throw new Error(`Trap "${key}: ${value}" is not a function`);
            }
        });
        mutableHandler = handler;
    },
    getTarget() {
        return mutableTarget;
    },
    getHandler() {
        return mutableHandler;
    },
    proxy: new Proxy(
        mutableTarget,
        new Proxy({}, {
            // Dynamically forward all the traps to the associated methods on the mutable handler
            get(target, property) {
                return (_target, ...args) => mutableHandler[property].apply(mutableHandler, [mutableTarget, ...args]);
            }
        }),
    )
});

export interface DeployedWalletData extends DeployedWallet{

    network: string
    balance: bigint,
    live: boolean,
    deploymentPending: boolean
    votes: [number, number]

}

// export class MutableProxy<>

export class DeployedWalletImplBase implements DeployedWalletData{

    address: string;
    alreadySigned: { signer: string, vote: boolean}[];
    balance: bigint;
    deploymentPending: boolean;
    deploymentTx: string;
    k: number;
    live: boolean;
    name: string;
    proofBySignature: boolean;
    network: string;
    pks: (string | null)[];
    proposal: ProposalDto | undefined;
    signers: string[];
    votes: [number, number];
    contractPk: string;
    accountNew: boolean

    constructor(data: DeployedWalletData) {
        this.address = data.address;
        this.alreadySigned = data.alreadySigned;
        this.balance = data.balance;
        this.deploymentPending = data.deploymentPending;
        this.deploymentTx = data.deploymentTx;
        this.k = data.k;
        this.live = data.live;
        this.name = data.name;
        this.network = data.network;
        this.pks = data.pks;
        this.proposal = data.proposal;
        this.signers = data.signers;
        this.votes = data.votes;
        this.contractPk = data.contractPk
        this.accountNew = data.accountNew
        this.proofBySignature = data.proofBySignature;
    }

    blockie() : string{
        return blockies.create({seed: this.address, scale: 8}).toDataURL();
    }
}

export class DeployedWalletImpl extends DeployedWalletImplBase{

    saving_alreadySigned: { signer: string, vote: boolean}[];
    saving_accountNew: boolean

    model: ViewModel

    constructor(data: DeployedWalletData, viewModel: ViewModel) {
        super(data);

        this.model = viewModel
        this.saving_alreadySigned = data.alreadySigned
        this.saving_accountNew = data.accountNew
    }

    getSignerStates() : SignerState[]{
        return this.signers.map(x => {
            let voted = this.alreadySigned.find(y => y.signer === x) != undefined
            return new SignerState({
                voted: Bool(voted),
                pubkey: PublicKey.fromBase58(x)
            })
        });
    }

    getSignerMerkleMap() : MerkleMap {

        let map = new MerkleMap()

        this.getSignerStates().forEach(s => map.set(s.pubkey.x, s.hash()))

        return map

    }

    getProposal(): Proposal | undefined {
        return this.proposal ? new Proposal({ amount: UInt64.from(this.proposal.amount), receiver: PublicKey.fromBase58(this.proposal.receiver) }) : undefined
    }

    getProposalState(): ProposalState | undefined {
        let proposal = this.getProposal()

        if(proposal === undefined){
            return undefined
        }

        let signerMap = this.getSignerMerkleMap()

        console.log(JSON.stringify(proposal))

        return new ProposalState({
            proposal: proposal,
            votes: this.votes.map(x => Field(x)),
            signerStateRoot: signerMap.getRoot(),
            index: Field(this.proposal!.index),
            accountCreationFeePaid: Bool(this.accountNew)
        })
    }

    getStateMerkleMap() : MerkleMap{

        let map = new MerkleMap()

        let proposalState = this.getProposalState()
        if(proposalState){
            map.set(proposalState.index, proposalState.hash())
        }

        return map

    }

    save() {
        this.model.save()
    }

    getSignatureData(vote: Bool) : Field[]{
        return [this.getProposalState()!.hash(), vote.toField()]
    }

    simulateApproval(signer: PublicKey, vote: boolean, newAccount: boolean, save: boolean = false){

        if(!save){
            this.alreadySigned.push({signer: signer.toBase58(), vote: vote})
            this.votes[vote ? 0 : 1] = this.votes[vote ? 0 : 1] + 1
            this.accountNew = this.accountNew || newAccount
        }else{
            this.saving_alreadySigned.push({signer: signer.toBase58(), vote: vote})
            this.saving_accountNew = this.accountNew || newAccount
        }

    }

    balanceWrapper() : BigIntWrapper{
        return {
            v: this.balance
        }
    }

    toDeployedWallet() : DeployedWallet{
        return {
            address: this.address,
            k: this.k,
            name: this.name,
            proposal: this.proposal,
            deploymentTx: this.deploymentTx,
            pks: this.pks,
            alreadySigned: this.saving_alreadySigned,
            signers: this.signers,
            accountNew: this.saving_accountNew,
            contractPk: this.contractPk,
            proofBySignature: this.proofBySignature
        }
    }

}