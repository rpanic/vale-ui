import {RollupArgs, ValeDeployArgs, WorkerFunctions, ZkappWorkerReponse, ZkappWorkerRequest} from "@/zkapp/worker2";

export class WorkerClient{

    init(){
        return this._call("loadSnarkyJS")
    }

    initProveMethod(proveMethod: { proofWithSignature: boolean, zkAppPk: string }){
        return this._call("initProveMethod", proveMethod)
    }

    compile(){
        return this._call("compile")
    }

    deployContract(args: ValeDeployArgs) : Promise<string> {
        return this._call("deployContract", args) as Promise<string>
    }

    rollup(args: RollupArgs) : Promise<string>{
        return this._call("rollup", args) as Promise<string>
    }

    sign(args: {pk: string, data: string[]}) : Promise<string> {
        return this._call("sign", args) as Promise<string>
    }

    private worker: Worker;

    promises: { [id: number]: { resolve: (res: any) => void, reject: (err: any) => void } };

    nextId: number;

    constructor() {
        this.worker = new Worker(new URL("./worker2.ts", import.meta.url), {type: "module"})
        this.promises = {};
        this.nextId = 0;

        this.worker.onmessage = (event: MessageEvent<ZkappWorkerReponse>) => {
            let promise = this.promises[event.data.id]
            if(event.data.data === "Error"){
                promise.reject(event.data.data)
            }else{
                promise.resolve(event.data.data);
            }
            delete this.promises[event.data.id];
        };
    }

    _call(fn: WorkerFunctions, args: any = {}) {
        return new Promise((resolve, reject) => {
            this.promises[this.nextId] = { resolve, reject }

            const message: ZkappWorkerRequest = {
                id: this.nextId,
                fn,
                args: JSON.stringify(args),
            };

            this.worker.postMessage(message);

            this.nextId++;
        });
    }

}