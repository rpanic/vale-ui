interface SignMessageArgs {
    message: string
}
  
export interface SignedData {
    publicKey: string,
    payload: string,
    signature: {
        field: string,
        scalar: string
    }
}

interface SendTransactionArgs {
    transaction: any,
    feePayer?: {
      fee?: number,
      memo?: string
    };
  }

export interface AuroMina {
    requestAccounts(): Promise<string[]>
    sendTransaction(args: SendTransactionArgs): Promise<{ hash: string }>;
    signMessage(args: SignMessageArgs): Promise<SignedData>;
    on(a: 'accountsChanged', handler: (accounts: string[]) => void): void;
}